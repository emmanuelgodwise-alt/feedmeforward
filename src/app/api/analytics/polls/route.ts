import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/analytics/polls — Poll analytics with Trust & Reliability scoring for businesses
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';

    // ─── Fetch all polls with vote data ────────────────────────
    const where: Record<string, unknown> = { video: { creatorId: userId } };
    if (status === 'active') where.closesAt = { gte: new Date() };
    else if (status === 'closed') where.closesAt = { lt: new Date() };

    const polls = await db.poll.findMany({
      where,
      include: {
        video: { select: { id: true, title: true, viewCount: true, createdAt: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // ─── Process each poll ─────────────────────────────────────
    const pollAnalytics = [];
    for (const poll of polls) {
      const options = JSON.parse(poll.options as string) as Array<{ id: string; text: string; voteCount: number }>;
      const totalVotes = poll.responseCount;
      const views = poll.video.viewCount || 1;

      // ── Trust Score Calculation ──────────────────────────────
      // Components:
      // 1. Sample Size Score (0-25): based on vote count
      // 2. Voter Quality Score (0-25): verified ratio, avg score
      // 3. Diversity Score (0-25): demographic diversity
      // 4. Velocity Score (0-25): voting momentum
      // Total: 0-100

      const votes = await db.pollVote.findMany({
        where: { pollId: poll.id },
        include: { user: { select: { memberScore: true, isVerified: true, ageRange: true, gender: true, location: true, createdAt: true } } },
      });

      // 1. Sample Size Score
      let sampleScore = Math.min(25, (totalVotes / 100) * 25);

      // 2. Voter Quality Score
      const verifiedVoters = votes.filter((v) => v.user.isVerified).length;
      const verifiedRatio = votes.length > 0 ? verifiedVoters / votes.length : 0;
      const avgScore = votes.length > 0 ? votes.reduce((s, v) => s + (v.user.memberScore || 0), 0) / votes.length : 0;
      const qualityScore = (verifiedRatio * 15) + (Math.min(avgScore, 1000) / 1000) * 10;

      // 3. Diversity Score
      const uniqueLocations = new Set(votes.map((v) => v.user.location || 'unknown')).size;
      const uniqueAgeRanges = new Set(votes.map((v) => v.user.ageRange || 'unknown')).size;
      const uniqueGenders = new Set(votes.map((v) => v.user.gender || 'unknown')).size;
      const diversityScore = Math.min(25, (uniqueLocations * 3) + (uniqueAgeRanges * 5) + (uniqueGenders * 5));

      // 4. Velocity Score
      const pollAgeMs = Date.now() - poll.createdAt.getTime();
      const pollAgeHours = pollAgeMs / (1000 * 60 * 60);
      const votesPerHour = pollAgeHours > 0 ? totalVotes / pollAgeHours : 0;
      const velocityScore = Math.min(25, (votesPerHour / 10) * 25);

      const totalTrustScore = Math.round(sampleScore + qualityScore + diversityScore + velocityScore);

      // Trust grade
      let trustGrade: string;
      let trustColor: string;
      if (totalTrustScore >= 80) { trustGrade = 'A+'; trustColor = 'emerald'; }
      else if (totalTrustScore >= 65) { trustGrade = 'A'; trustColor = 'emerald'; }
      else if (totalTrustScore >= 50) { trustGrade = 'B'; trustColor = 'amber'; }
      else if (totalTrustScore >= 35) { trustGrade = 'C'; trustColor = 'orange'; }
      else { trustGrade = 'D'; trustColor = 'red'; }

      // ── Engagement metrics ───────────────────────────────────
      const engagementRate = ((totalVotes / views) * 100).toFixed(2);
      const leadingOption = [...options].sort((a, b) => b.voteCount - a.voteCount)[0];

      // Statistical confidence (simplified)
      let confidence: string;
      if (totalVotes >= 384) confidence = '95% (±5%)';
      else if (totalVotes >= 96) confidence = '90% (±10%)';
      else if (totalVotes >= 24) confidence = '80% (±20%)';
      else confidence = 'Low (sample too small)';

      // Bias indicators
      const newAccountVoters = votes.filter((v) => Date.now() - v.user.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000).length;
      const newAccountRatio = votes.length > 0 ? newAccountVoters / votes.length : 0;
      const biasIndicators: string[] = [];
      if (newAccountRatio > 0.3) biasIndicators.push('High proportion of new accounts');
      if (verifiedRatio < 0.2 && totalVotes > 10) biasIndicators.push('Low verified user ratio');
      if (uniqueLocations < 2 && totalVotes > 10) biasIndicators.push('Geographically concentrated');
      if (totalVotes < 10) biasIndicators.push('Insufficient sample size');

      // Time-to-first-vote
      const firstVote = votes.length > 0 ? votes.reduce((a, b) => a.createdAt < b.createdAt ? a : b) : null;
      const timeToFirstVote = firstVote
        ? Math.round((firstVote.createdAt.getTime() - poll.createdAt.getTime()) / (1000 * 60))
        : null;

      // Vote distribution evenness (Gini-like)
      const evenness = options.length > 1
        ? 1 - (Math.max(...options.map((o) => o.voteCount)) / (totalVotes || 1))
        : 0;

      // ── Revenue for paid polls ───────────────────────────────
      let revenueData = null;
      if (poll.isPaid) {
        revenueData = {
          totalPool: poll.totalRewardPool,
          spent: Math.min(totalVotes * poll.rewardPerResponse, poll.totalRewardPool),
          remaining: Math.max(0, poll.totalRewardPool - totalVotes * poll.rewardPerResponse),
          costPerResponse: poll.rewardPerResponse,
        };
      }

      pollAnalytics.push({
        id: poll.id,
        question: poll.question,
        videoTitle: poll.video.title,
        videoViews: poll.video.viewCount,
        category: poll.video.category,
        createdAt: poll.createdAt.toISOString(),
        isPaid: poll.isPaid,
        totalVotes,
        options: options.map((o) => ({
          id: o.id,
          text: o.text,
          votes: o.voteCount,
          percentage: totalVotes > 0 ? ((o.voteCount / totalVotes) * 100).toFixed(1) : '0',
        })),
        leadingOption: leadingOption ? { text: leadingOption.text, votes: leadingOption.voteCount, percentage: totalVotes > 0 ? ((leadingOption.voteCount / totalVotes) * 100).toFixed(1) : '0' } : null,
        engagementRate: parseFloat(engagementRate),
        trust: {
          score: totalTrustScore,
          grade: trustGrade,
          color: trustColor,
          components: {
            sample: Math.round(sampleScore),
            quality: Math.round(qualityScore),
            diversity: Math.round(diversityScore),
            velocity: Math.round(velocityScore),
          },
          confidence,
          biasIndicators,
        },
        voters: {
          uniqueCount: votes.length,
          verifiedCount: verifiedVoters,
          verifiedRatio: Math.round(verifiedRatio * 100),
          avgScore: Math.round(avgScore),
          newAccountCount: newAccountVoters,
          uniqueLocations,
          uniqueAgeRanges,
          uniqueGenders,
        },
        velocity: {
          votesPerHour: Math.round(votesPerHour * 10) / 10,
          timeToFirstVote,
        },
        evenness: Math.round(evenness * 100),
        status: poll.closesAt && new Date(poll.closesAt) < new Date() ? 'closed' : 'active',
        closesAt: poll.closesAt?.toISOString() || null,
        revenue: revenueData,
      });
    }

    // ─── Aggregate poll stats ──────────────────────────────────
    const totalPolls = pollAnalytics.length;
    const totalVotes = pollAnalytics.reduce((s, p) => s + p.totalVotes, 0);
    const avgTrustScore = totalPolls > 0 ? Math.round(pollAnalytics.reduce((s, p) => s + p.trust.score, 0) / totalPolls) : 0;
    const avgEngagementRate = totalPolls > 0 ? (pollAnalytics.reduce((s, p) => s + p.engagementRate, 0) / totalPolls).toFixed(1) : '0';
    const highTrustPolls = pollAnalytics.filter((p) => p.trust.score >= 65).length;
    const activePolls = pollAnalytics.filter((p) => p.status === 'active').length;
    const closedPolls = pollAnalytics.filter((p) => p.status === 'closed').length;
    const paidPolls = pollAnalytics.filter((p) => p.isPaid).length;

    // Trust grade distribution
    const trustDistribution = [
      { grade: 'A+', count: pollAnalytics.filter((p) => p.trust.grade === 'A+').length },
      { grade: 'A', count: pollAnalytics.filter((p) => p.trust.grade === 'A').length },
      { grade: 'B', count: pollAnalytics.filter((p) => p.trust.grade === 'B').length },
      { grade: 'C', count: pollAnalytics.filter((p) => p.trust.grade === 'C').length },
      { grade: 'D', count: pollAnalytics.filter((p) => p.trust.grade === 'D').length },
    ].filter((d) => d.count > 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalPolls,
          totalVotes,
          avgTrustScore,
          avgEngagementRate: parseFloat(avgEngagementRate),
          highTrustPolls,
          activePolls,
          closedPolls,
          paidPolls,
        },
        polls: pollAnalytics,
        trustDistribution,
      },
    });
  } catch (error) {
    console.error('GET /api/analytics/polls error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load poll analytics' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/polls/[id]/analytics — Comprehensive poll analytics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: pollId } = await params;

    // Fetch poll with video info
    const poll = await db.poll.findUnique({
      where: { id: pollId },
      include: {
        video: {
          select: { id: true, title: true, viewCount: true, creatorId: true, createdAt: true, status: true },
        },
      },
    });

    if (!poll) {
      return NextResponse.json({ success: false, error: 'Poll not found' }, { status: 404 });
    }

    const options = JSON.parse(poll.options) as Array<{ id: string; text: string; voteCount: number }>;
    const totalVotes = poll.responseCount;

    // Fetch all votes with user data
    const votes = await db.pollVote.findMany({
      where: { pollId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            memberScore: true,
            isVerified: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // ─── Compute vote distribution ──────────────────────────────
    const distribution = options.map((opt) => ({
      id: opt.id,
      text: opt.text,
      votes: opt.voteCount,
      percentage: totalVotes > 0 ? ((opt.voteCount / totalVotes) * 100) : 0,
    }));

    // ─── Compute timeline (grouped by day) ──────────────────────
    const timelineMap = new Map<string, { date: string; count: number; optionBreakdown: Record<string, number> }>();

    for (const vote of votes) {
      const day = vote.createdAt.toISOString().split('T')[0];
      const existing = timelineMap.get(day);
      if (existing) {
        existing.count += 1;
        existing.optionBreakdown[vote.optionId] = (existing.optionBreakdown[vote.optionId] || 0) + 1;
      } else {
        timelineMap.set(day, {
          date: day,
          count: 1,
          optionBreakdown: { [vote.optionId]: 1 },
        });
      }
    }

    const timeline = Array.from(timelineMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => ({
        date: entry.date,
        totalVotes: entry.count,
        options: options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          votes: entry.optionBreakdown[opt.id] || 0,
        })),
      }));

    // ─── Compute hourly heatmap (grouped by hour of day) ───────
    const hourlyMap = new Map<number, number>();
    for (const vote of votes) {
      const hour = vote.createdAt.getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    }
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`,
      votes: hourlyMap.get(hour) || 0,
    }));

    // ─── Compute engagement metrics ─────────────────────────────
    const pollAgeMs = Date.now() - poll.createdAt.getTime();
    const pollAgeHours = pollAgeMs / (1000 * 60 * 60);
    const pollAgeDays = pollAgeMs / (1000 * 60 * 60 * 24);
    const views = poll.video.viewCount || 1;
    const engagementRate = totalVotes > 0 ? ((totalVotes / views) * 100) : 0;
    const votesPerHour = pollAgeHours > 0 ? totalVotes / pollAgeHours : 0;
    const votesPerDay = pollAgeDays > 0 ? totalVotes / pollAgeDays : 0;

    // ─── Leading option ─────────────────────────────────────────
    const sortedOptions = [...distribution].sort((a, b) => b.votes - a.votes);
    const leadingOption = sortedOptions[0] || null;
    const trailingOption = sortedOptions[sortedOptions.length - 1] || null;
    const margin = leadingOption && trailingOption
      ? Math.abs(leadingOption.percentage - trailingOption.percentage)
      : 0;

    // ─── Voter demographics ─────────────────────────────────────
    const voterScores = votes.map((v) => v.user.memberScore || 0);
    const avgVoterScore = voterScores.length > 0
      ? voterScores.reduce((a, b) => a + b, 0) / voterScores.length
      : 0;

    const verifiedVoters = votes.filter((v) => v.user.isVerified).length;
    const newVoters = votes.filter((v) => {
      const accountAge = Date.now() - v.user.createdAt.getTime();
      return accountAge < 7 * 24 * 60 * 60 * 1000; // less than 7 days old
    }).length;

    const scoreDistribution = [
      { range: '0-100', count: voterScores.filter((s) => s <= 100).length },
      { range: '101-250', count: voterScores.filter((s) => s > 100 && s <= 250).length },
      { range: '251-500', count: voterScores.filter((s) => s > 250 && s <= 500).length },
      { range: '501-1000', count: voterScores.filter((s) => s > 500 && s <= 1000).length },
      { range: '1000+', count: voterScores.filter((s) => s > 1000).length },
    ];

    // ─── Velocity analysis (votes in last 24h vs previous 24h) ──
    const now = Date.now();
    const last24h = votes.filter((v) => now - v.createdAt.getTime() < 24 * 60 * 60 * 1000).length;
    const prev24h = votes.filter((v) => {
      const age = now - v.createdAt.getTime();
      return age >= 24 * 60 * 60 * 1000 && age < 48 * 60 * 60 * 1000;
    }).length;
    const velocityChange = prev24h > 0 ? ((last24h - prev24h) / prev24h) * 100 : (last24h > 0 ? 100 : 0);

    // ─── Time-to-first-vote ─────────────────────────────────────
    const firstVote = votes[0];
    const timeToFirstVote = firstVote
      ? (firstVote.createdAt.getTime() - poll.createdAt.getTime()) / (1000 * 60) // in minutes
      : null;

    // ─── Closing status ─────────────────────────────────────────
    const closesAt = poll.closesAt ? poll.closesAt.toISOString() : null;
    const isClosed = poll.closesAt ? new Date(poll.closesAt) < new Date() : false;
    const timeRemaining = poll.closesAt
      ? Math.max(0, Math.floor((new Date(poll.closesAt).getTime() - Date.now()) / (1000 * 60 * 60)))
      : null;

    // ─── Generate insights ──────────────────────────────────────
    const insights: string[] = [];

    if (leadingOption && totalVotes > 0) {
      insights.push(`"${leadingOption.text}" is the leading option with ${leadingOption.percentage.toFixed(1)}% of all votes (${leadingOption.votes} votes).`);
    }

    if (margin < 10 && totalVotes > 10) {
      insights.push('The race is very close — the gap between the leading and trailing options is less than 10%. Every vote counts!');
    } else if (margin > 50 && totalVotes > 5) {
      insights.push(`There is a strong consensus: the leading option is ahead by ${margin.toFixed(1)} percentage points.`);
    }

    if (velocityChange > 20) {
      insights.push('Voting activity is accelerating — engagement is trending upward in the last 24 hours.');
    } else if (velocityChange < -20) {
      insights.push('Voting activity is slowing down — engagement has dropped compared to the previous 24 hours.');
    }

    if (engagementRate > 20) {
      insights.push(`Excellent engagement rate of ${engagementRate.toFixed(1)}% — this poll is resonating strongly with viewers.`);
    } else if (engagementRate < 5 && totalVotes > 0) {
      insights.push(`Engagement rate is ${engagementRate.toFixed(1)}%. Consider promoting this poll to increase participation.`);
    }

    if (avgVoterScore > 300) {
      insights.push(`Voters have a high average Member Score (${avgVoterScore.toFixed(0)}), indicating engaged community members.`);
    }

    if (timeToFirstVote !== null && timeToFirstVote < 5) {
      insights.push('Rapid first response — the first vote came in under 5 minutes after publishing.');
    }

    if (verifiedVoters > 0) {
      insights.push(`${verifiedVoters} verified users participated in this poll, adding credibility to the results.`);
    }

    if (isClosed) {
      insights.push('This poll has closed. Final results are in.');
    } else if (timeRemaining !== null && timeRemaining < 24) {
      insights.push(`This poll closes in ${timeRemaining} hours. There is still time to vote!`);
    }

    if (insights.length === 0 && totalVotes === 0) {
      insights.push('This poll has not received any votes yet. Share it with your audience to start gathering responses.');
    }

    return NextResponse.json({
      success: true,
      data: {
        poll: {
          id: poll.id,
          question: poll.question,
          totalVotes,
          isPaid: poll.isPaid,
          closesAt,
          isClosed,
          timeRemaining,
          createdAt: poll.createdAt.toISOString(),
        },
        video: {
          title: poll.video.title,
          viewCount: poll.video.viewCount,
          status: poll.video.status,
        },
        distribution,
        timeline,
        hourlyActivity,
        engagement: {
          totalVotes,
          views,
          engagementRate: engagementRate,
          votesPerHour: votesPerHour,
          votesPerDay: votesPerDay,
          pollAgeDays: Math.floor(pollAgeDays),
        },
        comparison: {
          leadingOption,
          trailingOption,
          margin,
        },
        voters: {
          uniqueVoters: votes.length,
          avgMemberScore: avgVoterScore,
          verifiedCount: verifiedVoters,
          newAccountCount: newVoters,
          scoreDistribution,
        },
        velocity: {
          last24h,
          prev24h,
          changePercent: velocityChange,
        },
        timing: {
          timeToFirstVote,
          firstVoteDate: firstVote?.createdAt.toISOString() || null,
        },
        insights,
      },
    });
  } catch (error) {
    console.error('GET /api/polls/[id]/analytics error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load analytics' }, { status: 500 });
  }
}

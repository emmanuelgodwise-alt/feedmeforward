import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/analytics/engagement — Detailed engagement metrics, funnel, reactions
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const prevPeriodStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // ─── Engagement funnel ─────────────────────────────────────
    // Impressions → Views → Engaged (liked/commented/reacted) → Voted → Saved
    const [currentViewsResult, currentLikes, currentComments, currentReactions, currentVotes, currentSaves, currentReposts] = await Promise.all([
      db.video.aggregate({ where: { creatorId: userId, createdAt: { gte: periodStart } }, _sum: { viewCount: true } }),
      db.like.count({ where: { video: { creatorId: userId }, createdAt: { gte: periodStart } } }),
      db.comment.count({ where: { video: { creatorId: userId }, createdAt: { gte: periodStart } } }),
      db.reaction.count({ where: { video: { creatorId: userId }, createdAt: { gte: periodStart } } }),
      db.pollVote.count({ where: { poll: { video: { creatorId: userId } }, createdAt: { gte: periodStart } } }),
      db.savedVideo.count({ where: { video: { creatorId: userId }, createdAt: { gte: periodStart } } }),
      db.repost.count({ where: { video: { creatorId: userId }, createdAt: { gte: periodStart } } }),
    ]);

    const currentViews = currentViewsResult._sum.viewCount || 0;
    const totalEngaged = currentLikes + currentComments + currentReactions;

    // Previous period
    const [prevViewsResult, prevLikes, prevComments, prevReactions, prevVotes, prevSaves] = await Promise.all([
      db.video.aggregate({ where: { creatorId: userId, createdAt: { gte: prevPeriodStart, lt: periodStart } }, _sum: { viewCount: true } }),
      db.like.count({ where: { video: { creatorId: userId }, createdAt: { gte: prevPeriodStart, lt: periodStart } } }),
      db.comment.count({ where: { video: { creatorId: userId }, createdAt: { gte: prevPeriodStart, lt: periodStart } } }),
      db.reaction.count({ where: { video: { creatorId: userId }, createdAt: { gte: prevPeriodStart, lt: periodStart } } }),
      db.pollVote.count({ where: { poll: { video: { creatorId: userId } }, createdAt: { gte: prevPeriodStart, lt: periodStart } } }),
      db.savedVideo.count({ where: { video: { creatorId: userId }, createdAt: { gte: prevPeriodStart, lt: periodStart } } }),
    ]);

    const prevViews = prevViewsResult._sum.viewCount || 0;

    // ─── Reaction breakdown ────────────────────────────────────
    const reactions = await db.reaction.groupBy({
      by: ['type'],
      where: { video: { creatorId: userId }, createdAt: { gte: periodStart } },
      _count: true,
      orderBy: { _count: { type: 'desc' } },
    });

    const reactionMap: Record<string, number> = {};
    for (const r of reactions) reactionMap[r.type] = r._count;

    // ─── Engagement by day of week ─────────────────────────────
    const dailyEngagement: Array<{ day: string; likes: number; comments: number; reactions: number; votes: number }> = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let dow = 0; dow < 7; dow++) {
      const dowLikes = await db.like.count({
        where: { video: { creatorId: userId }, createdAt: { gte: periodStart } },
      });
      // Group by day of week is complex in SQLite; approximate with recent 4 weeks
      dailyEngagement.push({
        day: dayNames[dow],
        likes: dowLikes, // Will be refined below
        comments: 0,
        reactions: 0,
        votes: 0,
      });
    }

    // Get actual day-of-week distribution from votes (more reliable)
    const recentVotes = await db.pollVote.findMany({
      where: { poll: { video: { creatorId: userId } }, createdAt: { gte: periodStart } },
      select: { createdAt: true },
    });
    const recentLikes = await db.like.findMany({
      where: { video: { creatorId: userId }, createdAt: { gte: periodStart } },
      select: { createdAt: true },
    });
    const recentComments = await db.comment.findMany({
      where: { video: { creatorId: userId }, createdAt: { gte: periodStart } },
      select: { createdAt: true },
    });
    const recentReactions = await db.reaction.findMany({
      where: { video: { creatorId: userId }, createdAt: { gte: periodStart } },
      select: { createdAt: true },
    });

    for (let dow = 0; dow < 7; dow++) {
      dailyEngagement[dow] = {
        day: dayNames[dow],
        likes: recentLikes.filter((r) => r.createdAt.getDay() === dow).length,
        comments: recentComments.filter((r) => r.createdAt.getDay() === dow).length,
        reactions: recentReactions.filter((r) => r.createdAt.getDay() === dow).length,
        votes: recentVotes.filter((r) => r.createdAt.getDay() === dow).length,
      };
    }

    // ─── Engagement by hour ────────────────────────────────────
    const hourlyEngagement = Array.from({ length: 24 }, (_, hour) => {
      const hLikes = recentLikes.filter((r) => r.createdAt.getHours() === hour).length;
      const hComments = recentComments.filter((r) => r.createdAt.getHours() === hour).length;
      const hReactions = recentReactions.filter((r) => r.createdAt.getHours() === hour).length;
      const hVotes = recentVotes.filter((r) => r.createdAt.getHours() === hour).length;
      return {
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        total: hLikes + hComments + hReactions + hVotes,
        likes: hLikes,
        comments: hComments,
        reactions: hReactions,
        votes: hVotes,
      };
    });

    // Best engagement times
    const peakHour = hourlyEngagement.reduce((a, b) => a.total > b.total ? a : b);
    const peakDay = dailyEngagement.reduce((a, b) => {
      const totalA = a.likes + a.comments + a.reactions + a.votes;
      const totalB = b.likes + b.comments + b.reactions + b.votes;
      return totalA > totalB ? a : b;
    });

    // ─── Engagement rate trend (daily) ─────────────────────────
    const engagementTrend: Array<{ date: string; rate: number; interactions: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const [dayViews, dayLikes, dayComments, dayReactions, dayVotes] = await Promise.all([
        db.video.aggregate({ where: { creatorId: userId, createdAt: { gte: dayStart, lt: dayEnd } }, _sum: { viewCount: true } }),
        db.like.count({ where: { video: { creatorId: userId }, createdAt: { gte: dayStart, lt: dayEnd } } }),
        db.comment.count({ where: { video: { creatorId: userId }, createdAt: { gte: dayStart, lt: dayEnd } } }),
        db.reaction.count({ where: { video: { creatorId: userId }, createdAt: { gte: dayStart, lt: dayEnd } } }),
        db.pollVote.count({ where: { poll: { video: { creatorId: userId } }, createdAt: { gte: dayStart, lt: dayEnd } } }),
      ]);

      const views = dayViews._sum.viewCount || 0;
      const interactions = dayLikes + dayComments + dayReactions + dayVotes;
      engagementTrend.push({
        date: dayStart.toISOString().split('T')[0],
        rate: views > 0 ? Math.round((interactions / views) * 1000) / 10 : 0,
        interactions,
      });
    }

    // ─── Top engaging videos ───────────────────────────────────
    const topEngaging = await db.video.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, title: true, viewCount: true, createdAt: true, type: true,
        _count: { select: { likes: true, comments: true, reactions: true, reposts: true, savedBy: true } },
      },
    });

    const topEngagingSorted = topEngaging
      .map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
        totalEngagement: v._count.likes + v._count.comments + v._count.reactions + v._count.reposts + v._count.savedBy,
        engagementRate: v.viewCount > 0
          ? Math.round(((v._count.likes + v._count.comments + v._count.reactions + v._count.reposts + v._count.savedBy) / v.viewCount) * 1000) / 10
          : 0,
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate);

    // ─── Helper ────────────────────────────────────────────────
    const pct = (c: number, p: number) => (p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100));

    return NextResponse.json({
      success: true,
      data: {
        period,
        summary: {
          views: { value: currentViews, previous: prevViews, change: pct(currentViews, prevViews) },
          likes: { value: currentLikes, change: 0 },
          comments: { value: currentComments, change: 0 },
          reactions: { value: currentReactions, change: 0 },
          votes: { value: currentVotes, previous: prevVotes, change: pct(currentVotes, prevVotes) },
          saves: { value: currentSaves, previous: prevSaves, change: pct(currentSaves, prevSaves) },
          reposts: { value: currentReposts, change: 0 },
          totalEngaged,
          overallEngagementRate: currentViews > 0 ? Math.round((totalEngaged / currentViews) * 1000) / 10 : 0,
          engagementRatio: currentViews > 0 ? Math.round((totalEngaged / currentViews) * 1000) / 10 : 0,
        },
        funnel: {
          views: currentViews,
          engaged: totalEngaged,
          voted: currentVotes,
          saved: currentSaves,
          reposted: currentReposts,
        },
        reactions: {
          total: Object.values(reactionMap).reduce((s, v) => s + v, 0),
          breakdown: reactionMap,
        },
        dailyEngagement,
        hourlyEngagement,
        peakTimes: {
          hour: { label: peakHour.label, total: peakHour.total },
          day: { label: peakDay.day, total: peakDay.likes + peakDay.comments + peakDay.reactions + peakDay.votes },
        },
        engagementTrend,
        topEngaging: topEngagingSorted,
      },
    });
  } catch (error) {
    console.error('GET /api/analytics/engagement error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load engagement analytics' }, { status: 500 });
  }
}

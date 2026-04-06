import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/analytics/overview — Executive KPI dashboard (YouTube Studio / Facebook Insights rival)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';

    const now = new Date();
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevPeriodStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // ─── Current period metrics ────────────────────────────────
    const [currentViews, currentLikes, currentComments, currentResponses, currentReposts, currentFollowers] = await Promise.all([
      db.video.aggregate({ where: { creatorId: userId, createdAt: { gte: periodStart } }, _sum: { viewCount: true } }),
      db.like.count({ where: { video: { creatorId: userId }, createdAt: { gte: periodStart } } }),
      db.comment.count({ where: { video: { creatorId: userId }, createdAt: { gte: periodStart } } }),
      db.video.count({ where: { creatorId: userId, type: 'response', createdAt: { gte: periodStart } } }),
      db.repost.count({ where: { video: { creatorId: userId }, createdAt: { gte: periodStart } } }),
      db.follow.count({ where: { followingId: userId, createdAt: { gte: periodStart } } }),
    ]);

    // ─── Previous period metrics (for comparison) ──────────────
    const [prevViews, prevLikes, prevComments, prevResponses, prevFollowers] = await Promise.all([
      db.video.aggregate({ where: { creatorId: userId, createdAt: { gte: prevPeriodStart, lt: periodStart } }, _sum: { viewCount: true } }),
      db.like.count({ where: { video: { creatorId: userId }, createdAt: { gte: prevPeriodStart, lt: periodStart } } }),
      db.comment.count({ where: { video: { creatorId: userId }, createdAt: { gte: prevPeriodStart, lt: periodStart } } }),
      db.video.count({ where: { creatorId: userId, type: 'response', createdAt: { gte: prevPeriodStart, lt: periodStart } } }),
      db.follow.count({ where: { followingId: userId, createdAt: { gte: prevPeriodStart, lt: periodStart } } }),
    ]);

    // ─── Totals ────────────────────────────────────────────────
    const [totalViewsResult, totalFollowers, totalVideos, totalPolls] = await Promise.all([
      db.video.aggregate({ where: { creatorId: userId }, _sum: { viewCount: true } }),
      db.follow.count({ where: { followingId: userId } }),
      db.video.count({ where: { creatorId: userId } }),
      db.poll.count({ where: { video: { creatorId: userId } } }),
    ]);

    const totalViews = totalViewsResult._sum.viewCount || 0;

    // ─── Revenue metrics ───────────────────────────────────────
    const [currentEarnings, prevEarnings, totalEarningsResult, pendingEarnings] = await Promise.all([
      db.transaction.aggregate({ where: { userId, type: { in: ['earning', 'reward'] }, status: 'completed', createdAt: { gte: periodStart } }, _sum: { amount: true } }),
      db.transaction.aggregate({ where: { userId, type: { in: ['earning', 'reward'] }, status: 'completed', createdAt: { gte: prevPeriodStart, lt: periodStart } }, _sum: { amount: true } }),
      db.transaction.aggregate({ where: { userId, type: { in: ['earning', 'reward'] }, status: 'completed' }, _sum: { amount: true } }),
      db.transaction.aggregate({ where: { userId, type: { in: ['earning', 'reward'] }, status: 'pending' }, _sum: { amount: true } }),
    ]);

    // ─── Engagement rate (current) ─────────────────────────────
    const currentViewsNum = currentViews._sum.viewCount || 0;
    const totalInteractions = currentLikes + currentComments + currentResponses + currentReposts;
    const engagementRate = currentViewsNum > 0 ? (totalInteractions / currentViewsNum) * 100 : 0;
    const prevViewsNum = prevViews._sum.viewCount || 0;
    const prevInteractions = prevLikes + prevComments + prevResponses;
    const prevEngagementRate = prevViewsNum > 0 ? (prevInteractions / prevViewsNum) * 100 : 0;

    // ─── Daily time series (last 30 days) ──────────────────────
    const dailyData: Array<{ date: string; views: number; likes: number; comments: number; followers: number; revenue: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const [dayViews, dayLikes, dayComments, dayFollowers, dayRevenue] = await Promise.all([
        db.video.aggregate({ where: { creatorId: userId, createdAt: { gte: dayStart, lt: dayEnd } }, _sum: { viewCount: true } }),
        db.like.count({ where: { video: { creatorId: userId }, createdAt: { gte: dayStart, lt: dayEnd } } }),
        db.comment.count({ where: { video: { creatorId: userId }, createdAt: { gte: dayStart, lt: dayEnd } } }),
        db.follow.count({ where: { followingId: userId, createdAt: { gte: dayStart, lt: dayEnd } } }),
        db.transaction.aggregate({ where: { userId, type: { in: ['earning', 'reward'] }, status: 'completed', createdAt: { gte: dayStart, lt: dayEnd } }, _sum: { amount: true } }),
      ]);

      dailyData.push({
        date: dayStart.toISOString().split('T')[0],
        views: dayViews._sum.viewCount || 0,
        likes: dayLikes,
        comments: dayComments,
        followers: dayFollowers,
        revenue: Math.round((dayRevenue._sum.amount || 0) * 100) / 100,
      });
    }

    // ─── Top performing content ────────────────────────────────
    const topVideos = await db.video.findMany({
      where: { creatorId: userId, createdAt: { gte: periodStart } },
      orderBy: { viewCount: 'desc' },
      take: 5,
      select: {
        id: true, title: true, viewCount: true, createdAt: true, type: true, status: true,
        _count: { select: { likes: true, comments: true, reactions: true } },
        poll: { select: { responseCount: true, question: true, isPaid: true } },
      },
    });

    // ─── Reaction breakdown ────────────────────────────────────
    const reactions = await db.reaction.groupBy({
      by: ['type'],
      where: { video: { creatorId: userId }, createdAt: { gte: periodStart } },
      _count: true,
      orderBy: { _count: { type: 'desc' } },
    });

    // ─── Reach vs Engagement funnel ────────────────────────────
    const uniqueViewers = await db.video.aggregate({
      where: { creatorId: userId, createdAt: { gte: periodStart } },
      _sum: { viewCount: true },
    });
    const reach = uniqueViewers._sum.viewCount || 0;

    // ─── Helper ────────────────────────────────────────────────
    const pct = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return NextResponse.json({
      success: true,
      data: {
        period,
        periodLabel: period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : period === '90d' ? 'Last 90 Days' : 'Last Year',
        kpis: {
          views: { value: currentViewsNum, previous: prevViewsNum, change: pct(currentViewsNum, prevViewsNum), total: totalViews },
          likes: { value: currentLikes, previous: prevLikes, change: pct(currentLikes, prevLikes) },
          comments: { value: currentComments, previous: prevComments, change: pct(currentComments, prevComments) },
          responses: { value: currentResponses, previous: prevResponses, change: pct(currentResponses, prevResponses) },
          reposts: { value: currentReposts, change: 0 },
          followers: { value: currentFollowers, previous: prevFollowers, change: pct(currentFollowers, prevFollowers), total: totalFollowers },
          engagementRate: { value: Math.round(engagementRate * 10) / 10, previous: Math.round(prevEngagementRate * 10) / 10, change: Math.round((engagementRate - prevEngagementRate) * 10) / 10 },
          revenue: {
            value: Math.round((currentEarnings._sum.amount || 0) * 100) / 100,
            previous: Math.round((prevEarnings._sum.amount || 0) * 100) / 100,
            change: pct(currentEarnings._sum.amount || 0, prevEarnings._sum.amount || 0),
            total: Math.round((totalEarningsResult._sum.amount || 0) * 100) / 100,
            pending: Math.round((pendingEarnings._sum.amount || 0) * 100) / 100,
          },
          content: { totalVideos, totalPolls },
        },
        dailyTimeSeries: dailyData,
        topVideos: topVideos.map((v) => ({
          ...v,
          createdAt: v.createdAt.toISOString(),
          likes: v._count.likes,
          comments: v._count.comments,
          reactions: v._count.reactions,
          pollResponses: v.poll?.responseCount || 0,
        })),
        reactions: reactions.map((r) => ({ type: r.type, count: r._count })),
        reach,
        funnel: {
          views: currentViewsNum,
          engaged: totalInteractions,
          voted: await db.pollVote.count({
            where: {
              poll: { video: { creatorId: userId } },
              createdAt: { gte: periodStart },
            },
          }),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/analytics/overview error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load analytics overview' }, { status: 500 });
  }
}

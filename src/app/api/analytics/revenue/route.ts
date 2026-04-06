import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/analytics/revenue — Revenue & monetization analytics for businesses
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // ─── Revenue by type (current month) ───────────────────────
    const revenueByType = await db.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        type: { in: ['earning', 'reward', 'tip'] },
        status: 'completed',
        createdAt: { gte: thisMonthStart },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    // ─── Revenue by type (last month) ──────────────────────────
    const revenueByTypePrev = await db.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        type: { in: ['earning', 'reward', 'tip'] },
        status: 'completed',
        createdAt: { gte: lastMonthStart, lt: lastMonthEnd },
      },
      _sum: { amount: true },
    });

    // ─── Monthly revenue trend (last 12 months) ────────────────
    const monthlyRevenue: Array<{ month: string; revenue: number; transactions: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const [sumResult, count] = await Promise.all([
        db.transaction.aggregate({
          where: { userId, type: { in: ['earning', 'reward', 'tip'] }, status: 'completed', createdAt: { gte: monthStart, lt: monthEnd } },
          _sum: { amount: true },
        }),
        db.transaction.count({
          where: { userId, type: { in: ['earning', 'reward', 'tip'] }, status: 'completed', createdAt: { gte: monthStart, lt: monthEnd } },
        }),
      ]);

      monthlyRevenue.push({
        month: monthLabel,
        revenue: Math.round((sumResult._sum.amount || 0) * 100) / 100,
        transactions: count,
      });
    }

    // ─── Paid poll performance ─────────────────────────────────
    const paidPolls = await db.poll.findMany({
      where: { video: { creatorId: userId }, isPaid: true },
      include: {
        video: { select: { title: true, viewCount: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const paidPollPerformance = paidPolls.map((p) => ({
      id: p.id,
      question: p.question,
      videoTitle: p.video.title,
      videoViews: p.video.viewCount,
      totalResponses: p.responseCount,
      totalRewardPool: p.totalRewardPool,
      rewardPerResponse: p.rewardPerResponse,
      spentToDate: Math.min(p.responseCount * p.rewardPerResponse, p.totalRewardPool),
      conversionRate: p.video.viewCount > 0 ? ((p.responseCount / p.video.viewCount) * 100).toFixed(1) : '0',
      status: p.closesAt && new Date(p.closesAt) < now ? 'closed' : 'active',
      createdAt: p.createdAt.toISOString(),
    }));

    // ─── Promoted videos ROI ───────────────────────────────────
    const promotions = await db.promotedVideo.findMany({
      where: { creatorId: userId },
      include: { video: { select: { title: true, viewCount: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const promotionROI = promotions.map((p) => {
      const ctr = p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(2) : '0';
      const cpc = p.clicks > 0 ? (p.spent / p.clicks).toFixed(2) : '0';
      return {
        id: p.id,
        videoTitle: p.video.title,
        budget: p.budget,
        spent: p.spent,
        impressions: p.impressions,
        clicks: p.clicks,
        ctr: `${ctr}%`,
        cpc: `$${cpc}`,
        status: p.status,
        roi: p.spent > 0 ? (((p.video.viewCount - p.impressions) / p.spent) * 100).toFixed(0) : '0',
      };
    });

    // ─── Subscription revenue ──────────────────────────────────
    const activeSubscriptions = await db.subscription.findMany({
      where: { creatorId: userId, status: 'active' },
      include: {
        subscriber: { select: { username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    const [totalActiveSubs, subRevenueThisMonth, subRevenueTotal] = await Promise.all([
      db.subscription.count({ where: { creatorId: userId, status: 'active' } }),
      db.transaction.aggregate({
        where: { userId, type: 'earning', status: 'completed', description: { contains: 'subscription' }, createdAt: { gte: thisMonthStart } },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { userId, type: 'earning', status: 'completed', description: { contains: 'subscription' } },
        _sum: { amount: true },
      }),
    ]);

    // ─── Tips received ─────────────────────────────────────────
    const totalTips = await db.transaction.aggregate({
      where: { userId, type: 'earning', status: 'completed', description: { contains: 'Tip' } },
      _sum: { amount: true },
    });

    const recentTips = await db.transaction.findMany({
      where: { userId, type: 'earning', status: 'completed', description: { contains: 'Tip' } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { amount: true, description: true, createdAt: true },
    });

    // ─── Summary ───────────────────────────────────────────────
    const [thisMonthTotal, lastMonthTotal, totalEarnings, pendingEarnings] = await Promise.all([
      db.transaction.aggregate({ where: { userId, type: { in: ['earning', 'reward'] }, status: 'completed', createdAt: { gte: thisMonthStart } }, _sum: { amount: true } }),
      db.transaction.aggregate({ where: { userId, type: { in: ['earning', 'reward'] }, status: 'completed', createdAt: { gte: lastMonthStart, lt: lastMonthEnd } }, _sum: { amount: true } }),
      db.transaction.aggregate({ where: { userId, type: { in: ['earning', 'reward'] }, status: 'completed' }, _sum: { amount: true } }),
      db.transaction.aggregate({ where: { userId, type: { in: ['earning', 'reward'] }, status: 'pending' }, _sum: { amount: true } }),
    ]);

    const thisMonthVal = Math.round((thisMonthTotal._sum.amount || 0) * 100) / 100;
    const lastMonthVal = Math.round((lastMonthTotal._sum.amount || 0) * 100) / 100;
    const totalVal = Math.round((totalEarnings._sum.amount || 0) * 100) / 100;
    const pendingVal = Math.round((pendingEarnings._sum.amount || 0) * 100) / 100;
    const change = lastMonthVal > 0 ? Math.round(((thisMonthVal - lastMonthVal) / lastMonthVal) * 100) : (thisMonthVal > 0 ? 100 : 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          thisMonth: thisMonthVal,
          lastMonth: lastMonthVal,
          total: totalVal,
          pending: pendingVal,
          change,
        },
        revenueByType: revenueByType.map((r) => ({ type: r.type, amount: Math.round((r._sum.amount || 0) * 100) / 100 })),
        revenueByTypePrev: revenueByTypePrev.map((r) => ({ type: r.type, amount: Math.round((r._sum.amount || 0) * 100) / 100 })),
        monthlyRevenue,
        paidPolls: paidPollPerformance,
        promotions: promotionROI,
        subscriptions: {
          activeCount: totalActiveSubs,
          thisMonthRevenue: Math.round((subRevenueThisMonth._sum.amount || 0) * 100) / 100,
          totalRevenue: Math.round((subRevenueTotal._sum.amount || 0) * 100) / 100,
          recentSubscribers: activeSubscriptions.map((s) => ({
            username: s.subscriber.username,
            displayName: s.subscriber.displayName,
            tier: s.tier,
            amount: s.amount,
            startedAt: s.startedAt.toISOString(),
          })),
        },
        tips: {
          totalReceived: Math.round((totalTips._sum.amount || 0) * 100) / 100,
          recent: recentTips.map((t) => ({
            amount: t.amount,
            description: t.description,
            date: t.createdAt.toISOString(),
          })),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/analytics/revenue error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load revenue analytics' }, { status: 500 });
  }
}

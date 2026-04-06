import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/creator/dashboard — comprehensive creator dashboard data
export async function GET(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user overview
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        memberScore: true,
        isVerified: true,
        walletBalance: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Total followers
    const totalFollowers = await db.follow.count({
      where: { followingId: userId },
    });

    // --- Earnings ---
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const thisMonthResult = await db.transaction.aggregate({
      where: {
        userId,
        type: { in: ['earning', 'reward'] },
        status: 'completed',
        createdAt: { gte: thisMonthStart },
      },
      _sum: { amount: true },
    });
    const thisMonth = thisMonthResult._sum.amount || 0;

    const lastMonthResult = await db.transaction.aggregate({
      where: {
        userId,
        type: { in: ['earning', 'reward'] },
        status: 'completed',
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { amount: true },
    });
    const lastMonth = lastMonthResult._sum.amount || 0;

    const totalEarningsResult = await db.transaction.aggregate({
      where: {
        userId,
        type: { in: ['earning', 'reward'] },
        status: 'completed',
      },
      _sum: { amount: true },
    });
    const totalEarnings = totalEarningsResult._sum.amount || 0;

    const pendingPayoutResult = await db.transaction.aggregate({
      where: {
        userId,
        type: { in: ['earning', 'reward'] },
        status: 'pending',
      },
      _sum: { amount: true },
    });
    const pendingPayout = pendingPayoutResult._sum.amount || 0;

    // --- Content ---
    const totalVideos = await db.video.count({
      where: { creatorId: userId },
    });

    const totalPolls = await db.poll.count({
      where: { video: { creatorId: userId } },
    });

    const totalResponses = await db.video.count({
      where: { creatorId: userId, type: 'response' },
    });

    const topVideo = await db.video.findFirst({
      where: { creatorId: userId },
      orderBy: { viewCount: 'desc' },
      select: {
        id: true,
        title: true,
        viewCount: true,
        thumbnailUrl: true,
        createdAt: true,
      },
    });

    // --- Audience ---
    // Top locations from followers
    const followersWithLocation = await db.user.findMany({
      where: {
        followers: { some: { followingId: userId } },
        location: { not: null },
      },
      select: { location: true },
    });

    const locationCounts: Record<string, number> = {};
    for (const f of followersWithLocation) {
      if (f.location) {
        locationCounts[f.location] = (locationCounts[f.location] || 0) + 1;
      }
    }
    const topLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Top age ranges from followers
    const followersWithAge = await db.user.findMany({
      where: {
        followers: { some: { followingId: userId } },
        ageRange: { not: null },
      },
      select: { ageRange: true },
    });

    const ageCounts: Record<string, number> = {};
    for (const f of followersWithAge) {
      if (f.ageRange) {
        ageCounts[f.ageRange] = (ageCounts[f.ageRange] || 0) + 1;
      }
    }
    const topAgeRanges = Object.entries(ageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Subscriber growth — last 7 days
    const subscriberGrowth: Array<{ date: string; newSubscribers: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const count = await db.subscription.count({
        where: {
          creatorId: userId,
          startedAt: { gte: dayStart, lt: dayEnd },
        },
      });

      subscriberGrowth.push({
        date: dayStart.toISOString().split('T')[0],
        newSubscribers: count,
      });
    }

    // --- Recent Activity ---
    // Recent videos
    const recentVideos = await db.video.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, createdAt: true, type: true },
    });

    const recentActivity = recentVideos.map((v) => ({
      type: 'video' as const,
      description: `Published ${v.type === 'lead' ? 'lead clip' : 'response'}: ${v.title}`,
      timestamp: v.createdAt.toISOString(),
    }));

    // Recent tips received
    const recentTips = await db.transaction.findMany({
      where: {
        userId,
        type: 'earning',
        status: 'completed',
        description: { contains: 'Tip from' },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        amount: true,
        description: true,
        createdAt: true,
        user: {
          select: { username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    const totalTipsReceivedResult = await db.transaction.aggregate({
      where: {
        userId,
        type: 'earning',
        status: 'completed',
        description: { contains: 'Tip from' },
      },
      _sum: { amount: true },
    });
    const totalTipsReceived = totalTipsReceivedResult._sum.amount || 0;

    return NextResponse.json({
      overview: {
        totalViews: await db.video.aggregate({
          where: { creatorId: userId },
          _sum: { viewCount: true },
        }).then((r) => r._sum.viewCount || 0),
        totalFollowers,
        memberScore: user.memberScore,
        isVerified: user.isVerified,
      },
      earnings: {
        thisMonth: Math.round(thisMonth * 100) / 100,
        lastMonth: Math.round(lastMonth * 100) / 100,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        pendingPayout: Math.round(pendingPayout * 100) / 100,
      },
      content: {
        totalVideos,
        totalPolls,
        totalResponses,
        topVideo: topVideo
          ? { ...topVideo, createdAt: topVideo.createdAt.toISOString() }
          : null,
      },
      audience: {
        topLocations,
        topAgeRanges,
        subscriberGrowth,
      },
      recentActivity,
      tips: {
        totalReceived: Math.round(totalTipsReceived * 100) / 100,
        recentTips: recentTips.map((t) => ({
          id: t.id,
          amount: t.amount,
          description: t.description,
          createdAt: t.createdAt.toISOString(),
          fromUser: t.user,
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/creator/dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch creator dashboard' }, { status: 500 });
  }
}

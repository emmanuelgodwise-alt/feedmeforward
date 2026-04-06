import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/creator/analytics?period=all|7d|30d|90d
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';

    // Calculate the date threshold for period filtering
    const now = new Date();
    const dateThreshold = period === '7d'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : period === '30d'
        ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        : period === '90d'
          ? new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          : null;

    const videoWhere: Prisma.VideoWhereInput = {
      creatorId: userId,
      ...(dateThreshold ? { createdAt: { gte: dateThreshold } } : {}),
    };

    // Fetch all creator's videos with counts
    const videos = await db.video.findMany({
      where: videoWhere,
      select: {
        id: true,
        viewCount: true,
        category: true,
        createdAt: true,
        _count: {
          select: { likes: true, comments: true, responses: true },
        },
      },
    });

    // Aggregate analytics
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalResponses = 0;
    const categoryCounts: Record<string, number> = {};

    for (const video of videos) {
      totalViews += video.viewCount;
      totalLikes += video._count.likes;
      totalComments += video._count.comments;
      totalResponses += video._count.responses;
      if (video.category) {
        categoryCounts[video.category] = (categoryCounts[video.category] || 0) + 1;
      }
    }

    // Total tips received (from tip transactions where this user is the recipient)
    const tipResult = await db.transaction.aggregate({
      where: {
        userId,
        type: 'earning',
        status: 'completed',
        description: { contains: 'Tip from' },
        ...(dateThreshold ? { createdAt: { gte: dateThreshold } } : {}),
      },
      _sum: { amount: true },
    });
    const totalTips = tipResult._sum?.amount || 0;

    // Total revenue (earnings + rewards)
    const revenueResult = await db.transaction.aggregate({
      where: {
        userId,
        type: { in: ['earning', 'reward'] },
        status: 'completed',
        ...(dateThreshold ? { createdAt: { gte: dateThreshold } } : {}),
      },
      _sum: { amount: true },
    });
    const totalRevenue = revenueResult._sum?.amount || 0;

    // Total polls
    const totalPolls = await db.poll.count({
      where: {
        video: { creatorId: userId },
        ...(dateThreshold ? { createdAt: { gte: dateThreshold } } : {}),
      },
    });

    // Average engagement rate
    const avgEngagement = totalViews > 0
      ? ((totalLikes + totalComments + totalResponses) / totalViews) * 100
      : 0;

    // Top category
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Subscriber count
    const subscriberCount = await db.subscription.count({
      where: {
        creatorId: userId,
        status: 'active',
      },
    });

    // Daily views for last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dailyViewsRaw = await db.video.groupBy({
      by: ['createdAt'],
      where: {
        creatorId: userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { viewCount: true },
    });

    // Build daily view map
    const dailyViewsMap: Record<string, number> = {};
    for (const dv of dailyViewsRaw) {
      const dateKey = dv.createdAt.toISOString().split('T')[0];
      dailyViewsMap[dateKey] = (dailyViewsMap[dateKey] || 0) + (dv._sum.viewCount || 0);
    }

    // Fill all 30 days
    const dailyViews: Array<{ date: string; views: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split('T')[0];
      dailyViews.push({
        date: dateKey,
        views: dailyViewsMap[dateKey] || 0,
      });
    }

    // Milestones
    const milestones = [
      { label: '100 Views', achieved: totalViews >= 100, value: totalViews },
      { label: '1,000 Views', achieved: totalViews >= 1000, value: totalViews },
      { label: '10,000 Views', achieved: totalViews >= 10000, value: totalViews },
      { label: '100 Likes', achieved: totalLikes >= 100, value: totalLikes },
      { label: '1,000 Likes', achieved: totalLikes >= 1000, value: totalLikes },
      { label: '50 Subscribers', achieved: subscriberCount >= 50, value: subscriberCount },
      { label: '100 Subscribers', achieved: subscriberCount >= 100, value: subscriberCount },
      { label: '$100 Revenue', achieved: totalRevenue >= 100, value: totalRevenue },
      { label: '$1,000 Revenue', achieved: totalRevenue >= 1000, value: totalRevenue },
    ];

    // Upsert CreatorAnalytics cache
    await db.creatorAnalytics.upsert({
      where: { creatorId: userId },
      create: {
        creatorId: userId,
        totalViews,
        totalLikes,
        totalComments,
        totalResponses,
        totalTips: Math.round(totalTips * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPolls,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
        topCategory,
        subscriberCount,
        period,
        computedAt: now,
      },
      update: {
        totalViews,
        totalLikes,
        totalComments,
        totalResponses,
        totalTips: Math.round(totalTips * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPolls,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
        topCategory,
        subscriberCount,
        period,
        computedAt: now,
      },
    });

    return NextResponse.json({
      analytics: {
        totalViews,
        totalLikes,
        totalComments,
        totalResponses,
        totalTips: Math.round(totalTips * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPolls,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
        topCategory,
        subscriberCount,
        period,
        computedAt: now.toISOString(),
      },
      dailyViews,
      milestones,
    });
  } catch (error) {
    console.error('GET /api/creator/analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch creator analytics' }, { status: 500 });
  }
}

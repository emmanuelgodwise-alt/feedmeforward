import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/ads/analytics — Advertiser Analytics Dashboard
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const period = searchParams.get('period') || '30d';

    // Validate and compute period start date
    let periodDays = 30;
    if (period === '7d') periodDays = 7;
    else if (period === '90d') periodDays = 90;
    else if (period !== '30d') {
      return NextResponse.json({ error: 'Invalid period. Use 7d, 30d, or 90d' }, { status: 400 });
    }

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Build campaign filter
    const campaignWhere: Record<string, unknown> = { advertiserId: userId };
    if (campaignId) {
      campaignWhere.id = campaignId;
    }

    // Fetch campaign performance metrics
    const campaigns = await db.adCampaign.findMany({
      where: campaignWhere,
      select: {
        id: true,
        title: true,
        adType: true,
        status: true,
        budget: true,
        spent: true,
        impressions: true,
        clicks: true,
        conversions: true,
        cpmBid: true,
        cpcBid: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
      },
    });

    // Get impressions within the period
    const campaignIds = campaigns.map((c) => c.id);

    const impressions = campaignIds.length > 0
      ? await db.adImpression.findMany({
          where: {
            campaignId: { in: campaignIds },
            createdAt: { gte: periodStart },
          },
          select: {
            id: true,
            campaignId: true,
            videoId: true,
            viewerAge: true,
            viewerLocation: true,
            viewerGender: true,
            adType: true,
            revenue: true,
            createdAt: true,
          },
        })
      : [];

    const clicks = campaignIds.length > 0
      ? await db.adClick.findMany({
          where: {
            campaignId: { in: campaignIds },
            createdAt: { gte: periodStart },
          },
          select: {
            id: true,
            campaignId: true,
            videoId: true,
            revenue: true,
            createdAt: true,
          },
        })
      : [];

    // Compute aggregate metrics
    const totalImpressions = impressions.length;
    const totalClicks = clicks.length;
    const totalSpent = impressions.reduce((sum, i) => sum + i.revenue, 0) +
      clicks.reduce((sum, c) => sum + c.revenue, 0);
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCPM = totalImpressions > 0 ? (totalSpent / totalImpressions) * 1000 : 0;
    const avgCPC = totalClicks > 0 ? totalSpent / totalClicks : 0;

    // Per-campaign metrics
    const campaignMetrics = campaigns.map((c) => {
      const cImpressions = impressions.filter((i) => i.campaignId === c.id);
      const cClicks = clicks.filter((cl) => cl.campaignId === c.id);
      const cImpCount = cImpressions.length;
      const cClickCount = cClicks.length;
      const cSpent = cImpressions.reduce((s, i) => s + i.revenue, 0) +
        cClicks.reduce((s, cl) => s + cl.revenue, 0);
      const cCTR = cImpCount > 0 ? (cClickCount / cImpCount) * 100 : 0;

      return {
        campaignId: c.id,
        title: c.title,
        adType: c.adType,
        status: c.status,
        impressions: cImpCount,
        clicks: cClickCount,
        ctr: Math.round(cCTR * 100) / 100,
        spent: Math.round(cSpent * 10000) / 10000,
        budget: c.budget,
        budgetUtilization: c.budget > 0 ? Math.round((cSpent / c.budget) * 10000) / 100 : 0,
      };
    });

    // Demographics breakdown
    const ageGroups = new Map<string, number>();
    const locations = new Map<string, number>();
    const genderStats = new Map<string, number>();

    impressions.forEach((imp) => {
      if (imp.viewerAge) {
        ageGroups.set(imp.viewerAge, (ageGroups.get(imp.viewerAge) || 0) + 1);
      }
      if (imp.viewerLocation) {
        locations.set(imp.viewerLocation, (locations.get(imp.viewerLocation) || 0) + 1);
      }
      if (imp.viewerGender) {
        genderStats.set(imp.viewerGender, (genderStats.get(imp.viewerGender) || 0) + 1);
      }
    });

    // Sort demographics by count descending
    const demographics = {
      ageGroups: [...ageGroups.entries()]
        .map(([age, count]) => ({ age, count, percentage: totalImpressions > 0 ? Math.round((count / totalImpressions) * 100) : 0 }))
        .sort((a, b) => b.count - a.count),
      locations: [...locations.entries()]
        .map(([location, count]) => ({ location, count, percentage: totalImpressions > 0 ? Math.round((count / totalImpressions) * 100) : 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      gender: [...genderStats.entries()]
        .map(([gender, count]) => ({ gender, count, percentage: totalImpressions > 0 ? Math.round((count / totalImpressions) * 100) : 0 }))
        .sort((a, b) => b.count - a.count),
    };

    // CTR trend (daily for the period)
    const dailyTrend: { date: string; impressions: number; clicks: number; ctr: number; spent: number }[] = [];
    const impByDate = new Map<string, number>();
    const clickByDate = new Map<string, number>();
    const spentByDate = new Map<string, number>();

    impressions.forEach((imp) => {
      const dateKey = imp.createdAt.toISOString().split('T')[0];
      impByDate.set(dateKey, (impByDate.get(dateKey) || 0) + 1);
      spentByDate.set(dateKey, (spentByDate.get(dateKey) || 0) + imp.revenue);
    });

    clicks.forEach((cl) => {
      const dateKey = cl.createdAt.toISOString().split('T')[0];
      clickByDate.set(dateKey, (clickByDate.get(dateKey) || 0) + 1);
      spentByDate.set(dateKey, (spentByDate.get(dateKey) || 0) + cl.revenue);
    });

    // Fill in all dates in the period
    const checkDate = new Date(periodStart);
    while (checkDate <= new Date()) {
      const dateKey = checkDate.toISOString().split('T')[0];
      const dayImp = impByDate.get(dateKey) || 0;
      const dayClick = clickByDate.get(dateKey) || 0;
      const daySpent = spentByDate.get(dateKey) || 0;

      dailyTrend.push({
        date: dateKey,
        impressions: dayImp,
        clicks: dayClick,
        ctr: dayImp > 0 ? Math.round((dayClick / dayImp) * 10000) / 100 : 0,
        spent: Math.round(daySpent * 10000) / 10000,
      });

      checkDate.setDate(checkDate.getDate() + 1);
    }

    // Top performing videos by ad revenue
    const videoPerformance = new Map<string, { videoId: string; impressions: number; clicks: number; revenue: number }>();

    impressions.forEach((imp) => {
      const existing = videoPerformance.get(imp.videoId) || { videoId: imp.videoId, impressions: 0, clicks: 0, revenue: 0 };
      existing.impressions++;
      existing.revenue += imp.revenue;
      videoPerformance.set(imp.videoId, existing);
    });

    clicks.forEach((cl) => {
      const existing = videoPerformance.get(cl.videoId) || { videoId: cl.videoId, impressions: 0, clicks: 0, revenue: 0 };
      existing.clicks++;
      existing.revenue += cl.revenue;
      videoPerformance.set(cl.videoId, existing);
    });

    const topVideos = [...videoPerformance.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Enrich with video data
    const topVideoIds = topVideos.map((v) => v.videoId);
    const videoDetails = topVideoIds.length > 0
      ? await db.video.findMany({
          where: { id: { in: topVideoIds } },
          select: { id: true, title: true, thumbnailUrl: true, viewCount: true, creator: { select: { id: true, username: true } } },
        })
      : [];

    const videoMap = new Map(videoDetails.map((v) => [v.id, v]));

    const topPerformingVideos = topVideos.map((tv) => {
      const vd = videoMap.get(tv.videoId);
      return {
        videoId: tv.videoId,
        title: vd?.title || 'Unknown Video',
        thumbnailUrl: vd?.thumbnailUrl || null,
        viewCount: vd?.viewCount || 0,
        creator: vd?.creator || null,
        impressions: tv.impressions,
        clicks: tv.clicks,
        ctr: tv.impressions > 0 ? Math.round((tv.clicks / tv.impressions) * 10000) / 100 : 0,
        revenue: Math.round(tv.revenue * 10000) / 10000,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        period: {
          type: period,
          days: periodDays,
          start: periodStart.toISOString(),
          end: new Date().toISOString(),
        },
        summary: {
          totalCampaigns: campaigns.length,
          activeCampaigns: campaigns.filter((c) => c.status === 'active').length,
          totalImpressions,
          totalClicks,
          totalSpent: Math.round(totalSpent * 10000) / 10000,
          averageCTR: Math.round(avgCTR * 100) / 100,
          averageCPM: Math.round(avgCPM * 10000) / 10000,
          averageCPC: Math.round(avgCPC * 10000) / 10000,
          totalBudget: campaigns.reduce((s, c) => s + c.budget, 0),
          budgetUtilization: campaigns.reduce((s, c) => s + c.budget, 0) > 0
            ? Math.round((totalSpent / campaigns.reduce((s, c) => s + c.budget, 0)) * 10000) / 100
            : 0,
        },
        campaignMetrics,
        demographics,
        dailyTrend,
        topPerformingVideos,
      },
    });
  } catch (error) {
    console.error('GET /api/ads/analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

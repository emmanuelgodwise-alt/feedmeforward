import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/ads/campaigns/[id] — Get Campaign Detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const campaign = await db.adCampaign.findUnique({
      where: { id },
      include: {
        placements: {
          include: {
            video: {
              select: {
                id: true,
                title: true,
                thumbnailUrl: true,
                viewCount: true,
                creator: { select: { id: true, username: true } },
              },
            },
            _count: {
              select: { adImpressions: true, adClicks: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            adImpressions: true,
            adClicks: true,
            revenueShares: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.advertiserId !== userId) {
      return NextResponse.json({ error: 'Only the advertiser can view this campaign' }, { status: 403 });
    }

    const budgetRemaining = Math.max(0, campaign.budget - campaign.spent);
    const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100) : 0;

    // Get daily impressions for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyImpressions = await db.adImpression.groupBy({
      by: ['createdAt'],
      where: {
        campaignId: id,
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    // Aggregate daily impressions by date
    const dailyMap = new Map<string, number>();
    dailyImpressions.forEach((di) => {
      const dateKey = di.createdAt.toISOString().split('T')[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + di._count.id);
    });

    // Fill in missing dates
    const dailyData: { date: string; impressions: number }[] = [];
    const checkDate = new Date(thirtyDaysAgo);
    while (checkDate <= new Date()) {
      const dateKey = checkDate.toISOString().split('T')[0];
      dailyData.push({
        date: dateKey,
        impressions: dailyMap.get(dateKey) || 0,
      });
      checkDate.setDate(checkDate.getDate() + 1);
    }

    // Get daily clicks for last 30 days
    const dailyClicks = await db.adClick.groupBy({
      by: ['createdAt'],
      where: {
        campaignId: id,
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyClicksMap = new Map<string, number>();
    dailyClicks.forEach((dc) => {
      const dateKey = dc.createdAt.toISOString().split('T')[0];
      dailyClicksMap.set(dateKey, (dailyClicksMap.get(dateKey) || 0) + dc._count.id);
    });

    const dailyClickData = dailyData.map((d) => ({
      ...d,
      clicks: dailyClicksMap.get(d.date) || 0,
    }));

    // Parse targeting criteria
    let parsedTargeting = null;
    if (campaign.targetingCriteria) {
      try {
        parsedTargeting = JSON.parse(campaign.targetingCriteria);
      } catch {
        // skip
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        imageUrl: campaign.imageUrl,
        targetUrl: campaign.targetUrl,
        adType: campaign.adType,
        budget: campaign.budget,
        spent: Math.round(campaign.spent * 100) / 100,
        budgetRemaining: Math.round(budgetRemaining * 100) / 100,
        cpmBid: campaign.cpmBid,
        cpcBid: campaign.cpcBid,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        conversions: campaign.conversions,
        ctr: Math.round(ctr * 100) / 100,
        status: campaign.status,
        targetingCriteria: parsedTargeting,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        placements: campaign.placements.map((p) => ({
          id: p.id,
          videoId: p.videoId,
          videoTitle: p.video.title,
          videoThumbnail: p.video.thumbnailUrl,
          videoViewCount: p.video.viewCount,
          videoCreator: p.video.creator,
          placementType: p.placementType,
          status: p.status,
          impressions: p.impressions,
          clicks: p.clicks,
          revenueEarned: Math.round(p.revenueEarned * 100) / 100,
          startsAt: p.startsAt,
          endsAt: p.endsAt,
          createdAt: p.createdAt,
          impressionCount: p._count.adImpressions,
          clickCount: p._count.adClicks,
        })),
        totalImpressions: campaign._count.adImpressions,
        totalClicks: campaign._count.adClicks,
        dailyStats: dailyClickData,
      },
    });
  } catch (error) {
    console.error('GET /api/ads/campaigns/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign detail' }, { status: 500 });
  }
}

// PATCH /api/ads/campaigns/[id] — Update Campaign
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const campaign = await db.adCampaign.findUnique({
      where: { id },
      select: { id: true, advertiserId: true, status: true, budget: true, spent: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.advertiserId !== userId) {
      return NextResponse.json({ error: 'Only the advertiser can update this campaign' }, { status: 403 });
    }

    const body = await request.json();
    const {
      status: newStatus,
      targetingCriteria,
      budget: additionalBudget,
      title,
      description,
      imageUrl,
      endsAt,
    } = body as {
      status?: string;
      targetingCriteria?: Record<string, unknown>;
      budget?: number;
      title?: string;
      description?: string;
      imageUrl?: string;
      endsAt?: string;
    };

    const updateData: Record<string, unknown> = {};

    // Handle status changes (pause/resume)
    if (newStatus) {
      const validTransitions: Record<string, string[]> = {
        active: ['paused', 'completed'],
        paused: ['active'],
        draft: ['active', 'paused'],
        exhausted: [],
        completed: [],
      };

      const allowed = validTransitions[campaign.status] || [];
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          { error: `Cannot transition from "${campaign.status}" to "${newStatus}"` },
          { status: 400 }
        );
      }
      updateData.status = newStatus;
    }

    // Handle budget extension
    if (additionalBudget !== undefined) {
      if (typeof additionalBudget !== 'number' || additionalBudget <= 0) {
        return NextResponse.json({ error: 'Additional budget must be a positive number' }, { status: 400 });
      }

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (user.walletBalance < additionalBudget) {
        return NextResponse.json(
          { error: `Insufficient balance. Current: $${user.walletBalance.toFixed(2)}, needed: $${additionalBudget.toFixed(2)}` },
          { status: 400 }
        );
      }

      await db.$transaction(async (tx) => {
        // Deduct from wallet
        await tx.user.update({
          where: { id: userId },
          data: { walletBalance: { decrement: additionalBudget } },
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId,
            amount: -additionalBudget,
            type: 'withdrawal',
            status: 'completed',
            description: `Extended ad campaign budget: ${campaign.id}`,
          },
        });

        // Update campaign budget
        await tx.adCampaign.update({
          where: { id },
          data: {
            budget: { increment: additionalBudget },
            // If exhausted, reactivate
            ...(campaign.status === 'exhausted' ? { status: 'active' } : {}),
          },
        });
      });

      // Return early if only budget update
      const updatedCampaign = await db.adCampaign.findUnique({ where: { id } });
      return NextResponse.json({ success: true, data: updatedCampaign });
    }

    // Handle targeting criteria update
    if (targetingCriteria !== undefined) {
      updateData.targetingCriteria = JSON.stringify(targetingCriteria);
    }

    // Handle other field updates
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 1) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
      }
      updateData.title = title.trim();
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl || null;
    }
    if (endsAt !== undefined) {
      if (endsAt === null) {
        updateData.endsAt = null;
      } else {
        const parsed = new Date(endsAt);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json({ error: 'Invalid endsAt date' }, { status: 400 });
        }
        updateData.endsAt = parsed;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updatedCampaign = await db.adCampaign.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedCampaign });
  } catch (error) {
    console.error('PATCH /api/ads/campaigns/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/ads/click — Record Ad Click
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campaignId, placementId, videoId, userId } = body as {
      campaignId?: string;
      placementId?: string;
      videoId?: string;
      userId?: string;
    };

    // Validate required fields
    if (!campaignId || typeof campaignId !== 'string') {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }
    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Verify campaign exists
    const campaign = await db.adCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        status: true,
        cpcBid: true,
        budget: true,
        spent: true,
        clicks: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Verify placement if provided
    if (placementId) {
      const placement = await db.adPlacement.findUnique({
        where: { id: placementId },
        select: { id: true, campaignId: true },
      });
      if (!placement || placement.campaignId !== campaignId) {
        return NextResponse.json({ error: 'Placement not found or does not belong to this campaign' }, { status: 404 });
      }
    }

    // Calculate click revenue (use CPC bid)
    const clickRevenue = campaign.cpcBid;

    // Check budget
    const budgetRemaining = campaign.budget - campaign.spent;
    if (budgetRemaining <= 0) {
      // Still record the click but don't charge (campaign already exhausted)
      const click = await db.adClick.create({
        data: {
          campaignId,
          placementId: placementId || null,
          videoId,
          clickerId: userId || null,
          adType: 'unknown',
          revenue: 0,
        },
      });

      return NextResponse.json({
        success: true,
        data: { clickId: click.id, revenueCharged: 0, note: 'Campaign budget exhausted' },
      });
    }

    // Record click and update counters
    const click = await db.$transaction(async (tx) => {
      const created = await tx.adClick.create({
        data: {
          campaignId,
          placementId: placementId || null,
          videoId,
          clickerId: userId || null,
          adType: 'unknown',
          revenue: clickRevenue,
        },
      });

      // Update campaign counters
      await tx.adCampaign.update({
        where: { id: campaignId },
        data: {
          clicks: { increment: 1 },
          spent: { increment: clickRevenue },
          conversions: { increment: 1 },
        },
      });

      // Update placement counters if placementId provided
      if (placementId) {
        await tx.adPlacement.update({
          where: { id: placementId },
          data: {
            clicks: { increment: 1 },
          },
        });
      }

      return created;
    });

    // Check if campaign budget is now exhausted
    const updatedCampaign = await db.adCampaign.findUnique({
      where: { id: campaignId },
      select: { budget: true, spent: true, status: true },
    });

    if (updatedCampaign && updatedCampaign.spent >= updatedCampaign.budget && updatedCampaign.status === 'active') {
      await db.adCampaign.update({
        where: { id: campaignId },
        data: { status: 'exhausted' },
      });
      // Pause all placements
      await db.adPlacement.updateMany({
        where: { campaignId, status: 'active' },
        data: { status: 'paused' },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        clickId: click.id,
        revenueCharged: Math.round(clickRevenue * 100) / 100,
      },
    });
  } catch (error) {
    console.error('POST /api/ads/click error:', error);
    return NextResponse.json({ error: 'Failed to record ad click' }, { status: 500 });
  }
}

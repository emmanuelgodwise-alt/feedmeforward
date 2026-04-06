import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkVideoWorthy } from '@/lib/ad-worthy';

// POST /api/ads/placement — Place Ad on Worthy Video
export async function POST(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId, videoId, placementType } = body as {
      campaignId?: string;
      videoId?: string;
      placementType?: string;
    };

    // Validate required fields
    if (!campaignId || typeof campaignId !== 'string') {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }
    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const validPlacementTypes = ['pre_roll', 'banner_overlay', 'post_vote'];
    const finalPlacementType = placementType && validPlacementTypes.includes(placementType)
      ? placementType
      : 'banner_overlay';

    // Verify campaign exists and is active
    const campaign = await db.adCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        advertiserId: true,
        status: true,
        budget: true,
        spent: true,
        cpmBid: true,
        cpcBid: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.advertiserId !== userId) {
      return NextResponse.json({ error: 'Only the campaign advertiser can create placements' }, { status: 403 });
    }

    if (campaign.status !== 'active' && campaign.status !== 'paused') {
      return NextResponse.json(
        { error: `Campaign must be active or paused to create placements. Current status: ${campaign.status}` },
        { status: 400 }
      );
    }

    const budgetRemaining = campaign.budget - campaign.spent;
    if (budgetRemaining <= 0) {
      return NextResponse.json({ error: 'Campaign has no remaining budget' }, { status: 400 });
    }

    // Verify video is worthy
    const breakdown = await checkVideoWorthy(videoId);
    if (!breakdown) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!breakdown.isWorthy) {
      return NextResponse.json(
        {
          error: 'Video does not meet worthy criteria for ad placement',
          criteria: breakdown,
        },
        { status: 400 }
      );
    }

    // Check for duplicate placement
    const existingPlacement = await db.adPlacement.findUnique({
      where: {
        campaignId_videoId_placementType: {
          campaignId,
          videoId,
          placementType: finalPlacementType,
        },
      },
    });

    if (existingPlacement) {
      return NextResponse.json(
        { error: 'An ad placement already exists for this campaign, video, and placement type' },
        { status: 409 }
      );
    }

    // Create the placement
    const placement = await db.adPlacement.create({
      data: {
        campaignId,
        videoId,
        placementType: finalPlacementType,
        status: campaign.status === 'active' ? 'active' : 'paused',
      },
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
      },
    });

    return NextResponse.json({ success: true, data: placement }, { status: 201 });
  } catch (error) {
    console.error('POST /api/ads/placement error:', error);
    return NextResponse.json({ error: 'Failed to create ad placement' }, { status: 500 });
  }
}

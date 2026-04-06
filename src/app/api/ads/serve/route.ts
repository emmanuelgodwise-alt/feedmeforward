import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/ads/serve — Get Ad for a Video (what viewers see)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const placementType = searchParams.get('placementType');
    const viewerId = searchParams.get('userId') || undefined;

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    // Check if video exists
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: { id: true, creatorId: true },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Build placement query
    const placementWhere: Record<string, unknown> = {
      videoId,
      status: 'active',
      campaign: {
        status: 'active',
      },
    };

    if (placementType) {
      placementWhere.placementType = placementType;
    }

    // Find active placements for this video
    const placements = await db.adPlacement.findMany({
      where: placementWhere,
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            targetUrl: true,
            adType: true,
            cpmBid: true,
            cpcBid: true,
            budget: true,
            spent: true,
            impressions: true,
            targetingCriteria: true,
          },
        },
      },
    });

    if (placements.length === 0) {
      return NextResponse.json({ success: true, ad: null, message: 'No active ad placements for this video' });
    }

    // Filter placements with remaining budget
    const placementsWithBudget = placements.filter((p) => {
      const budgetRemaining = p.campaign.budget - p.campaign.spent;
      return budgetRemaining > 0;
    });

    if (placementsWithBudget.length === 0) {
      return NextResponse.json({ success: true, ad: null, message: 'All ad placements have exhausted budget' });
    }

    // Get viewer info for targeting
    let viewerAge: string | undefined;
    let viewerLocation: string | undefined;
    let viewerGender: string | undefined;

    if (viewerId) {
      const viewer = await db.user.findUnique({
        where: { id: viewerId },
        select: { ageRange: true, location: true, gender: true },
      });
      if (viewer) {
        viewerAge = viewer.ageRange || undefined;
        viewerLocation = viewer.location || undefined;
        viewerGender = viewer.gender || undefined;
      }
    }

    // Score each placement for targeting match
    const scoredPlacements = placementsWithBudget.map((placement) => {
      let score = 0;
      let targetingParsed: Record<string, unknown> | null = null;

      if (placement.campaign.targetingCriteria) {
        try {
          targetingParsed = JSON.parse(placement.campaign.targetingCriteria);
        } catch {
          // skip
        }
      }

      if (targetingParsed) {
        // Age match
        if (targetingParsed.age && viewerAge) {
          const targetAge = String(targetingParsed.age);
          if (viewerAge === targetAge) score += 3;
        }
        // Location match
        if (targetingParsed.location && viewerLocation) {
          const targetLoc = String(targetingParsed.location).toLowerCase();
          if (viewerLocation.toLowerCase().includes(targetLoc)) score += 3;
        }
        // Gender match
        if (targetingParsed.gender && viewerGender) {
          if (String(targetingParsed.gender).toLowerCase() === viewerGender.toLowerCase()) score += 2;
        }
      }

      // Prefer higher CPM bids (advertiser willing to pay more)
      score += placement.campaign.cpmBid;

      // Prefer campaigns with more remaining budget
      const budgetRemaining = placement.campaign.budget - placement.campaign.spent;
      score += Math.min(budgetRemaining / 100, 5);

      return { placement, score };
    });

    // Sort by score descending
    scoredPlacements.sort((a, b) => b.score - a.score);

    const bestPlacement = scoredPlacements[0].placement;
    const campaign = bestPlacement.campaign;

    // Calculate impression revenue (CPM based)
    const impressionRevenue = campaign.cpmBid / 1000;

    // Record impression and update counters in a transaction
    const impression = await db.$transaction(async (tx) => {
      // Create impression record
      const imp = await tx.adImpression.create({
        data: {
          campaignId: campaign.id,
          placementId: bestPlacement.id,
          videoId,
          viewerId: viewerId || null,
          viewerAge: viewerAge || null,
          viewerLocation: viewerLocation || null,
          viewerGender: viewerGender || null,
          adType: campaign.adType,
          revenue: impressionRevenue,
        },
      });

      // Update campaign counters
      await tx.adCampaign.update({
        where: { id: campaign.id },
        data: {
          impressions: { increment: 1 },
          spent: { increment: impressionRevenue },
        },
      });

      // Update placement counters
      await tx.adPlacement.update({
        where: { id: bestPlacement.id },
        data: {
          impressions: { increment: 1 },
          revenueEarned: { increment: impressionRevenue },
        },
      });

      return imp;
    });

    // Fire-and-forget: distribute revenue for this impression
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/api/ads/distribute-revenue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        videoId,
        amount: impressionRevenue,
        impressionId: impression.id,
      }),
    }).catch((err) => console.error('Revenue distribution failed:', err));

    // Check if campaign budget is now exhausted
    const updatedCampaign = await db.adCampaign.findUnique({
      where: { id: campaign.id },
      select: { budget: true, spent: true, status: true },
    });

    if (updatedCampaign && updatedCampaign.spent >= updatedCampaign.budget && updatedCampaign.status === 'active') {
      await db.adCampaign.update({
        where: { id: campaign.id },
        data: { status: 'exhausted' },
      });
      // Also pause all placements
      await db.adPlacement.updateMany({
        where: { campaignId: campaign.id, status: 'active' },
        data: { status: 'paused' },
      });
    }

    let targetingCriteriaParsed = null;
    if (campaign.targetingCriteria) {
      try {
        targetingCriteriaParsed = JSON.parse(campaign.targetingCriteria);
      } catch {
        // skip
      }
    }

    return NextResponse.json({
      success: true,
      ad: {
        campaignId: campaign.id,
        placementId: bestPlacement.id,
        impressionId: impression.id,
        title: campaign.title,
        description: campaign.description,
        imageUrl: campaign.imageUrl,
        targetUrl: campaign.targetUrl,
        adType: campaign.adType,
        placementType: bestPlacement.placementType,
        targetingCriteria: targetingCriteriaParsed,
      },
    });
  } catch (error) {
    console.error('GET /api/ads/serve error:', error);
    return NextResponse.json({ error: 'Failed to serve ad' }, { status: 500 });
  }
}

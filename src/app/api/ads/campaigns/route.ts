import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/ads/campaigns — Create Ad Campaign
export async function POST(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      imageUrl,
      targetUrl,
      adType,
      budget,
      cpmBid,
      cpcBid,
      targetingCriteria,
      startsAt,
      endsAt,
    } = body as {
      title?: string;
      description?: string;
      imageUrl?: string;
      targetUrl?: string;
      adType?: string;
      budget?: number;
      cpmBid?: number;
      cpcBid?: number;
      targetingCriteria?: Record<string, unknown>;
      startsAt?: string;
      endsAt?: string;
    };

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!targetUrl || typeof targetUrl !== 'string') {
      return NextResponse.json({ error: 'Target URL is required' }, { status: 400 });
    }
    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: 'Target URL must be a valid URL' }, { status: 400 });
    }
    if (!budget || typeof budget !== 'number' || budget <= 0) {
      return NextResponse.json({ error: 'Budget must be a positive number' }, { status: 400 });
    }
    if (budget < 5) {
      return NextResponse.json({ error: 'Minimum budget is $5.00' }, { status: 400 });
    }

    const validAdTypes = ['banner', 'pre_roll', 'post_vote'];
    const finalAdType = adType && validAdTypes.includes(adType) ? adType : 'banner';

    // Validate optional bid values
    if (cpmBid !== undefined && (typeof cpmBid !== 'number' || cpmBid < 0)) {
      return NextResponse.json({ error: 'CPM bid must be a non-negative number' }, { status: 400 });
    }
    if (cpcBid !== undefined && (typeof cpcBid !== 'number' || cpcBid < 0)) {
      return NextResponse.json({ error: 'CPC bid must be a non-negative number' }, { status: 400 });
    }

    // Parse dates
    let parsedStartsAt: Date | undefined;
    let parsedEndsAt: Date | undefined;
    if (startsAt) {
      parsedStartsAt = new Date(startsAt);
      if (isNaN(parsedStartsAt.getTime())) {
        return NextResponse.json({ error: 'Invalid startsAt date' }, { status: 400 });
      }
    }
    if (endsAt) {
      parsedEndsAt = new Date(endsAt);
      if (isNaN(parsedEndsAt.getTime())) {
        return NextResponse.json({ error: 'Invalid endsAt date' }, { status: 400 });
      }
      if (parsedStartsAt && parsedEndsAt <= parsedStartsAt) {
        return NextResponse.json({ error: 'endsAt must be after startsAt' }, { status: 400 });
      }
    }

    // Check user balance
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, walletBalance: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.walletBalance < budget) {
      return NextResponse.json(
        { error: `Insufficient balance. Current balance: $${user.walletBalance.toFixed(2)}, required: $${budget.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Determine initial status
    const now = new Date();
    const initialStatus = (!parsedStartsAt || parsedStartsAt <= now) ? 'active' : 'draft';

    // Create campaign and transaction atomically
    const campaign = await db.$transaction(async (tx) => {
      // Deduct budget from wallet
      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: budget } },
      });

      // Create budget transaction
      await tx.transaction.create({
        data: {
          userId,
          amount: -budget,
          type: 'withdrawal',
          status: 'completed',
          description: `Ad campaign budget: ${title.trim()}`,
        },
      });

      // Create the campaign
      return tx.adCampaign.create({
        data: {
          advertiserId: userId,
          title: title.trim(),
          description: description?.trim() || null,
          imageUrl: imageUrl || null,
          targetUrl,
          adType: finalAdType,
          budget,
          spent: 0,
          cpmBid: cpmBid ?? 2.0,
          cpcBid: cpcBid ?? 0.50,
          status: initialStatus,
          targetingCriteria: targetingCriteria ? JSON.stringify(targetingCriteria) : null,
          startsAt: parsedStartsAt || now,
          endsAt: parsedEndsAt || null,
        },
      });
    });

    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error) {
    console.error('POST /api/ads/campaigns error:', error);
    return NextResponse.json({ error: 'Failed to create ad campaign' }, { status: 500 });
  }
}

// GET /api/ads/campaigns — List Advertiser's Campaigns
export async function GET(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { advertiserId: userId };
    if (status) {
      const validStatuses = ['draft', 'active', 'paused', 'exhausted', 'completed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
      }
      where.status = status;
    }

    const campaigns = await db.adCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            placements: true,
            adImpressions: true,
            adClicks: true,
            revenueShares: true,
          },
        },
      },
    });

    const campaignsWithStats = campaigns.map((c) => {
      const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100) : 0;
      const budgetRemaining = Math.max(0, c.budget - c.spent);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        imageUrl: c.imageUrl,
        targetUrl: c.targetUrl,
        adType: c.adType,
        budget: c.budget,
        spent: Math.round(c.spent * 100) / 100,
        budgetRemaining: Math.round(budgetRemaining * 100) / 100,
        cpmBid: c.cpmBid,
        cpcBid: c.cpcBid,
        impressions: c.impressions,
        clicks: c.clicks,
        conversions: c.conversions,
        ctr: Math.round(ctr * 100) / 100,
        status: c.status,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        placementCount: c._count.placements,
      };
    });

    return NextResponse.json({ success: true, data: campaignsWithStats });
  } catch (error) {
    console.error('GET /api/ads/campaigns error:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

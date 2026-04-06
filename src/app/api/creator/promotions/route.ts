import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/creator/promotions — list creator's promotions
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const promotions = await db.promotedVideo.findMany({
      where: { creatorId: userId },
      include: {
        video: {
          select: { id: true, title: true, thumbnailUrl: true, viewCount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const promotionsWithStats = promotions.map((p) => ({
      id: p.id,
      videoId: p.videoId,
      video: p.video,
      budget: p.budget,
      spent: Math.round(p.spent * 100) / 100,
      remaining: Math.round((p.budget - p.spent) * 100) / 100,
      impressions: p.impressions,
      clicks: p.clicks,
      ctr: p.impressions > 0 ? Math.round((p.clicks / p.impressions) * 10000) / 100 : 0,
      status: p.status,
      startsAt: p.startsAt.toISOString(),
      endsAt: p.endsAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
    }));

    // Check for exhausted promotions and update status
    const now = new Date();
    const toUpdate = promotions.filter(
      (p) => p.status === 'active' && (p.spent >= p.budget || (p.endsAt && p.endsAt <= now))
    );

    for (const p of toUpdate) {
      const newStatus = p.spent >= p.budget ? 'exhausted' : 'expired';
      await db.promotedVideo.update({
        where: { id: p.id },
        data: { status: newStatus },
      });
    }

    return NextResponse.json({ promotions: promotionsWithStats });
  } catch (error) {
    console.error('GET /api/creator/promotions error:', error);
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
  }
}

// PATCH /api/creator/promotions — pause/resume a promotion
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body as { id?: string; status?: 'active' | 'paused' };

    if (!id) {
      return NextResponse.json({ error: 'Promotion ID is required' }, { status: 400 });
    }
    if (!status || !['active', 'paused'].includes(status)) {
      return NextResponse.json({ error: 'Status must be "active" or "paused"' }, { status: 400 });
    }

    // Verify the promotion belongs to this creator
    const promotion = await db.promotedVideo.findUnique({
      where: { id },
      select: { creatorId: true, status: true },
    });

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    if (promotion.creatorId !== userId) {
      return NextResponse.json({ error: 'Not authorized to manage this promotion' }, { status: 403 });
    }

    if (promotion.status === 'exhausted' || promotion.status === 'expired') {
      return NextResponse.json({ error: `Cannot modify promotion with status: ${promotion.status}` }, { status: 400 });
    }

    const updated = await db.promotedVideo.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      promotion: {
        id: updated.id,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error('PATCH /api/creator/promotions error:', error);
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 });
  }
}

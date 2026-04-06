import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/creator/promote — promote a video
export async function POST(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, budget, targetingCriteria, durationDays } = body as {
      videoId?: string;
      budget?: number;
      targetingCriteria?: string;
      durationDays?: number;
    };

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }
    if (!budget || typeof budget !== 'number' || budget <= 0) {
      return NextResponse.json({ error: 'Budget must be a positive number' }, { status: 400 });
    }

    // Check video exists and user is creator
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: { id: true, creatorId: true, title: true },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (video.creatorId !== userId) {
      return NextResponse.json({ error: 'Only the video creator can promote it' }, { status: 403 });
    }

    // Check if already promoted
    const existingPromo = await db.promotedVideo.findUnique({
      where: { videoId },
    });

    if (existingPromo) {
      return NextResponse.json({ error: 'Video is already promoted' }, { status: 400 });
    }

    // Check user balance
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (budget > user.walletBalance) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const days = durationDays || 7;
    const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Create promotion and deduct budget in a transaction
    const [promotion, updatedUser] = await db.$transaction([
      db.promotedVideo.create({
        data: {
          videoId,
          creatorId: userId,
          budget,
          targetingCriteria: targetingCriteria || null,
          endsAt,
          status: 'active',
        },
        include: {
          video: {
            select: { id: true, title: true, thumbnailUrl: true },
          },
        },
      }),
      db.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: budget } },
        select: { walletBalance: true },
      }),
    ]);

    // Create withdrawal transaction record
    await db.transaction.create({
      data: {
        userId,
        amount: budget,
        type: 'withdrawal',
        status: 'completed',
        description: `Promoted video: ${video.title}`,
        referenceId: videoId,
      },
    });

    return NextResponse.json({
      success: true,
      promotion: {
        id: promotion.id,
        videoId: promotion.videoId,
        budget: promotion.budget,
        spent: promotion.spent,
        impressions: promotion.impressions,
        clicks: promotion.clicks,
        status: promotion.status,
        startsAt: promotion.startsAt.toISOString(),
        endsAt: promotion.endsAt?.toISOString() || null,
        remaining: Math.round((promotion.budget - promotion.spent) * 100) / 100,
      },
    });
  } catch (error) {
    console.error('POST /api/creator/promote error:', error);
    return NextResponse.json({ error: 'Failed to promote video' }, { status: 500 });
  }
}

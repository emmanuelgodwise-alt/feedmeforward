import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId } = body as { videoId?: string };

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    // Get video with creator info and counts
    const video = await db.video.findUnique({
      where: { id: videoId },
      include: {
        creator: {
          select: { id: true, isVerified: true, username: true },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            responses: true,
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (video.creatorId !== userId) {
      return NextResponse.json({ error: 'Only the video creator can claim revenue' }, { status: 403 });
    }

    // Revenue calculation
    const viewCount = video.viewCount;
    const likeCount = video._count.likes;
    const commentCount = video._count.comments;
    const responseCount = video._count.responses;

    // Base revenue: 1 cent per view
    const baseRevenue = viewCount * 0.01;

    // Engagement multiplier
    const engagementMultiplier =
      1 + (likeCount * 0.1 + commentCount * 0.2 + responseCount * 0.3) / 100;

    // Creator bonus
    const creatorBonus = video.creator.isVerified ? 1.5 : 1.0;

    // Final revenue
    let finalRevenue = baseRevenue * engagementMultiplier * creatorBonus;

    // Cap at $50
    finalRevenue = Math.min(finalRevenue, 50);

    // Round to 2 decimal places
    finalRevenue = Math.round(finalRevenue * 100) / 100;

    if (finalRevenue <= 0) {
      return NextResponse.json({
        success: true,
        revenue: 0,
        newBalance: video.creator.isVerified ? undefined : undefined,
        breakdown: {
          baseRevenue: Math.round(baseRevenue * 100) / 100,
          engagementMultiplier: Math.round(engagementMultiplier * 100) / 100,
          creatorBonus,
        },
      });
    }

    // Get current user balance
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create earning transaction
    const transaction = await db.transaction.create({
      data: {
        userId,
        amount: finalRevenue,
        type: 'earning',
        status: 'completed',
        description: `Ad revenue for video: ${video.title}`,
        referenceId: videoId,
      },
    });

    // Update user balance
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: finalRevenue } },
      select: { walletBalance: true },
    });

    return NextResponse.json({
      success: true,
      revenue: finalRevenue,
      newBalance: Math.round(updatedUser.walletBalance * 100) / 100,
      breakdown: {
        baseRevenue: Math.round(baseRevenue * 100) / 100,
        engagementMultiplier: Math.round(engagementMultiplier * 100) / 100,
        creatorBonus,
      },
    });
  } catch (error) {
    console.error('Revenue claim error:', error);
    return NextResponse.json({ error: 'Failed to claim ad revenue' }, { status: 500 });
  }
}

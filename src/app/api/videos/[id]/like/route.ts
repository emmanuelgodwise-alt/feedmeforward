import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { recalculateScore } from '@/lib/score-engine';
import { createNotification } from '@/lib/notifications';

// POST /api/videos/[id]/like — Like a video
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: videoId } = await params;

    // Check video exists
    const video = await db.video.findUnique({ where: { id: videoId } });
    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    // Create like (unique constraint handles duplicates)
    const like = await db.like.create({
      data: { userId, videoId },
    });

    // Trigger score recalculation for the video creator (fire and forget)
    recalculateScore(video.creatorId).catch((err) => console.error('Score recalc failed:', err));

    // Create notification for video creator (only if not liking own video)
    if (video.creatorId !== userId) {
      createNotification({
        userId: video.creatorId,
        fromUserId: userId,
        type: 'like',
        videoId,
      });
    }

    return NextResponse.json({ success: true, data: like });
  } catch (error: unknown) {
    // Handle unique constraint violation (already liked)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ success: true, message: 'Already liked' });
    }
    console.error('POST /api/videos/[id]/like error:', error);
    return NextResponse.json({ success: false, error: 'Failed to like video' }, { status: 500 });
  }
}

// DELETE /api/videos/[id]/like — Unlike a video
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: videoId } = await params;

    const like = await db.like.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });

    if (!like) {
      return NextResponse.json({ success: true, message: 'Not liked' });
    }

    await db.like.delete({ where: { id: like.id } });

    return NextResponse.json({ success: true, message: 'Unliked' });
  } catch (error) {
    console.error('DELETE /api/videos/[id]/like error:', error);
    return NextResponse.json({ success: false, error: 'Failed to unlike video' }, { status: 500 });
  }
}

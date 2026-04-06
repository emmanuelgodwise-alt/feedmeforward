import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/circles/[id]/videos/[videoId] — Share video to circle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> },
) {
  try {
    const { id, videoId } = await params;
    const userId = request.headers.get('X-User-Id');

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check circle exists and user is a member
    const circle = await db.circle.findUnique({ where: { id } });
    if (!circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 });
    }

    const membership = await db.circleMember.findUnique({
      where: { circleId_userId: { circleId: id, userId } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Only members can share videos' }, { status: 403 });
    }

    // Check video exists
    const video = await db.video.findUnique({ where: { id: videoId } });
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Check if already shared
    const existing = await db.circleVideo.findUnique({
      where: { circleId_videoId: { circleId: id, videoId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Video already shared in this circle' }, { status: 409 });
    }

    const circleVideo = await db.circleVideo.create({
      data: {
        circleId: id,
        videoId,
        sharedBy: userId,
      },
      include: {
        video: {
          include: {
            creator: {
              select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
            },
            _count: { select: { likes: true, comments: true, polls: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, circleVideo }, { status: 201 });
  } catch (error) {
    console.error('Error sharing video:', error);
    return NextResponse.json({ error: 'Failed to share video' }, { status: 500 });
  }
}

// DELETE /api/circles/[id]/videos/[videoId] — Remove video from circle
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> },
) {
  try {
    const { id, videoId } = await params;
    const userId = request.headers.get('X-User-Id');

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const circleVideo = await db.circleVideo.findUnique({
      where: { circleId_videoId: { circleId: id, videoId } },
    });

    if (!circleVideo) {
      return NextResponse.json({ error: 'Video not shared in this circle' }, { status: 404 });
    }

    // Only the sharer or admin can remove
    if (circleVideo.sharedBy !== userId) {
      const membership = await db.circleMember.findUnique({
        where: { circleId_userId: { circleId: id, userId } },
      });
      if (!membership || (membership.role !== 'admin' && membership.role !== 'moderator')) {
        return NextResponse.json({ error: 'Only the sharer or admins can remove videos' }, { status: 403 });
      }
    }

    await db.circleVideo.delete({
      where: { circleId_videoId: { circleId: id, videoId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing video:', error);
    return NextResponse.json({ error: 'Failed to remove video' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/videos/[id]/repost — Toggle repost
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, quote } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }

    // Check video exists
    const video = await db.video.findUnique({ where: { id } });
    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    // Check if repost already exists
    const existing = await db.repost.findUnique({
      where: { userId_videoId: { userId, videoId: id } },
    });

    let reposted: boolean;

    if (existing) {
      // Remove repost (un-repost)
      await db.repost.delete({ where: { id: existing.id } });
      reposted = false;
    } else {
      // Create repost
      await db.repost.create({
        data: {
          userId,
          videoId: id,
          quote: quote || null,
        },
      });
      reposted = true;

      // Create notification for video creator (not for self-repost)
      if (userId !== video.creatorId) {
        const reposterUser = await db.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });
        const username = reposterUser?.username || 'Someone';
        await db.notification.create({
          data: {
            userId: video.creatorId,
            fromUserId: userId,
            type: 'repost',
            videoId: id,
            title: 'New Repost',
            message: `@${username} reposted your video "${video.title}"`,
          },
        });
      }
    }

    const repostCount = await db.repost.count({ where: { videoId: id } });

    return NextResponse.json({ success: true, reposted, repostCount });
  } catch (error) {
    console.error('POST /api/videos/[id]/repost error:', error);
    return NextResponse.json({ success: false, error: 'Failed to toggle repost' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/stories/[id] — Get single story
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('X-User-Id');

    const story = await db.story.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ success: false, error: 'Story not found' }, { status: 404 });
    }

    // Check if expired
    if (story.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'Story has expired' }, { status: 410 });
    }

    // Mark as viewed
    if (userId) {
      const viewers: string[] = JSON.parse(story.viewers);
      if (!viewers.includes(userId)) {
        viewers.push(userId);
        await db.story.update({
          where: { id },
          data: { viewers: JSON.stringify(viewers), viewCount: { increment: 1 } },
        });
      }
    }

    return NextResponse.json({
      success: true,
      story: {
        id: story.id,
        type: story.type,
        text: story.text,
        imageUrl: story.imageUrl,
        videoUrl: story.videoUrl,
        viewCount: story.viewCount,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        creator: story.creator,
      },
    });
  } catch (error) {
    console.error('GET /api/stories/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch story' }, { status: 500 });
  }
}

// DELETE /api/stories/[id] — Delete story (creator only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('X-User-Id');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const story = await db.story.findUnique({ where: { id } });
    if (!story) {
      return NextResponse.json({ success: false, error: 'Story not found' }, { status: 404 });
    }

    if (story.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can delete this story' }, { status: 403 });
    }

    await db.story.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/stories/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete story' }, { status: 500 });
  }
}

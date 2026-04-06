import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/videos/[id] — Get single video with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');

    const video = await db.video.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, username: true, isVerified: true } },
        polls: {
          include: {
            votes: userId ? { where: { userId } } : false,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { likes: true, comments: true, responses: true },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    // Check if user liked this video
    let isLiked = false;
    if (userId) {
      const like = await db.like.findUnique({
        where: { userId_videoId: { userId, videoId: id } },
      });
      isLiked = !!like;
    }

    // Increment view count
    await db.video.update({ where: { id }, data: { viewCount: { increment: 1 } } });

    const pollsParsed = video.polls.map((poll) => {
      const options = JSON.parse(poll.options);
      const userVote = poll.votes?.[0];
      let targetingCriteria = null;
      if (poll.targetingCriteria) {
        try { targetingCriteria = JSON.parse(poll.targetingCriteria); } catch { /* skip */ }
      }
      return {
        id: poll.id,
        videoId: poll.videoId,
        question: poll.question,
        options,
        isPaid: poll.isPaid,
        rewardPerResponse: poll.rewardPerResponse,
        responseCount: poll.responseCount,
        closesAt: poll.closesAt,
        userVoted: !!userVote,
        userVoteOptionId: userVote?.optionId || null,
        targetingCriteria,
      };
    });

    const result = {
      ...video,
      tags: video.tags ? JSON.parse(video.tags) : null,
      polls: pollsParsed,
      likeCount: video._count.likes,
      commentCount: video._count.comments,
      responseCount: video._count.responses,
      isLiked,
      viewCount: video.viewCount + 1,
    };

    // Remove internal fields
    const { _count, votes, ...cleanResult } = result as Record<string, unknown>;
    void _count;
    void votes;

    return NextResponse.json({ success: true, data: cleanResult });
  } catch (error) {
    console.error('GET /api/videos/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch video' }, { status: 500 });
  }
}

// PATCH /api/videos/[id] — Update video
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, category, tags, status } = body;

    const existing = await db.video.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }
    if (existing.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can update this video' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category || null;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) && tags.length > 0 ? JSON.stringify(tags) : null;
    if (status !== undefined && ['active', 'expired', 'answered'].includes(status)) {
      updateData.status = status;
    }

    const video = await db.video.update({
      where: { id },
      data: updateData,
      include: { creator: { select: { id: true, username: true } } },
    });

    return NextResponse.json({ success: true, data: { ...video, tags: video.tags ? JSON.parse(video.tags) : null } });
  } catch (error) {
    console.error('PATCH /api/videos/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update video' }, { status: 500 });
  }
}

// DELETE /api/videos/[id] — Delete video
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.video.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }
    if (existing.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can delete this video' }, { status: 403 });
    }

    await db.video.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/videos/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete video' }, { status: 500 });
  }
}

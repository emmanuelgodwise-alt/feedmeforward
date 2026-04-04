import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { recalculateScore } from '@/lib/score-engine';

// GET /api/videos/[id]/comments — Get comments for a video
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Check video exists
    const video = await db.video.findUnique({ where: { id: videoId } });
    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    const [comments, total] = await Promise.all([
      db.comment.findMany({
        where: { videoId, parentCommentId: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, isVerified: true } },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: { id: true, username: true, isVerified: true } },
            },
          },
          _count: { select: { likes: true } },
        },
      }),
      db.comment.count({ where: { videoId, parentCommentId: null } }),
    ]);

    return NextResponse.json({
      success: true,
      data: comments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/videos/[id]/comments error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST /api/videos/[id]/comments — Create comment
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
    const body = await request.json();
    const { content, parentCommentId } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Comment content is required' }, { status: 400 });
    }

    // Check video exists
    const video = await db.video.findUnique({ where: { id: videoId } });
    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    // If replying to a comment, verify parent exists and belongs to same video
    if (parentCommentId) {
      const parentComment = await db.comment.findUnique({ where: { id: parentCommentId } });
      if (!parentComment || parentComment.videoId !== videoId) {
        return NextResponse.json({ success: false, error: 'Parent comment not found' }, { status: 404 });
      }
    }

    const comment = await db.comment.create({
      data: {
        userId,
        videoId,
        content: content.trim(),
        parentCommentId: parentCommentId || null,
      },
      include: {
        user: { select: { id: true, username: true, isVerified: true } },
      },
    });

    // Trigger score recalculation for the commenter (fire and forget)
    recalculateScore(userId).catch((err) => console.error('Score recalc failed:', err));

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error) {
    console.error('POST /api/videos/[id]/comments error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create comment' }, { status: 500 });
  }
}

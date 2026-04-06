import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/comments/[id] — Get a single comment by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const userId = request.headers.get('X-User-Id');

    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
    }

    // Check if current user liked this comment
    let isLiked = false;
    if (userId) {
      const like = await db.commentLike.findUnique({
        where: {
          commentId_userId: {
            commentId,
            userId,
          },
        },
      });
      isLiked = !!like;
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        videoId: comment.videoId,
        parentCommentId: comment.parentCommentId,
        isVideoReply: comment.isVideoReply,
        videoReplyUrl: comment.videoReplyUrl,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        user: comment.user,
        likeCount: comment._count.likes,
        replyCount: comment._count.replies,
        isLiked,
      },
    });
  } catch (error) {
    console.error('GET /api/comments/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch comment' }, { status: 500 });
  }
}

// PATCH /api/comments/[id] — Update comment content
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: commentId } = await params;
    const body = await request.json();
    const { content } = body as { content?: string };

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Comment content is required' }, { status: 400 });
    }

    // Find the comment and verify ownership
    const existingComment = await db.comment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true },
    });

    if (!existingComment) {
      return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
    }

    if (existingComment.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only edit your own comments' },
        { status: 403 }
      );
    }

    // Update the comment
    const updatedComment = await db.comment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        user: {
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

    return NextResponse.json(
      {
        success: true,
        comment: {
          id: updatedComment.id,
          content: updatedComment.content,
          videoId: updatedComment.videoId,
          parentCommentId: updatedComment.parentCommentId,
          isVideoReply: updatedComment.isVideoReply,
          videoReplyUrl: updatedComment.videoReplyUrl,
          createdAt: updatedComment.createdAt.toISOString(),
          updatedAt: updatedComment.updatedAt.toISOString(),
          user: updatedComment.user,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH /api/comments/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update comment' }, { status: 500 });
  }
}

// DELETE /api/comments/[id] — Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: commentId } = await params;

    // Find the comment and verify ownership
    const existingComment = await db.comment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true },
    });

    if (!existingComment) {
      return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
    }

    if (existingComment.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own comments' },
        { status: 403 }
      );
    }

    // Delete the comment (Prisma cascade will handle replies)
    await db.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/comments/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete comment' }, { status: 500 });
  }
}

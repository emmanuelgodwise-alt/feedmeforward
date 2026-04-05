import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const VALID_REASONS = ['offensive', 'spam', 'misleading', 'other'] as const;
const VALID_TARGET_TYPES = ['video', 'comment'] as const;

// POST /api/reports — Create a report for a video or comment
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { targetId, targetType, reason, description } = body as {
      targetId?: string;
      targetType?: string;
      reason?: string;
      description?: string;
    };

    // Validate required fields
    if (!targetId || typeof targetId !== 'string') {
      return NextResponse.json({ success: false, error: 'targetId is required' }, { status: 400 });
    }

    if (!targetType || !VALID_TARGET_TYPES.includes(targetType as typeof VALID_TARGET_TYPES[number])) {
      return NextResponse.json(
        { success: false, error: 'targetType must be "video" or "comment"' },
        { status: 400 }
      );
    }

    if (!reason || !VALID_REASONS.includes(reason as typeof VALID_REASONS[number])) {
      return NextResponse.json(
        { success: false, error: 'reason must be one of: offensive, spam, misleading, other' },
        { status: 400 }
      );
    }

    // Build the report data based on targetType
    let videoId: string | null = null;
    let commentId: string | null = null;
    let targetCreatorId: string | null = null;

    if (targetType === 'video') {
      const video = await db.video.findUnique({
        where: { id: targetId },
        select: { id: true, creatorId: true },
      });
      if (!video) {
        return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
      }
      videoId = video.id;
      targetCreatorId = video.creatorId;
    } else {
      const comment = await db.comment.findUnique({
        where: { id: targetId },
        select: { id: true, userId: true },
      });
      if (!comment) {
        return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
      }
      commentId = comment.id;
      targetCreatorId = comment.userId;
    }

    // Cannot report own content
    if (targetCreatorId === userId) {
      return NextResponse.json(
        { success: false, error: 'You cannot report your own content' },
        { status: 400 }
      );
    }

    // Check for duplicate report (same reporter + same target)
    const duplicateWhere: Record<string, unknown> = { reporterId: userId };
    if (videoId) {
      duplicateWhere.videoId = videoId;
      duplicateWhere.commentId = null;
    } else {
      duplicateWhere.commentId = commentId;
      duplicateWhere.videoId = null;
    }

    const existingReport = await db.report.findFirst({ where: duplicateWhere });
    if (existingReport) {
      return NextResponse.json(
        { success: false, error: 'You have already reported this content' },
        { status: 409 }
      );
    }

    // Create the report
    const report = await db.report.create({
      data: {
        reporterId: userId,
        videoId,
        commentId,
        reason,
        description: description?.trim() || null,
        status: 'pending',
      },
      include: {
        reporter: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        video: videoId
          ? { select: { id: true, title: true, thumbnailUrl: true } }
          : false,
        comment: commentId
          ? {
              select: {
                id: true,
                content: true,
                user: { select: { id: true, username: true } },
              },
            }
          : false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        report: {
          id: report.id,
          reporterId: report.reporterId,
          videoId: report.videoId,
          commentId: report.commentId,
          reason: report.reason,
          description: report.description,
          status: report.status,
          createdAt: report.createdAt.toISOString(),
          reporter: report.reporter,
          video: report.video ?? undefined,
          comment: report.comment ?? undefined,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/reports error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create report' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const VALID_ACTIONS = ['reviewing', 'resolved', 'dismissed'] as const;

// PATCH /api/reports/[id]/moderate — Moderate a report (admin/moderator only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Verify user is moderator or admin
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Access denied. Moderator or admin required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, note } = body as { action?: string; note?: string };

    if (!action || !VALID_ACTIONS.includes(action as typeof VALID_ACTIONS[number])) {
      return NextResponse.json(
        { success: false, error: 'action must be one of: reviewing, resolved, dismissed' },
        { status: 400 }
      );
    }

    // Find the report
    const report = await db.report.findUnique({
      where: { id },
      include: {
        video: { select: { id: true } },
        comment: { select: { id: true } },
      },
    });

    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: action,
    };

    if (action === 'resolved' || action === 'dismissed') {
      updateData.resolvedAt = new Date();
    }

    // If resolved, optionally delete the reported content
    if (action === 'resolved') {
      if (report.videoId) {
        await db.video.delete({ where: { id: report.videoId } }).catch(() => {
          // Video may have already been deleted
        });
      }
      if (report.commentId) {
        await db.comment.delete({ where: { id: report.commentId } }).catch(() => {
          // Comment may have already been deleted
        });
      }
    }

    // Add moderator note to juryVotes JSON
    let juryVotes: Array<{ userId: string; vote: string; createdAt: string; note?: string }> = [];
    if (report.juryVotes) {
      try {
        juryVotes = JSON.parse(report.juryVotes);
      } catch {
        juryVotes = [];
      }
    }
    juryVotes.push({
      userId,
      vote: action,
      createdAt: new Date().toISOString(),
      note: note?.trim() || undefined,
    });
    updateData.juryVotes = JSON.stringify(juryVotes);

    const updatedReport = await db.report.update({
      where: { id },
      data: updateData,
      include: {
        reporter: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        video: {
          select: { id: true, title: true, thumbnailUrl: true },
        },
        comment: {
          select: {
            id: true,
            content: true,
            user: { select: { id: true, username: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      report: {
        id: updatedReport.id,
        reporterId: updatedReport.reporterId,
        videoId: updatedReport.videoId,
        commentId: updatedReport.commentId,
        reason: updatedReport.reason,
        description: updatedReport.description,
        status: updatedReport.status,
        juryVotes: updatedReport.juryVotes,
        createdAt: updatedReport.createdAt.toISOString(),
        resolvedAt: updatedReport.resolvedAt?.toISOString() || null,
        reporter: updatedReport.reporter,
        video: updatedReport.video ?? undefined,
        comment: updatedReport.comment ?? undefined,
        targetType: updatedReport.videoId ? 'video' : 'comment',
      },
    });
  } catch (error) {
    console.error('PATCH /api/reports/[id]/moderate error:', error);
    return NextResponse.json({ success: false, error: 'Failed to moderate report' }, { status: 500 });
  }
}

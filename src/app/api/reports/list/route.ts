import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const VALID_STATUSES = ['pending', 'reviewing', 'resolved', 'dismissed'];

// GET /api/reports/list — List all reports (admin/moderator only)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    // Get stats (parallel)
    const [reports, total, pendingCount, reviewingCount, resolvedCount, dismissedCount] = await Promise.all([
      db.report.findMany({
        where,
        include: {
          reporter: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          video: {
            select: { id: true, title: true, thumbnailUrl: true, creatorId: true },
          },
          comment: {
            select: {
              id: true,
              content: true,
              userId: true,
              user: { select: { id: true, username: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.report.count({ where }),
      db.report.count({ where: { status: 'pending' } }),
      db.report.count({ where: { status: 'reviewing' } }),
      db.report.count({ where: { status: 'resolved' } }),
      db.report.count({ where: { status: 'dismissed' } }),
    ]);

    return NextResponse.json({
      success: true,
      reports: reports.map((r) => ({
        id: r.id,
        reporterId: r.reporterId,
        videoId: r.videoId,
        commentId: r.commentId,
        reason: r.reason,
        description: r.description,
        status: r.status,
        juryVotes: r.juryVotes,
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() || null,
        reporter: r.reporter,
        video: r.video ?? undefined,
        comment: r.comment ?? undefined,
        targetType: r.videoId ? 'video' : 'comment',
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        pending: pendingCount,
        reviewing: reviewingCount,
        resolved: resolvedCount,
        dismissed: dismissedCount,
      },
    });
  } catch (error) {
    console.error('GET /api/reports/list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reports' }, { status: 500 });
  }
}

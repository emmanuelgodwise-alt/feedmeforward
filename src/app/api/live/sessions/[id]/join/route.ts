import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/live/sessions/[id]/join — Viewer joins
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const session = await db.liveSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'live') {
      return NextResponse.json({ success: false, error: 'Session is not live' }, { status: 400 });
    }

    // Upsert viewer
    const viewer = await db.liveViewer.upsert({
      where: {
        sessionId_userId: { sessionId: id, userId },
      },
      create: {
        sessionId: id,
        userId,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      },
      update: {
        lastActiveAt: new Date(),
      },
    });

    // Increment viewer count
    const newCount = await db.liveSession.update({
      where: { id },
      data: {
        viewerCount: { increment: 1 },
        totalViewCount: { increment: 1 },
        peakViewers: session.viewerCount >= session.peakViewers
          ? { increment: 1 }
          : undefined,
      },
    }).then(s => s.viewerCount);

    // Read existing viewers count to be accurate
    const updatedSession = await db.liveSession.findUnique({ where: { id } });

    return NextResponse.json({
      success: true,
      viewerCount: updatedSession?.viewerCount ?? session.viewerCount,
      status: session.status,
      sessionId: id,
    });
  } catch (error) {
    console.error('Join live session error:', error);
    return NextResponse.json({ success: false, error: 'Failed to join session' }, { status: 500 });
  }
}

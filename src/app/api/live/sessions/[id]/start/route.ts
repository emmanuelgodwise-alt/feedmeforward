import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/live/sessions/[id]/start — Start streaming
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

    if (session.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can start the stream' }, { status: 403 });
    }

    if (session.status === 'live') {
      return NextResponse.json({ success: false, error: 'Session is already live' }, { status: 400 });
    }

    const updated = await db.liveSession.update({
      where: { id },
      data: {
        status: 'live',
        startedAt: new Date(),
      },
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
      },
    });

    return NextResponse.json({ success: true, session: updated });
  } catch (error) {
    console.error('Start live session error:', error);
    return NextResponse.json({ success: false, error: 'Failed to start session' }, { status: 500 });
  }
}

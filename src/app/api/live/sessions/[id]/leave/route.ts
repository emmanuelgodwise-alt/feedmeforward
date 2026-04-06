import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/live/sessions/[id]/leave — Viewer leaves
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

    // Delete viewer record
    try {
      await db.liveViewer.delete({
        where: {
          sessionId_userId: { sessionId: id, userId },
        },
      });

      // Decrement viewer count
      await db.liveSession.update({
        where: { id },
        data: { viewerCount: { decrement: 1 } },
      });
    } catch {
      // Viewer record might not exist — ignore
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leave live session error:', error);
    return NextResponse.json({ success: false, error: 'Failed to leave session' }, { status: 500 });
  }
}

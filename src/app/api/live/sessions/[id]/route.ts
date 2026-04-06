import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/live/sessions/[id] — Get session detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await db.liveSession.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true, bio: true },
        },
        polls: {
          include: {
            creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        viewers: {
          select: { id: true, userId: true, joinedAt: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Get live session error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch session' }, { status: 500 });
  }
}

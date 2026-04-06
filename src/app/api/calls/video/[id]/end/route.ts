import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/calls/video/[id]/end — End video call
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const call = await db.videoCall.findUnique({
      where: { id },
    });

    if (!call) {
      return NextResponse.json({ success: false, error: 'Call not found' }, { status: 404 });
    }

    if (call.status === 'ended' || call.status === 'rejected') {
      return NextResponse.json({ success: false, error: 'Call has already ended' }, { status: 400 });
    }

    const membership = await db.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: call.conversationId, userId } },
    });

    if (!membership && call.callerId !== userId) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    const endedAt = new Date();
    let duration: number | null = null;
    if (call.startedAt) {
      duration = Math.floor((endedAt.getTime() - call.startedAt.getTime()) / 1000);
    }

    const updatedCall = await db.videoCall.update({
      where: { id },
      data: {
        status: 'ended',
        endedAt,
        duration,
      },
    });

    return NextResponse.json({ success: true, call: updatedCall });
  } catch (error) {
    console.error('POST /api/calls/video/[id]/end error:', error);
    return NextResponse.json({ success: false, error: 'Failed to end video call' }, { status: 500 });
  }
}

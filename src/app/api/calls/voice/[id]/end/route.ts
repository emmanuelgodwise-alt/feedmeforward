import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/calls/voice/[id]/end — End voice call
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

    const call = await db.voiceCall.findUnique({
      where: { id },
    });

    if (!call) {
      return NextResponse.json({ success: false, error: 'Call not found' }, { status: 404 });
    }

    if (call.status === 'ended' || call.status === 'rejected') {
      return NextResponse.json({ success: false, error: 'Call has already ended' }, { status: 400 });
    }

    // Verify user is member or caller
    const membership = await db.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: call.conversationId, userId } },
    });

    if (!membership && call.callerId !== userId) {
      return NextResponse.json({ success: false, error: 'Not authorized to end this call' }, { status: 403 });
    }

    // Calculate duration
    const endedAt = new Date();
    let duration: number | null = null;
    if (call.startedAt) {
      duration = Math.floor((endedAt.getTime() - call.startedAt.getTime()) / 1000);
    }

    const updatedCall = await db.voiceCall.update({
      where: { id },
      data: {
        status: 'ended',
        endedAt,
        duration,
      },
    });

    return NextResponse.json({ success: true, call: updatedCall });
  } catch (error) {
    console.error('POST /api/calls/voice/[id]/end error:', error);
    return NextResponse.json({ success: false, error: 'Failed to end voice call' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/calls/voice/start — Initiate voice call
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({ success: false, error: 'conversationId is required' }, { status: 400 });
    }

    // Verify membership
    const membership = await db.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Not a member of this conversation' }, { status: 403 });
    }

    // Check no ongoing call
    const ongoingCall = await db.voiceCall.findFirst({
      where: {
        conversationId,
        status: { in: ['ringing', 'ongoing'] },
      },
    });

    if (ongoingCall) {
      return NextResponse.json({ success: false, error: 'There is already an active voice call in this conversation' }, { status: 409 });
    }

    const call = await db.voiceCall.create({
      data: {
        conversationId,
        callerId: userId,
        status: 'ringing',
      },
      include: {
        caller: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        conversation: {
          select: { id: true, type: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, call }, { status: 201 });
  } catch (error) {
    console.error('POST /api/calls/voice/start error:', error);
    return NextResponse.json({ success: false, error: 'Failed to start voice call' }, { status: 500 });
  }
}

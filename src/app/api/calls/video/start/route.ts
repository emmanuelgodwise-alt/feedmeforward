import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/calls/video/start — Initiate video call
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

    const membership = await db.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Not a member of this conversation' }, { status: 403 });
    }

    const ongoingCall = await db.videoCall.findFirst({
      where: {
        conversationId,
        status: { in: ['ringing', 'ongoing'] },
      },
    });

    if (ongoingCall) {
      return NextResponse.json({ success: false, error: 'There is already an active video call' }, { status: 409 });
    }

    const call = await db.videoCall.create({
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
    console.error('POST /api/calls/video/start error:', error);
    return NextResponse.json({ success: false, error: 'Failed to start video call' }, { status: 500 });
  }
}

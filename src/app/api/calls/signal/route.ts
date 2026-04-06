import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/calls/signal — Send WebRTC signal
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { callId, callType, signalType, content } = body;

    if (!callId || !callType || !signalType || !content) {
      return NextResponse.json(
        { success: false, error: 'callId, callType, signalType, and content are required' },
        { status: 400 }
      );
    }

    if (!['voice', 'video'].includes(callType)) {
      return NextResponse.json({ success: false, error: 'callType must be "voice" or "video"' }, { status: 400 });
    }

    if (!['offer', 'answer', 'ice-candidate', 'hangup'].includes(signalType)) {
      return NextResponse.json({ success: false, error: 'Invalid signalType' }, { status: 400 });
    }

    await db.callSignal.create({
      data: {
        callId,
        callType,
        signalType,
        senderId: userId,
        content: typeof content === 'string' ? content : JSON.stringify(content),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/calls/signal error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send signal' }, { status: 500 });
  }
}

// GET /api/calls/signal — Poll for pending signals
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');
    const callType = searchParams.get('callType');
    const after = searchParams.get('after');

    if (!callId || !callType) {
      return NextResponse.json({ success: false, error: 'callId and callType are required' }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      callId,
      callType,
      senderId: { not: userId }, // Only get signals from other users
    };

    if (after) {
      const afterDate = new Date(after);
      if (!isNaN(afterDate.getTime())) {
        where.createdAt = { gt: afterDate };
      }
    }

    const signals = await db.callSignal.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    // Delete delivered signals
    if (signals.length > 0) {
      const signalIds = signals.map((s) => s.id);
      await db.callSignal.deleteMany({
        where: { id: { in: signalIds } },
      });
    }

    return NextResponse.json({ signals });
  } catch (error) {
    console.error('GET /api/calls/signal error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get signals' }, { status: 500 });
  }
}

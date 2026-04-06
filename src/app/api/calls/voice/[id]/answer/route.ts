import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/calls/voice/[id]/answer — Answer voice call
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
      include: { conversation: true },
    });

    if (!call) {
      return NextResponse.json({ success: false, error: 'Call not found' }, { status: 404 });
    }

    if (call.status !== 'ringing') {
      return NextResponse.json({ success: false, error: 'Call is not ringing' }, { status: 400 });
    }

    // Verify user is member of the conversation
    const membership = await db.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: call.conversationId, userId } },
    });

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Not a member of this conversation' }, { status: 403 });
    }

    const updatedCall = await db.voiceCall.update({
      where: { id },
      data: {
        status: 'ongoing',
        startedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, call: updatedCall });
  } catch (error) {
    console.error('POST /api/calls/voice/[id]/answer error:', error);
    return NextResponse.json({ success: false, error: 'Failed to answer voice call' }, { status: 500 });
  }
}

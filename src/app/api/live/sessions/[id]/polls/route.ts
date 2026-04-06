import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { broadcastToSession } from '../sse/route';

// POST /api/live/sessions/[id]/polls — Create a live poll
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
    const body = await req.json();
    const { question, options } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400 });
    }

    if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
      return NextResponse.json({ success: false, error: 'Options must be an array of 2-10 items' }, { status: 400 });
    }

    const session = await db.liveSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'live') {
      return NextResponse.json({ success: false, error: 'Session is not live' }, { status: 400 });
    }

    if (!session.pollsEnabled) {
      return NextResponse.json({ success: false, error: 'Polls are disabled for this session' }, { status: 400 });
    }

    // Only creator can create polls (or extend to viewers if needed)
    if (session.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can create polls' }, { status: 403 });
    }

    const optionsData = JSON.stringify(options.map(text => ({ text, voteCount: 0 })));

    const poll = await db.livePoll.create({
      data: {
        sessionId: id,
        creatorId: userId,
        question: question.trim(),
        options: optionsData,
      },
    });

    // Broadcast to all viewers
    broadcastToSession(id, 'new_poll', {
      id: poll.id,
      question: poll.question,
      options: options,
      totalVotes: 0,
    });

    return NextResponse.json({ success: true, poll });
  } catch (error) {
    console.error('Create live poll error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create poll' }, { status: 500 });
  }
}

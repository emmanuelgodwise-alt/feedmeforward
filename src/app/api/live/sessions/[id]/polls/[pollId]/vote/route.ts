import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { broadcastToSession } from '../../../sse/route';

// POST /api/live/sessions/[id]/polls/[pollId]/vote — Vote on live poll
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pollId: string }> }
) {
  try {
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id, pollId } = await params;
    const body = await req.json();
    const { optionIndex } = body;

    if (typeof optionIndex !== 'number' || optionIndex < 0) {
      return NextResponse.json({ success: false, error: 'Invalid option index' }, { status: 400 });
    }

    const poll = await db.livePoll.findUnique({
      where: { id: pollId, sessionId: id },
    });

    if (!poll) {
      return NextResponse.json({ success: false, error: 'Poll not found' }, { status: 404 });
    }

    if (poll.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Poll is closed' }, { status: 400 });
    }

    // Check if already voted
    const existingVote = await db.livePollVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
    });

    if (existingVote) {
      // Update vote: decrement old option, increment new option
      const options = JSON.parse(poll.options) as Array<{ text: string; voteCount: number }>;

      // Decrement old option
      if (options[existingVote.optionIndex]) {
        options[existingVote.optionIndex].voteCount = Math.max(0, options[existingVote.optionIndex].voteCount - 1);
      }

      // Increment new option
      if (options[optionIndex]) {
        options[optionIndex].voteCount++;
      }

      await db.livePollVote.update({
        where: { id: existingVote.id },
        data: { optionIndex },
      });

      await db.livePoll.update({
        where: { id: pollId },
        data: { options: JSON.stringify(options) },
      });

      // Broadcast update
      broadcastToSession(id, 'poll_update', {
        pollId,
        options,
        totalVotes: poll.totalVotes,
      });

      return NextResponse.json({ success: true, poll: { ...poll, options } });
    }

    // Create new vote
    const options = JSON.parse(poll.options) as Array<{ text: string; voteCount: number }>;

    if (optionIndex >= options.length) {
      return NextResponse.json({ success: false, error: 'Invalid option index' }, { status: 400 });
    }

    options[optionIndex].voteCount++;

    await db.livePollVote.create({
      data: {
        pollId,
        userId,
        optionIndex,
      },
    });

    const updatedPoll = await db.livePoll.update({
      where: { id: pollId },
      data: {
        totalVotes: { increment: 1 },
        options: JSON.stringify(options),
      },
    });

    // Broadcast update
    broadcastToSession(id, 'poll_update', {
      pollId,
      options,
      totalVotes: updatedPoll.totalVotes,
    });

    // Also broadcast to chat as a system message
    broadcastToSession(id, 'chat', {
      id: `system_${Date.now()}`,
      type: 'system',
      content: `A viewer voted on "${poll.question}"`,
    });

    return NextResponse.json({ success: true, poll: updatedPoll });
  } catch (error) {
    console.error('Vote on live poll error:', error);
    return NextResponse.json({ success: false, error: 'Failed to vote' }, { status: 500 });
  }
}

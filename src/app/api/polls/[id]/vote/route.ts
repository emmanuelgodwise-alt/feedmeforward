import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { recalculateScore } from '@/lib/score-engine';

// POST /api/polls/[id]/vote — Vote on a poll
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: pollId } = await params;
    const body = await request.json();
    const { optionId } = body;

    if (!optionId || typeof optionId !== 'string') {
      return NextResponse.json({ success: false, error: 'Option ID is required' }, { status: 400 });
    }

    // Check poll exists
    const poll = await db.poll.findUnique({ where: { id: pollId } });
    if (!poll) {
      return NextResponse.json({ success: false, error: 'Poll not found' }, { status: 404 });
    }

    // Check if already voted (unique constraint will handle it, but give a nice message)
    const existingVote = await db.pollVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
    });
    if (existingVote) {
      return NextResponse.json({ success: false, error: 'You have already voted on this poll' }, { status: 409 });
    }

    // Check if poll is closed
    if (poll.closesAt && new Date(poll.closesAt) < new Date()) {
      return NextResponse.json({ success: false, error: 'This poll has closed' }, { status: 410 });
    }

    // Check max responses
    if (poll.maxResponses && poll.responseCount >= poll.maxResponses) {
      return NextResponse.json({ success: false, error: 'This poll has reached maximum responses' }, { status: 410 });
    }

    // Validate option exists in poll
    const options = JSON.parse(poll.options) as Array<{ id: string; text: string; voteCount: number }>;
    const optionIndex = options.findIndex((o) => o.id === optionId);
    if (optionIndex === -1) {
      return NextResponse.json({ success: false, error: 'Invalid option' }, { status: 400 });
    }

    // Increment the option's vote count
    options[optionIndex].voteCount += 1;

    // Create vote and update poll in a transaction
    await db.$transaction([
      db.pollVote.create({
        data: {
          pollId,
          userId,
          optionId,
        },
      }),
      db.poll.update({
        where: { id: pollId },
        data: {
          options: JSON.stringify(options),
          responseCount: { increment: 1 },
        },
      }),
    ]);

    // Trigger score recalculation for the voter (fire and forget)
    recalculateScore(userId).catch((err) => console.error('Score recalc failed:', err));

    return NextResponse.json({
      success: true,
      data: {
        pollId,
        optionId,
        options,
        responseCount: poll.responseCount + 1,
      },
    });
  } catch (error) {
    console.error('POST /api/polls/[id]/vote error:', error);
    return NextResponse.json({ success: false, error: 'Failed to vote' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: pollId } = await params;

    // Get poll
    const poll = await db.poll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        question: true,
        isPaid: true,
        rewardPerResponse: true,
        totalRewardPool: true,
      },
    });

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    if (!poll.isPaid) {
      return NextResponse.json({ error: 'This is not a paid poll' }, { status: 400 });
    }

    if (!poll.rewardPerResponse || poll.rewardPerResponse <= 0) {
      return NextResponse.json({ error: 'This poll has no reward configured' }, { status: 400 });
    }

    if (!poll.totalRewardPool || poll.totalRewardPool < poll.rewardPerResponse) {
      return NextResponse.json({ error: 'Insufficient reward pool funds' }, { status: 400 });
    }

    // Check user has voted on this poll
    const pollVote = await db.pollVote.findUnique({
      where: {
        pollId_userId: { pollId, userId },
      },
    });

    if (!pollVote) {
      return NextResponse.json({ error: 'You must vote on the poll before claiming a reward' }, { status: 400 });
    }

    // Check if user has already claimed
    const existingClaim = await db.transaction.findFirst({
      where: {
        userId,
        type: 'reward',
        referenceId: pollVote.id,
        status: 'completed',
      },
    });

    if (existingClaim) {
      return NextResponse.json({ error: 'Reward already claimed for this poll' }, { status: 400 });
    }

    const rewardAmount = poll.rewardPerResponse;

    // Create reward transaction
    const transaction = await db.transaction.create({
      data: {
        userId,
        amount: rewardAmount,
        type: 'reward',
        status: 'completed',
        description: `Reward for poll: ${poll.question}`,
        referenceId: pollVote.id,
      },
    });

    // Update user balance and poll reward pool
    const [updatedUser, updatedPoll] = await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: rewardAmount } },
        select: { walletBalance: true },
      }),
      db.poll.update({
        where: { id: pollId },
        data: { totalRewardPool: { decrement: rewardAmount } },
        select: { totalRewardPool: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      newBalance: Math.round(updatedUser.walletBalance * 100) / 100,
      reward: {
        id: transaction.id,
        amount: Math.round(rewardAmount * 100) / 100,
        description: transaction.description,
        createdAt: transaction.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Poll claim error:', error);
    return NextResponse.json({ error: 'Failed to claim reward' }, { status: 500 });
  }
}

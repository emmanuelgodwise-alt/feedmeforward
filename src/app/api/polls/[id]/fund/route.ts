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

    const body = await request.json();
    const { amount } = body as { amount?: number };

    // Validate amount
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }
    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    // Get poll with video to check ownership
    const poll = await db.poll.findUnique({
      where: { id: pollId },
      include: {
        video: {
          select: { creatorId: true },
        },
      },
    });

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    if (!poll.isPaid) {
      return NextResponse.json({ error: 'This is not a paid poll' }, { status: 400 });
    }

    if (poll.video.creatorId !== userId) {
      return NextResponse.json({ error: 'Only the poll creator can fund it' }, { status: 403 });
    }

    // Get user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, walletBalance: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (amount > user.walletBalance) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Create withdrawal transaction for funding
    const transaction = await db.transaction.create({
      data: {
        userId,
        amount,
        type: 'withdrawal',
        status: 'completed',
        description: `Funded poll: ${poll.question}`,
        referenceId: pollId,
      },
    });

    // Update poll reward pool and user balance
    const [updatedPoll, updatedUser] = await db.$transaction([
      db.poll.update({
        where: { id: pollId },
        data: {
          totalRewardPool: { increment: amount },
        },
      }),
      db.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: amount } },
        select: { walletBalance: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      newBalance: Math.round(updatedUser.walletBalance * 100) / 100,
      poll: {
        id: updatedPoll.id,
        totalRewardPool: updatedPoll.totalRewardPool,
      },
    });
  } catch (error) {
    console.error('Poll fund error:', error);
    return NextResponse.json({ error: 'Failed to fund poll' }, { status: 500 });
  }
}

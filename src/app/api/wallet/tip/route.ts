import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientId, amount, videoId, message } = body as {
      recipientId?: string;
      amount?: number;
      videoId?: string;
      message?: string;
    };

    // Validate fields
    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 });
    }
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }
    if (amount < 0.5) {
      return NextResponse.json({ error: 'Minimum tip amount is $0.50' }, { status: 400 });
    }

    // Cannot tip yourself
    if (recipientId === userId) {
      return NextResponse.json({ error: 'Cannot tip yourself' }, { status: 400 });
    }

    // Get sender
    const sender = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, walletBalance: true, username: true },
    });

    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
    }

    if (amount > sender.walletBalance) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Get recipient
    const recipient = await db.user.findUnique({
      where: { id: recipientId },
      select: { id: true, walletBalance: true },
    });

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Build description
    const baseDesc = `Tip from @${sender.username}`;
    const description = message ? `${baseDesc}: ${message}` : baseDesc;

    // Create sender transaction (tip out)
    const senderTx = await db.transaction.create({
      data: {
        userId,
        amount,
        type: 'tip',
        status: 'completed',
        description: `Tip to @${recipientId}${videoId ? ` on video ${videoId}` : ''}`,
        referenceId: videoId ?? null,
      },
    });

    // Create recipient transaction (earning in)
    const recipientTx = await db.transaction.create({
      data: {
        userId: recipientId,
        amount,
        type: 'earning',
        status: 'completed',
        description,
        referenceId: senderTx.id,
      },
    });

    // Update both balances in a transactional manner
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: amount } },
      }),
      db.user.update({
        where: { id: recipientId },
        data: { walletBalance: { increment: amount } },
      }),
    ]);

    const newBalance = sender.walletBalance - amount;

    return NextResponse.json({
      success: true,
      newBalance: Math.round(newBalance * 100) / 100,
      transaction: {
        id: senderTx.id,
        userId: senderTx.userId,
        amount: senderTx.amount,
        type: senderTx.type,
        status: senderTx.status,
        description: senderTx.description,
        referenceId: senderTx.referenceId,
        createdAt: senderTx.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Tip error:', error);
    return NextResponse.json({ error: 'Failed to send tip' }, { status: 500 });
  }
}

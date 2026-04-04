import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, method } = body as { amount?: number; method?: string };

    // Validate amount
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }
    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }
    if (amount < 10) {
      return NextResponse.json({ error: 'Minimum withdrawal amount is $10' }, { status: 400 });
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

    // Create withdrawal transaction - completed immediately in sandbox
    const transaction = await db.transaction.create({
      data: {
        userId,
        amount,
        type: 'withdrawal',
        status: 'completed',
        description: method ? `Withdrawal via ${method}` : 'Wallet withdrawal',
      },
    });

    // Update user balance
    const newBalance = user.walletBalance - amount;
    await db.user.update({
      where: { id: userId },
      data: { walletBalance: newBalance },
    });

    return NextResponse.json({
      success: true,
      newBalance: Math.round(newBalance * 100) / 100,
      transaction: {
        id: transaction.id,
        userId: transaction.userId,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        description: transaction.description,
        referenceId: transaction.referenceId,
        createdAt: transaction.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json({ error: 'Failed to process withdrawal' }, { status: 500 });
  }
}

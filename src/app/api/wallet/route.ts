import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user balance
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate aggregate totals from completed transactions
    const completedAggregates = await db.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        status: 'completed',
      },
      _sum: { amount: true },
    });

    // Map aggregates
    const totalEarnings =
      (completedAggregates.find((a) => a.type === 'earning')?._sum.amount ?? 0) +
      (completedAggregates.find((a) => a.type === 'reward')?._sum.amount ?? 0);

    const totalTipsSent =
      completedAggregates.find((a) => a.type === 'tip')?._sum.amount ?? 0;

    const totalDeposits =
      completedAggregates.find((a) => a.type === 'deposit')?._sum.amount ?? 0;

    const totalWithdrawals =
      completedAggregates.find((a) => a.type === 'withdrawal')?._sum.amount ?? 0;

    // Calculate pending amount
    const pendingAggregate = await db.transaction.aggregate({
      where: {
        userId,
        status: 'pending',
      },
      _sum: { amount: true },
    });

    const pendingAmount = pendingAggregate._sum.amount ?? 0;

    return NextResponse.json({
      balance: user.walletBalance,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalTipsSent: Math.round(totalTipsSent * 100) / 100,
      totalDeposits: Math.round(totalDeposits * 100) / 100,
      totalWithdrawals: Math.round(totalWithdrawals * 100) / 100,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
    });
  } catch (error) {
    console.error('Wallet summary error:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet summary' }, { status: 500 });
  }
}

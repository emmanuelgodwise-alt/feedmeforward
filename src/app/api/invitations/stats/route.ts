import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET /api/invitations/stats — Invitation statistics ───────────────
export async function GET(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Run all count queries in parallel
    const [
      totalSent,
      totalAccepted,
      totalPending,
      totalRewarded,
      rewardTransactions,
    ] = await Promise.all([
      // Total invitations sent
      db.invitation.count({
        where: { inviterId: userId },
      }),
      // Total invitations accepted (status = "responded")
      db.invitation.count({
        where: { inviterId: userId, status: 'responded' },
      }),
      // Total pending invitations (status = "sent" or "clicked")
      db.invitation.count({
        where: { inviterId: userId, status: { in: ['sent', 'clicked'] } },
      }),
      // Total rewarded invitations
      db.invitation.count({
        where: { inviterId: userId, rewardGiven: true },
      }),
      // Total reward amount from invitation reward transactions
      db.transaction.aggregate({
        where: {
          userId,
          type: 'reward',
          status: 'completed',
        },
        _sum: { amount: true },
      }),
    ]);

    const totalRewardAmount = rewardTransactions._sum.amount ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        totalSent,
        totalAccepted,
        totalPending,
        totalRewarded,
        totalRewardAmount: Math.round(totalRewardAmount * 100) / 100,
      },
    });
  } catch (error) {
    console.error('GET /api/invitations/stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invitation stats' }, { status: 500 });
  }
}

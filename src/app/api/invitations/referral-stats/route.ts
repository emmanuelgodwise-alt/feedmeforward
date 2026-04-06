import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET /api/invitations/referral-stats ───────────────────────────
// Get detailed referral statistics for the authenticated user
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

    // Run all queries in parallel
    const [
      totalInvited,
      totalAccepted,
      rewardTransactions,
      recentInvitations,
    ] = await Promise.all([
      // Total invitations sent
      db.invitation.count({
        where: { inviterId: userId },
      }),
      // Total invitations accepted
      db.invitation.count({
        where: { inviterId: userId, status: 'responded' },
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
      // Recent invitations (last 10)
      db.invitation.findMany({
        where: { inviterId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          inviteeEmail: true,
          status: true,
          rewardGiven: true,
          createdAt: true,
          respondedAt: true,
        },
      }),
    ]);

    const totalEarned = rewardTransactions._sum.amount ?? 0;
    const conversionRate = totalInvited > 0 ? Math.round((totalAccepted / totalInvited) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalInvited,
        totalAccepted,
        totalOnPlatform: totalAccepted,
        totalEarned: Math.round(totalEarned * 100) / 100,
        conversionRate,
        recentInvitations: recentInvitations.map((inv) => ({
          id: inv.id,
          inviteeEmail: inv.inviteeEmail,
          status: inv.status,
          rewardGiven: inv.rewardGiven,
          createdAt: inv.createdAt.toISOString(),
          respondedAt: inv.respondedAt?.toISOString() ?? null,
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/invitations/referral-stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch referral stats' }, { status: 500 });
  }
}

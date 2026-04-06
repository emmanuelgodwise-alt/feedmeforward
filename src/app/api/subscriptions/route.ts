import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/subscriptions?creatorId=xxx
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');

    if (creatorId) {
      // Get subscription info for a specific creator
      const creator = await db.user.findUnique({
        where: { id: creatorId },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          subscriptionTiers: true,
        },
      });

      if (!creator) {
        return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
      }

      // Parse tiers
      let tiers: Array<{ tier: string; name: string; price: number; benefits: string[] }> = [];
      try {
        tiers = JSON.parse(creator.subscriptionTiers || '[]');
      } catch {
        tiers = [];
      }

      // If no tiers configured, use defaults
      if (tiers.length === 0) {
        tiers = [
          { tier: 'basic', name: 'Supporter', price: 4.99, benefits: ['Badge', 'Early access'] },
          { tier: 'premium', name: 'Super Fan', price: 9.99, benefits: ['Badge', 'Early access', 'Exclusive content', 'Monthly shoutout'] },
          { tier: 'exclusive', name: 'VIP', price: 24.99, benefits: ['All Premium perks', '1-on-1 chat', 'Custom content', 'Behind the scenes'] },
        ];
      }

      // Check if user is subscribed
      const subscription = await db.subscription.findUnique({
        where: {
          subscriberId_creatorId: {
            subscriberId: userId,
            creatorId,
          },
        },
      });

      return NextResponse.json({
        creator: {
          id: creator.id,
          username: creator.username,
          displayName: creator.displayName,
          avatarUrl: creator.avatarUrl,
        },
        tiers,
        currentSubscription: subscription
          ? {
              id: subscription.id,
              tier: subscription.tier,
              status: subscription.status,
              startedAt: subscription.startedAt.toISOString(),
              expiresAt: subscription.expiresAt?.toISOString() || null,
            }
          : null,
      });
    }

    // No creatorId: return user's active subscriptions
    const subscriptions = await db.subscription.findMany({
      where: {
        subscriberId: userId,
        status: 'active',
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    return NextResponse.json({
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        creatorId: sub.creatorId,
        creator: sub.creator,
        tier: sub.tier,
        amount: sub.amount,
        status: sub.status,
        startedAt: sub.startedAt.toISOString(),
        expiresAt: sub.expiresAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error('GET /api/subscriptions error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

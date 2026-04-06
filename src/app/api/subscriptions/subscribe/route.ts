import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

// POST /api/subscriptions/subscribe — subscribe to a creator
export async function POST(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { creatorId, tier } = body as { creatorId?: string; tier?: string };

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 });
    }
    if (!tier) {
      return NextResponse.json({ error: 'Subscription tier is required' }, { status: 400 });
    }

    // Cannot subscribe to yourself
    if (creatorId === userId) {
      return NextResponse.json({ error: 'Cannot subscribe to yourself' }, { status: 400 });
    }

    // Check creator exists
    const creator = await db.user.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        username: true,
        subscriptionTiers: true,
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Parse and validate tiers
    let tiers = [];
    try {
      tiers = JSON.parse(creator.subscriptionTiers || '[]');
    } catch {
      tiers = [];
    }

    if (tiers.length === 0) {
      tiers = [
        { tier: 'basic', name: 'Supporter', price: 4.99, benefits: ['Badge', 'Early access'] },
        { tier: 'premium', name: 'Super Fan', price: 9.99, benefits: ['Badge', 'Early access', 'Exclusive content', 'Monthly shoutout'] },
        { tier: 'exclusive', name: 'VIP', price: 24.99, benefits: ['All Premium perks', '1-on-1 chat', 'Custom content', 'Behind the scenes'] },
      ];
    }

    const tierInfo = tiers.find((t: { tier: string }) => t.tier === tier);
    if (!tierInfo) {
      return NextResponse.json({ error: `Invalid tier: ${tier}. Available tiers: ${tiers.map((t: { tier: string }) => t.tier).join(', ')}` }, { status: 400 });
    }

    // Check not already subscribed
    const existing = await db.subscription.findUnique({
      where: {
        subscriberId_creatorId: {
          subscriberId: userId,
          creatorId,
        },
      },
    });

    if (existing && existing.status === 'active') {
      return NextResponse.json({ error: 'Already subscribed to this creator' }, { status: 400 });
    }

    const amount = tierInfo.price as number;

    // Check user balance
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true, username: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (amount > user.walletBalance) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Calculate expiry (30 days from now)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create subscription, deduct balance, create earning transaction
    const [subscription, updatedUser] = await db.$transaction([
      // If existing cancelled subscription, update it
      ...(existing
        ? [
            db.subscription.update({
              where: { id: existing.id },
              data: {
                tier,
                amount,
                status: 'active',
                startedAt: new Date(),
                expiresAt,
                cancelledAt: null,
              },
            }),
          ]
        : [
            db.subscription.create({
              data: {
                subscriberId: userId,
                creatorId,
                tier,
                amount,
                status: 'active',
                expiresAt,
              },
            }),
          ]),
      db.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: amount } },
        select: { walletBalance: true },
      }),
    ]);

    // Create earning transaction for creator
    await db.transaction.create({
      data: {
        userId: creatorId,
        amount,
        type: 'earning',
        status: 'completed',
        description: `Subscription from @${user.username} (${tierInfo.name})`,
      },
    });

    // Create withdrawal transaction for subscriber
    await db.transaction.create({
      data: {
        userId,
        amount,
        type: 'withdrawal',
        status: 'completed',
        description: `Subscribed to @${creator.username} (${tierInfo.name})`,
      },
    });

    // Credit creator wallet
    await db.user.update({
      where: { id: creatorId },
      data: { walletBalance: { increment: amount } },
    });

    // Notify creator
    createNotification({
      userId: creatorId,
      fromUserId: userId,
      type: 'subscription',
      title: 'New Subscriber',
      message: `@${user.username} subscribed to your ${tierInfo.name} tier!`,
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        creatorId,
        tier,
        amount,
        status: 'active',
        startedAt: subscription.startedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      newBalance: Math.round(updatedUser.walletBalance * 100) / 100,
    });
  } catch (error) {
    console.error('POST /api/subscriptions/subscribe error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

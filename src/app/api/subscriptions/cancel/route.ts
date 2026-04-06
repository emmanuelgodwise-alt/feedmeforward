import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/subscriptions/cancel — cancel a subscription
export async function POST(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { creatorId } = body as { creatorId?: string };

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 });
    }

    // Find active subscription
    const subscription = await db.subscription.findUnique({
      where: {
        subscriberId_creatorId: {
          subscriberId: userId,
          creatorId,
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    if (subscription.status !== 'active') {
      return NextResponse.json({ error: `Subscription is already ${subscription.status}` }, { status: 400 });
    }

    // Cancel: set status to cancelled, record cancelledAt
    // Subscription remains active until expiresAt
    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled. You will retain access until your current billing period ends.',
      expiresAt: subscription.expiresAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('POST /api/subscriptions/cancel error:', error);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}

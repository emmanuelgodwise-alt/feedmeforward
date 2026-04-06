import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/creator/tiers — get creator's subscription tiers
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { subscriptionTiers: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let tiers: Array<{ tier: string; name: string; price: number; benefits: string[] }> = [];
    try {
      tiers = JSON.parse(user.subscriptionTiers || '[]');
    } catch {
      tiers = [];
    }

    // Return defaults if no tiers configured
    if (tiers.length === 0) {
      tiers = [
        { tier: 'basic', name: 'Supporter', price: 4.99, benefits: ['Badge', 'Early access'] },
        { tier: 'premium', name: 'Super Fan', price: 9.99, benefits: ['Badge', 'Early access', 'Exclusive content', 'Monthly shoutout'] },
        { tier: 'exclusive', name: 'VIP', price: 24.99, benefits: ['All Premium perks', '1-on-1 chat', 'Custom content', 'Behind the scenes'] },
      ];
    }

    return NextResponse.json({ tiers });
  } catch (error) {
    console.error('GET /api/creator/tiers error:', error);
    return NextResponse.json({ error: 'Failed to fetch tiers' }, { status: 500 });
  }
}

// PUT /api/creator/tiers — update creator's subscription tiers
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tiers } = body as { tiers?: unknown[] };

    if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
      return NextResponse.json({ error: 'Tiers array is required and must not be empty' }, { status: 400 });
    }

    if (tiers.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 tiers allowed' }, { status: 400 });
    }

    // Validate each tier
    const validTierNames = ['basic', 'premium', 'exclusive'];
    for (const t of tiers) {
      const tier = t as Record<string, unknown>;
      if (!tier.tier || typeof tier.tier !== 'string') {
        return NextResponse.json({ error: 'Each tier must have a "tier" field (string)' }, { status: 400 });
      }
      if (!validTierNames.includes(tier.tier as string)) {
        return NextResponse.json({ error: `Invalid tier name: ${tier.tier}. Must be one of: ${validTierNames.join(', ')}` }, { status: 400 });
      }
      if (!tier.name || typeof tier.name !== 'string') {
        return NextResponse.json({ error: 'Each tier must have a "name" field (string)' }, { status: 400 });
      }
      if (tier.price === undefined || typeof tier.price !== 'number' || tier.price < 0) {
        return NextResponse.json({ error: 'Each tier must have a valid "price" (number >= 0)' }, { status: 400 });
      }
      if (!tier.benefits || !Array.isArray(tier.benefits)) {
        return NextResponse.json({ error: 'Each tier must have a "benefits" field (array of strings)' }, { status: 400 });
      }
    }

    // Check for duplicate tier names
    const tierNames = tiers.map((t) => (t as Record<string, unknown>).tier as string);
    if (new Set(tierNames).size !== tierNames.length) {
      return NextResponse.json({ error: 'Duplicate tier names are not allowed' }, { status: 400 });
    }

    // Store as JSON
    const tiersJson = JSON.stringify(tiers);

    await db.user.update({
      where: { id: userId },
      data: { subscriptionTiers: tiersJson },
    });

    return NextResponse.json({
      success: true,
      tiers,
    });
  } catch (error) {
    console.error('PUT /api/creator/tiers error:', error);
    return NextResponse.json({ error: 'Failed to update tiers' }, { status: 500 });
  }
}

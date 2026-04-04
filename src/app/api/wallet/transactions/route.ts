import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const VALID_TYPES = ['tip', 'withdrawal', 'deposit', 'earning', 'reward'];

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20') || 20, 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0') || 0, 0);

    // Validate type filter
    if (typeFilter && !VALID_TYPES.includes(typeFilter)) {
      return NextResponse.json(
        { error: 'Invalid type filter. Must be one of: tip, withdrawal, deposit, earning, reward' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = { userId };
    if (typeFilter) {
      where.type = typeFilter;
    }

    // Get total count
    const total = await db.transaction.count({ where });

    // Get transactions
    const transactions = await db.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        userId: t.userId,
        amount: t.amount,
        type: t.type,
        status: t.status,
        description: t.description,
        referenceId: t.referenceId,
        createdAt: t.createdAt.toISOString(),
      })),
      total,
    });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

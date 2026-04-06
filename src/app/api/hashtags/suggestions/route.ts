import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/hashtags/suggestions — Autocomplete suggestions for hashtags
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    let limit = parseInt(searchParams.get('limit') || '8', 10);
    limit = Math.min(20, Math.max(1, limit));

    if (q.length < 1) {
      return NextResponse.json({ success: false, error: 'Query must be at least 1 character' }, { status: 400 });
    }

    const hashtags = await db.hashtag.findMany({
      where: {
        tag: { startsWith: q },
      },
      orderBy: { useCount: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      hashtags: hashtags.map((h) => ({
        tag: h.tag,
        useCount: h.useCount,
      })),
    });
  } catch (error) {
    console.error('GET /api/hashtags/suggestions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}

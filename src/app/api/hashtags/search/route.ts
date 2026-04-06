import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/hashtags/search — Search hashtags
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    let limit = parseInt(searchParams.get('limit') || '10', 10);
    limit = Math.min(50, Math.max(1, limit));

    if (q.length < 2) {
      return NextResponse.json({ success: false, error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    const hashtags = await db.hashtag.findMany({
      where: {
        tag: { contains: q },
      },
      orderBy: { useCount: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      hashtags: hashtags.map((h) => ({
        tag: h.tag,
        useCount: h.useCount,
        createdAt: h.createdAt,
      })),
    });
  } catch (error) {
    console.error('GET /api/hashtags/search error:', error);
    return NextResponse.json({ success: false, error: 'Failed to search hashtags' }, { status: 500 });
  }
}

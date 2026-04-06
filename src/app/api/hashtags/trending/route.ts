import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/hashtags/trending — Get trending hashtags
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let limit = parseInt(searchParams.get('limit') || '20', 10);
    limit = Math.min(50, Math.max(1, limit));

    const hashtags = await db.hashtag.findMany({
      where: { useCount: { gt: 0 } },
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
    console.error('GET /api/hashtags/trending error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch trending hashtags' }, { status: 500 });
  }
}

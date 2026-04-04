import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/videos/[id]/responses — Get all response clips for a lead video
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify parent video exists
    const parent = await db.video.findUnique({ where: { id } });
    if (!parent) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    const responses = await db.video.findMany({
      where: { parentVideoId: id, type: 'response' },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, username: true } },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    const parsed = responses.map((v) => ({
      ...v,
      tags: v.tags ? JSON.parse(v.tags) : null,
    }));

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error('GET /api/videos/[id]/responses error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch responses' }, { status: 500 });
  }
}

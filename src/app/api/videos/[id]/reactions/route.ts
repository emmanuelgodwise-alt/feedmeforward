import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const VALID_TYPES = ['fire', 'heart', 'laugh', 'wow', 'sad', 'angry', 'clap', 'thinking'];

// GET /api/videos/[id]/reactions — Get reaction counts and user's reactions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('X-User-Id');

    // Check video exists
    const video = await db.video.findUnique({ where: { id } });
    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    // Get reaction counts by type
    const reactionAggregates = await db.reaction.groupBy({
      by: ['type'],
      where: { videoId: id },
      _count: true,
    });

    const reactions: Record<string, number> = {};
    for (const rt of VALID_TYPES) {
      reactions[rt] = 0;
    }
    for (const agg of reactionAggregates) {
      reactions[agg.type] = agg._count;
    }

    // Get current user's reactions
    let userReactions: string[] = [];
    if (userId) {
      const userReactionRecords = await db.reaction.findMany({
        where: { videoId: id, userId },
        select: { type: true },
      });
      userReactions = userReactionRecords.map((r) => r.type);
    }

    return NextResponse.json({ reactions, userReactions });
  } catch (error) {
    console.error('GET /api/videos/[id]/reactions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reactions' }, { status: 500 });
  }
}

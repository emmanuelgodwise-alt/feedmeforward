import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recalculateScore } from '@/lib/score-engine';

const VALID_TYPES = ['fire', 'heart', 'laugh', 'wow', 'sad', 'angry', 'clap', 'thinking'];

// POST /api/videos/[id]/react — Toggle reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, type } = body;

    if (!userId || !type) {
      return NextResponse.json({ success: false, error: 'userId and type are required' }, { status: 400 });
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ success: false, error: `Invalid reaction type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    // Check video exists
    const video = await db.video.findUnique({ where: { id } });
    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    // Check if reaction already exists
    const existing = await db.reaction.findUnique({
      where: { userId_videoId_type: { userId, videoId: id, type } },
    });

    let reacted: boolean;

    if (existing) {
      // Remove reaction
      await db.reaction.delete({ where: { id: existing.id } });
      reacted = false;
    } else {
      // Create reaction
      await db.reaction.create({
        data: { userId, videoId: id, type },
      });
      reacted = true;

      // Create notification for video creator (not for self-reactions)
      if (userId !== video.creatorId) {
        const reactionEmojis: Record<string, string> = {
          fire: '🔥', heart: '❤️', laugh: '😂', wow: '😮',
          sad: '😢', angry: '😡', clap: '👏', thinking: '🤔',
        };
        const emoji = reactionEmojis[type] || type;
        const reactingUser = await db.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });
        const username = reactingUser?.username || 'Someone';
        await db.notification.create({
          data: {
            userId: video.creatorId,
            fromUserId: userId,
            type: 'reaction',
            videoId: id,
            title: 'New Reaction',
            message: `@${username} reacted with ${emoji} to your video`,
          },
        });
      }

      // Fire-and-forget score recalculation
      recalculateScore(userId).catch(() => {});
    }

    // Get updated reaction counts for all types
    const reactionAggregates = await db.reaction.groupBy({
      by: ['type'],
      where: { videoId: id },
      _count: true,
    });

    const reactionCounts: Record<string, number> = {};
    for (const rt of VALID_TYPES) {
      reactionCounts[rt] = 0;
    }
    for (const agg of reactionAggregates) {
      reactionCounts[agg.type] = agg._count;
    }

    return NextResponse.json({ success: true, reacted, reactionCounts });
  } catch (error) {
    console.error('POST /api/videos/[id]/react error:', error);
    return NextResponse.json({ success: false, error: 'Failed to toggle reaction' }, { status: 500 });
  }
}

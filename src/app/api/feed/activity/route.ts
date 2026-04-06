import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/feed/activity — Recent activity from followed users
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(30, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));

    // Get followed user IDs
    const followingRecords = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = followingRecords.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return NextResponse.json({ activities: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }

    // Fetch activities from multiple sources in parallel
    const [
      newVideos,
      reposts,
      recentReactions,
      newPolls,
    ] = await Promise.all([
      // Recent videos from followed users
      db.video.findMany({
        where: { creatorId: { in: followingIds } },
        include: {
          creator: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Recent reposts from followed users
      db.repost.findMany({
        where: { userId: { in: followingIds } },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
          video: { select: { id: true, title: true, thumbnailUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Recent reactions on videos from followed users (aggregated)
      db.reaction.findMany({
        where: { userId: { in: followingIds } },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
          video: { select: { id: true, title: true, thumbnailUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // New polls from followed users
      db.poll.findMany({
        where: { video: { creatorId: { in: followingIds } } },
        include: {
          video: {
            select: {
              id: true,
              title: true,
              creator: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Build activity items
    const activities: Array<{
      id: string;
      type: string;
      actor: { id: string; username: string; displayName: string | null; avatarUrl: string | null; isVerified: boolean };
      target?: { id: string; title: string; thumbnailUrl?: string | null };
      action: string;
      createdAt: Date;
    }> = [];

    for (const v of newVideos) {
      activities.push({
        id: `video-${v.id}`,
        type: 'new_video',
        actor: v.creator,
        target: { id: v.id, title: v.title, thumbnailUrl: v.thumbnailUrl },
        action: `posted a new video: "${v.title}"`,
        createdAt: v.createdAt,
      });
    }

    for (const r of reposts) {
      activities.push({
        id: `repost-${r.id}`,
        type: 'repost',
        actor: r.user,
        target: r.video ? { id: r.video.id, title: r.video.title, thumbnailUrl: r.video.thumbnailUrl } : undefined,
        action: r.quote ? `reposted with: "${r.quote}"` : 'reposted a video',
        createdAt: r.createdAt,
      });
    }

    const reactionEmojis: Record<string, string> = {
      fire: '🔥', heart: '❤️', laugh: '😂', wow: '😮', sad: '😢', angry: '😡', clap: '👏', thinking: '🤔',
    };
    for (const react of recentReactions) {
      const emoji = reactionEmojis[react.type] || react.type;
      activities.push({
        id: `reaction-${react.id}`,
        type: 'reaction',
        actor: react.user,
        target: react.video ? { id: react.video.id, title: react.video.title, thumbnailUrl: react.video.thumbnailUrl } : undefined,
        action: `reacted ${emoji} to "${react.video?.title || 'a video'}"`,
        createdAt: react.createdAt,
      });
    }

    for (const p of newPolls) {
      activities.push({
        id: `poll-${p.id}`,
        type: 'poll_created',
        actor: p.video.creator,
        target: { id: p.video.id, title: p.video.title },
        action: `created a poll: "${p.question}"`,
        createdAt: p.createdAt,
      });
    }

    // Sort all activities by date
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Paginate
    const total = activities.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginated = activities.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      activities: paginated,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error('GET /api/feed/activity error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch activity feed' }, { status: 500 });
  }
}

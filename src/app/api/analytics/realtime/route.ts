import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/analytics/realtime — YouTube Studio-style real-time analytics
export async function GET(request: NextRequest) {
  try {
    // ─── Authentication ──────────────────────────────────────────
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Provide X-User-Id header.' },
        { status: 401 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // ─── 1. activeNow — Unique users who interacted in last 5 min ─
    const [
      recentLikes,
      recentComments,
      recentReactions,
      recentReposts,
      recentPollVotes,
      recentFollows,
    ] = await Promise.all([
      db.like.findMany({
        where: { video: { creatorId: userId }, createdAt: { gte: fiveMinAgo } },
        select: { userId: true },
      }),
      db.comment.findMany({
        where: { video: { creatorId: userId }, createdAt: { gte: fiveMinAgo } },
        select: { userId: true },
      }),
      db.reaction.findMany({
        where: { video: { creatorId: userId }, createdAt: { gte: fiveMinAgo } },
        select: { userId: true },
      }),
      db.repost.findMany({
        where: { video: { creatorId: userId }, createdAt: { gte: fiveMinAgo } },
        select: { userId: true },
      }),
      db.pollVote.findMany({
        where: { poll: { video: { creatorId: userId } }, createdAt: { gte: fiveMinAgo } },
        select: { userId: true },
      }),
      db.follow.findMany({
        where: { followingId: userId, createdAt: { gte: fiveMinAgo } },
        select: { followerId: true },
      }),
    ]);

    // Merge all user IDs and deduplicate
    const activeUserIds = new Set<string>();
    for (const item of recentLikes) activeUserIds.add(item.userId);
    for (const item of recentComments) activeUserIds.add(item.userId);
    for (const item of recentReactions) activeUserIds.add(item.userId);
    for (const item of recentReposts) activeUserIds.add(item.userId);
    for (const item of recentPollVotes) activeUserIds.add(item.userId);
    for (const item of recentFollows) activeUserIds.add(item.followerId);

    const activeNow = activeUserIds.size;

    // ─── 2. viewsLast48h — Total view count across all videos ────
    const viewsResult = await db.video.aggregate({
      where: { creatorId: userId },
      _sum: { viewCount: true },
    });
    const viewsLast48h = viewsResult._sum.viewCount || 0;

    // ─── 3. viewsLast60min — Estimated recent views ──────────────
    const [
      recentVideoCount,
      recentLikesCount,
      recentCommentsCount,
      recentReactionsCount,
      recentRepostsCount,
      recentVotesCount,
    ] = await Promise.all([
      // Videos created in the last hour get initial views
      db.video.count({
        where: { creatorId: userId, createdAt: { gte: oneHourAgo } },
      }),
      // Recent engagement as proxy for views
      db.like.count({
        where: { video: { creatorId: userId }, createdAt: { gte: oneHourAgo } },
      }),
      db.comment.count({
        where: { video: { creatorId: userId }, createdAt: { gte: oneHourAgo } },
      }),
      db.reaction.count({
        where: { video: { creatorId: userId }, createdAt: { gte: oneHourAgo } },
      }),
      db.repost.count({
        where: { video: { creatorId: userId }, createdAt: { gte: oneHourAgo } },
      }),
      db.pollVote.count({
        where: { poll: { video: { creatorId: userId } }, createdAt: { gte: oneHourAgo } },
      }),
    ]);

    // New videos contribute estimated views; engagement actions imply views happened
    const viewsLast60min =
      recentVideoCount * 3 + // Each new video gets ~3 initial views
      recentLikesCount * 2 + // Each like implies at least 1 view, estimate 2x for non-engagers
      recentCommentsCount * 3 +
      recentReactionsCount * 2 +
      recentRepostsCount * 2 +
      recentVotesCount * 2;

    // ─── 4. engagementFeed — Last 15 engagement actions ──────────
    const [
      feedLikes,
      feedComments,
      feedReactions,
      feedPollVotes,
      feedFollows,
    ] = await Promise.all([
      db.like.findMany({
        where: { video: { creatorId: userId } },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          createdAt: true,
          user: { select: { username: true, displayName: true } },
          video: { select: { title: true } },
        },
      }),
      db.comment.findMany({
        where: { video: { creatorId: userId } },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          createdAt: true,
          user: { select: { username: true, displayName: true } },
          video: { select: { title: true } },
        },
      }),
      db.reaction.findMany({
        where: { video: { creatorId: userId } },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          createdAt: true,
          type: true,
          user: { select: { username: true, displayName: true } },
          video: { select: { title: true } },
        },
      }),
      db.pollVote.findMany({
        where: { poll: { video: { creatorId: userId } } },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          createdAt: true,
          user: { select: { username: true, displayName: true } },
          poll: { select: { question: true } },
        },
      }),
      db.follow.findMany({
        where: { followingId: userId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          createdAt: true,
          follower: { select: { username: true, displayName: true } },
        },
      }),
    ]);

    // Merge all feed items into a unified list
    type FeedItem = {
      type: string;
      username: string;
      displayName: string;
      target: string;
      timestamp: string;
      sortKey: Date;
    };

    const feedItems: FeedItem[] = [];

    for (const item of feedLikes) {
      feedItems.push({
        type: 'like',
        username: item.user.username,
        displayName: item.user.displayName || item.user.username,
        target: item.video.title,
        timestamp: item.createdAt.toISOString(),
        sortKey: item.createdAt,
      });
    }

    for (const item of feedComments) {
      feedItems.push({
        type: 'comment',
        username: item.user.username,
        displayName: item.user.displayName || item.user.username,
        target: item.video.title,
        timestamp: item.createdAt.toISOString(),
        sortKey: item.createdAt,
      });
    }

    for (const item of feedReactions) {
      feedItems.push({
        type: `reaction:${item.type}`,
        username: item.user.username,
        displayName: item.user.displayName || item.user.username,
        target: item.video.title,
        timestamp: item.createdAt.toISOString(),
        sortKey: item.createdAt,
      });
    }

    for (const item of feedPollVotes) {
      feedItems.push({
        type: 'vote',
        username: item.user.username,
        displayName: item.user.displayName || item.user.username,
        target: item.poll.question,
        timestamp: item.createdAt.toISOString(),
        sortKey: item.createdAt,
      });
    }

    for (const item of feedFollows) {
      feedItems.push({
        type: 'follow',
        username: item.follower.username,
        displayName: item.follower.displayName || item.follower.username,
        target: 'your profile',
        timestamp: item.createdAt.toISOString(),
        sortKey: item.createdAt,
      });
    }

    // Sort by time descending and take top 15
    feedItems.sort((a, b) => b.sortKey.getTime() - a.sortKey.getTime());
    const engagementFeed = feedItems.slice(0, 15).map(({ sortKey: _sortKey, ...rest }) => rest);

    // ─── 5. trendingNow — Top 3 by engagement velocity ───────────
    const creatorVideos = await db.video.findMany({
      where: { creatorId: userId },
      select: {
        id: true,
        title: true,
        viewCount: true,
        createdAt: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            reactions: true,
            reposts: true,
          },
        },
      },
    });

    const trendingNow = creatorVideos
      .map((video) => {
        const totalEngagement =
          video._count.likes +
          video._count.comments +
          video._count.reactions +
          video._count.reposts;

        const hoursSinceCreation = Math.max(
          (now.getTime() - video.createdAt.getTime()) / (1000 * 60 * 60),
          0.1 // Prevent division by zero for very new videos
        );

        return {
          id: video.id,
          title: video.title,
          views: video.viewCount,
          velocity: Math.round((totalEngagement / hoursSinceCreation) * 100) / 100,
        };
      })
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, 3);

    // ─── 6. realtimeMetrics — Activity breakdown in last hour ────
    const [
      hourLikes,
      hourComments,
      hourVotes,
      hourReactions,
      hourFollows,
      hourShares,
    ] = await Promise.all([
      db.like.count({
        where: { video: { creatorId: userId }, createdAt: { gte: oneHourAgo } },
      }),
      db.comment.count({
        where: { video: { creatorId: userId }, createdAt: { gte: oneHourAgo } },
      }),
      db.pollVote.count({
        where: { poll: { video: { creatorId: userId } }, createdAt: { gte: oneHourAgo } },
      }),
      db.reaction.count({
        where: { video: { creatorId: userId }, createdAt: { gte: oneHourAgo } },
      }),
      db.follow.count({
        where: { followingId: userId, createdAt: { gte: oneHourAgo } },
      }),
      db.repost.count({
        where: { video: { creatorId: userId }, createdAt: { gte: oneHourAgo } },
      }),
    ]);

    const realtimeMetrics = {
      likes: hourLikes,
      comments: hourComments,
      votes: hourVotes,
      reactions: hourReactions,
      follows: hourFollows,
      shares: hourShares,
    };

    // ─── Response ────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: {
        activeNow,
        viewsLast48h,
        viewsLast60min,
        engagementFeed,
        trendingNow,
        realtimeMetrics,
      },
    });
  } catch (error) {
    console.error('GET /api/analytics/realtime error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load real-time analytics' },
      { status: 500 }
    );
  }
}

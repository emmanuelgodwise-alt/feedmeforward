import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/feed — Social feed with following/discover/all modes
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    const feedType = searchParams.get('type') || 'following'; // 'following' | 'discover' | 'all'

    // Get IDs of users that the current user follows
    const followingRecords = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = followingRecords.map((f) => f.followingId);
    const creatorIds = [...followingIds, userId];

    let videos: Prisma.VideoGetPayload<{
      include: {
        creator: { select: { id: true; username: true; displayName: true; avatarUrl: true; isVerified: true } };
        polls: { include: { votes: { where: { userId: string }; select: { id: true; optionId: true } } } };
        _count: { select: { likes: true; comments: true; responses: true; reposts: true } };
        reactions: { select: { type: true } };
      };
    }>[] = [];

    let total = 0;

    if (feedType === 'following' || feedType === 'all') {
      const where: Prisma.VideoWhereInput = {
        creatorId: { in: creatorIds },
        isPublic: true,
      };

      const fTotal = await db.video.count({ where });
      const fVideos = await db.video.findMany({
        where,
        skip,
        take: feedType === 'all' ? limit : limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
          polls: {
            include: {
              votes: {
                where: { userId },
                select: { id: true, optionId: true },
              },
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              responses: true,
              reposts: true,
            },
          },
          reactions: {
            select: { type: true },
          },
        },
      });

      videos = [...videos, ...fVideos];
      total += fTotal;
    }

    if (feedType === 'discover') {
      const discoverWhere: Prisma.VideoWhereInput = {
        creatorId: { notIn: creatorIds },
        isPublic: true,
      };

      const dTotal = await db.video.count({ where: discoverWhere });
      // Sort by trending score: viewCount * engagement rate
      const dVideos = await db.video.findMany({
        where: discoverWhere,
        skip,
        take: limit,
        orderBy: { viewCount: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
          polls: {
            include: {
              votes: {
                where: { userId },
                select: { id: true, optionId: true },
              },
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              responses: true,
              reposts: true,
            },
          },
          reactions: {
            select: { type: true },
          },
        },
      });

      total = dTotal;
      videos = dVideos;
    }

    if (feedType === 'all') {
      // Merge: add discover videos interleaved (just append for simplicity)
      const discoverWhere: Prisma.VideoWhereInput = {
        creatorId: { notIn: creatorIds },
        isPublic: true,
      };

      const dVideos = await db.video.findMany({
        where: discoverWhere,
        skip: 0,
        take: limit,
        orderBy: { viewCount: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
          polls: {
            include: {
              votes: {
                where: { userId },
                select: { id: true, optionId: true },
              },
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              responses: true,
              reposts: true,
            },
          },
          reactions: {
            select: { type: true },
          },
        },
      });

      // Interleave by createdAt
      const allVideos = [...videos, ...dVideos];
      allVideos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      videos = allVideos.slice(0, limit);

      const discoverTotal = await db.video.count({ where: discoverWhere });
      total = total + discoverTotal;
    }

    // Fetch reposts from followed users for the feed
    let repostItems: Array<{
      id: string;
      type: 'repost';
      quote: string | null;
      createdAt: Date;
      reposter: { id: string; username: string; displayName: string | null; avatarUrl: string | null; isVerified: boolean };
      video: {
        id: string;
        title: string;
        description: string | null;
        videoUrl: string;
        thumbnailUrl: string | null;
        category: string | null;
        status: string;
        viewCount: number;
        createdAt: Date;
        creator: { id: string; username: string; displayName: string | null; avatarUrl: string | null; isVerified: boolean };
        stats: { likes: number; comments: number; responses: number; reposts: number };
      };
    }> = [];

    if (feedType === 'following' || feedType === 'all') {
      const reposts = await db.repost.findMany({
        where: { userId: { in: followingIds } },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
          video: {
            include: {
              creator: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
              _count: { select: { likes: true, comments: true, responses: true, reposts: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      repostItems = reposts.map((r) => ({
        id: `repost-${r.id}`,
        type: 'repost' as const,
        quote: r.quote,
        createdAt: r.createdAt,
        reposter: r.user,
        video: {
          id: r.video.id,
          title: r.video.title,
          description: r.video.description,
          videoUrl: r.video.videoUrl,
          thumbnailUrl: r.video.thumbnailUrl,
          category: r.video.category,
          status: r.video.status,
          viewCount: r.video.viewCount,
          createdAt: r.video.createdAt,
          creator: r.video.creator,
          stats: r.video._count,
        },
      }));
    }

    // Get current user's reactions for all videos in the feed
    const videoIds = videos.map((v) => v.id);
    let userReactionsMap: Record<string, string[]> = {};

    if (videoIds.length > 0) {
      const userReactions = await db.reaction.findMany({
        where: { userId, videoId: { in: videoIds } },
        select: { videoId: true, type: true },
      });

      for (const r of userReactions) {
        if (!userReactionsMap[r.videoId]) {
          userReactionsMap[r.videoId] = [];
        }
        userReactionsMap[r.videoId].push(r.type);
      }
    }

    // Get reaction counts for all videos
    let reactionCountsMap: Record<string, Record<string, number>> = {};

    if (videoIds.length > 0) {
      const reactionAggs = await db.reaction.groupBy({
        by: ['videoId', 'type'],
        where: { videoId: { in: videoIds } },
        _count: true,
      });

      for (const agg of reactionAggs) {
        if (!reactionCountsMap[agg.videoId]) {
          reactionCountsMap[agg.videoId] = {};
        }
        reactionCountsMap[agg.videoId][agg.type] = agg._count;
      }
    }

    // Format the feed
    const feed = videos.map((video) => {
      let pollData = null;
      if (video.polls.length > 0) {
        const mainPoll = video.polls[0];
        const options = mainPoll.options ? JSON.parse(mainPoll.options) : [];
        const totalVotes = options.reduce((sum: number, opt: { voteCount?: number }) => sum + (opt.voteCount || 0), 0);
        const userVote = mainPoll.votes.length > 0 ? mainPoll.votes[0].optionId : null;

        pollData = {
          id: mainPoll.id,
          question: mainPoll.question,
          options,
          isPaid: mainPoll.isPaid,
          rewardPerResponse: mainPoll.rewardPerResponse,
          totalRewardPool: mainPoll.totalRewardPool,
          responseCount: mainPoll.responseCount,
          closesAt: mainPoll.closesAt,
          totalVotes,
          userVotedOptionId: userVote,
        };
      }

      return {
        id: video.id,
        type: video.type,
        title: video.title,
        description: video.description,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        category: video.category,
        tags: video.tags ? JSON.parse(video.tags) : null,
        status: video.status,
        duration: video.duration,
        viewCount: video.viewCount,
        createdAt: video.createdAt,
        creator: video.creator,
        poll: pollData,
        stats: {
          likeCount: video._count.likes,
          commentCount: video._count.comments,
          responseCount: video._count.responses,
          repostCount: video._count.reposts,
        },
        reactionCounts: reactionCountsMap[video.id] || {},
        userReactions: userReactionsMap[video.id] || [],
      };
    });

    return NextResponse.json({
      feed,
      reposts: repostItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      type: feedType,
    });
  } catch (error) {
    console.error('GET /api/feed error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch feed' }, { status: 500 });
  }
}

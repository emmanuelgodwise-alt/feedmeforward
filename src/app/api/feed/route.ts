import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/feed — Social feed of videos from followed users and self
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

    // Get IDs of users that the current user follows
    const followingRecords = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = followingRecords.map((f) => f.followingId);

    // Include own videos as well
    const creatorIds = [...followingIds, userId];

    // Build where clause: videos from followed users OR own videos
    const where: Prisma.VideoWhereInput = {
      creatorId: { in: creatorIds },
      isPublic: true,
    };

    // Get total count
    const total = await db.video.count({ where });

    // Get videos with creator data, polls, vote counts, comment counts
    const videos = await db.video.findMany({
      where,
      skip,
      take: limit,
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
          },
        },
      },
    });

    // Format the feed
    const feed = videos.map((video) => {
      // Check if user has voted on any poll in this video
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
        },
      };
    });

    return NextResponse.json({
      feed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/feed error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch feed' }, { status: 500 });
  }
}

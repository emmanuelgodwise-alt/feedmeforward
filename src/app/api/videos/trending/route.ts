import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function getPeriodCutoff(period: string): Date {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '24h':
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

function getRecentBoostMultiplier(videoCreatedAt: string, period: string): number {
  const created = new Date(videoCreatedAt);
  const now = new Date();
  const ageMs = now.getTime() - created.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  // More recent videos within the period get a higher boost
  let periodHours = 24;
  if (period === '7d') periodHours = 168;
  if (period === '30d') periodHours = 720;

  // If the video is very new (within 1/4 of the period), give extra boost
  const quarterPeriod = periodHours / 4;
  if (ageHours <= quarterPeriod) {
    return 2.0; // 2x boost for very recent content
  }
  if (ageHours <= quarterPeriod * 2) {
    return 1.5; // 1.5x for recent
  }
  if (ageHours <= quarterPeriod * 3) {
    return 1.2; // 1.2x for somewhat recent
  }
  return 1.0;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let period = searchParams.get('period') || '24h';
    let limit = parseInt(searchParams.get('limit') || '10', 10);
    const category = searchParams.get('category') || null;

    // Validate period
    if (!['24h', '7d', '30d'].includes(period)) {
      period = '24h';
    }

    // Validate limit
    limit = Math.max(1, Math.min(50, limit));

    const cutoff = getPeriodCutoff(period);

    // Fetch videos created within the period, with counts
    const videos = await db.video.findMany({
      where: {
        createdAt: { gte: cutoff },
        isPublic: true,
        ...(category ? { category } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        videoUrl: true,
        thumbnailUrl: true,
        type: true,
        category: true,
        tags: true,
        status: true,
        viewCount: true,
        createdAt: true,
        creatorId: true,
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            responses: true,
            polls: true,
          },
        },
        polls: {
          select: {
            _count: {
              select: { votes: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate trending score for each video
    const trendingVideos = videos.map((video) => {
      const views = video.viewCount || 0;
      const likes = video._count.likes || 0;
      const comments = video._count.comments || 0;
      const responses = video._count.responses || 0;
      const votes = video.polls.reduce((sum, poll) => sum + (poll._count?.votes || 0), 0);

      // Calculate recent boost multiplier
      const recentBoost = getRecentBoostMultiplier(video.createdAt.toISOString(), period);

      // Trending score formula
      const trendingScore =
        (views * 1) +
        (likes * 5) +
        (comments * 4) +
        (responses * 8) +
        (votes * 3);

      // Apply recent boost
      const boostedScore = Math.round(trendingScore * recentBoost);

      return {
        id: video.id,
        title: video.title,
        description: video.description,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        type: video.type,
        category: video.category,
        tags: video.tags,
        status: video.status,
        viewCount: views,
        createdAt: video.createdAt.toISOString(),
        creatorId: video.creatorId,
        likeCount: likes,
        commentCount: comments,
        responseCount: responses,
        voteCount: votes,
        trendingScore: boostedScore,
        creator: {
          id: video.creator.id,
          username: video.creator.username,
          displayName: video.creator.displayName,
          avatarUrl: video.creator.avatarUrl,
          isVerified: video.creator.isVerified,
        },
      };
    });

    // Sort by trending score descending
    trendingVideos.sort((a, b) => b.trendingScore - a.trendingScore);

    // Apply limit
    const result = trendingVideos.slice(0, limit);

    // Add rank numbers
    const ranked = result.map((video, index) => ({
      ...video,
      rank: index + 1,
    }));

    return NextResponse.json({
      success: true,
      data: ranked,
      meta: {
        period,
        total: trendingVideos.length,
        returned: ranked.length,
      },
    });
  } catch (error) {
    console.error('Error fetching trending videos:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trending videos' },
      { status: 500 }
    );
  }
}

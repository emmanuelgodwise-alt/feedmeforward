import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/feed/reposts — Reposts from followed users in feed format
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

    // Get IDs of followed users
    const followingRecords = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = followingRecords.map((f) => f.followingId);

    // Get reposts from followed users
    const reposts = await db.repost.findMany({
      where: {
        userId: { in: followingIds },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        video: {
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
            _count: {
              select: {
                likes: true,
                comments: true,
                responses: true,
                reposts: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await db.repost.count({
      where: { userId: { in: followingIds } },
    });

    const feed = reposts.map((r) => ({
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
        type: r.video.type,
        category: r.video.category,
        status: r.video.status,
        viewCount: r.video.viewCount,
        createdAt: r.video.createdAt,
        creator: r.video.creator,
        stats: r.video._count,
      },
    }));

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
    console.error('GET /api/feed/reposts error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch repost feed' }, { status: 500 });
  }
}

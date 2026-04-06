import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkVideoWorthy } from '@/lib/ad-worthy';

// GET /api/ads/eligible-videos — List Worthy Videos for Ad Placement
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    const category = searchParams.get('category') || undefined;

    // Base query: lead type videos with at least one poll, active status
    const where: Record<string, unknown> = {
      type: 'lead',
      status: 'active',
      isPublic: true,
      polls: { some: {} },
    };

    if (category) {
      where.category = category;
    }

    // Fetch candidates ordered by viewCount desc
    const candidates = await db.video.findMany({
      where,
      orderBy: { viewCount: 'desc' },
      skip,
      take: limit * 3, // Fetch extra to filter for worthiness
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        category: true,
        tags: true,
        viewCount: true,
        createdAt: true,
        creatorId: true,
        type: true,
        polls: { select: { id: true } },
        reactions: { select: { id: true } },
        reports: {
          select: { id: true, status: true },
          where: { status: 'pending' },
        },
        creator: {
          select: { id: true, username: true, displayName: true, memberScore: true, isVerified: true },
        },
        _count: {
          select: { likes: true, comments: true, responses: true },
        },
      },
    });

    // Check worthiness for each candidate
    const worthyVideos: Array<Record<string, unknown>> = [];
    for (const video of candidates) {
      const breakdown = await checkVideoWorthy(video.id);
      if (breakdown && breakdown.isWorthy) {
        // Count poll votes
        const pollIds = video.polls.map((p) => p.id);
        let pollVotes = 0;
        if (pollIds.length > 0) {
          const voteAgg = await db.pollVote.groupBy({
            by: ['pollId'],
            where: { pollId: { in: pollIds } },
            _count: { id: true },
          });
          pollVotes = voteAgg.reduce((sum, v) => sum + v._count.id, 0);
        }

        worthyVideos.push({
          id: video.id,
          title: video.title,
          description: video.description,
          thumbnailUrl: video.thumbnailUrl,
          category: video.category,
          tags: video.tags ? JSON.parse(video.tags) : null,
          viewCount: video.viewCount,
          createdAt: video.createdAt,
          creator: video.creator,
          likeCount: video._count.likes,
          commentCount: video._count.comments,
          responseCount: video._count.responses,
          pollCount: video.polls.length,
          pollVotes,
          reactionCount: video.reactions.length,
          worthiness: breakdown,
        });

        if (worthyVideos.length >= limit) break;
      }
    }

    // Count total worthy videos (approximate via lead + polls + viewCount threshold)
    const totalWorthy = await db.video.count({
      where: {
        type: 'lead',
        status: 'active',
        isPublic: true,
        polls: { some: {} },
        viewCount: { gte: 500 },
        creator: { memberScore: { gte: 200 } },
        reports: { none: { status: 'pending' } },
      },
    });

    return NextResponse.json({
      success: true,
      data: worthyVideos,
      pagination: {
        page,
        limit,
        total: totalWorthy,
        totalPages: Math.ceil(totalWorthy / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/ads/eligible-videos error:', error);
    return NextResponse.json({ error: 'Failed to fetch eligible videos' }, { status: 500 });
  }
}

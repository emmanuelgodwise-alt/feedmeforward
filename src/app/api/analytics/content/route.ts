import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/analytics/content — Content performance analytics (YouTube-like table)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sortBy') || 'views';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const type = searchParams.get('type') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';

    const where: Record<string, unknown> = { creatorId: userId };
    if (type === 'lead') where.type = 'lead';
    else if (type === 'response') where.type = 'response';
    if (search) where.title = { contains: search };

    const orderBy: Record<string, string> = {};
    if (sortBy === 'views') orderBy.viewCount = sortOrder;
    else if (sortBy === 'date') orderBy.createdAt = sortOrder;
    else if (sortBy === 'likes') orderBy.createdAt = sortOrder; // fallback — likes is relation
    else orderBy.createdAt = 'desc';

    const [videos, totalCount] = await Promise.all([
      db.video.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, title: true, description: true, type: true, status: true,
          createdAt: true, viewCount: true, thumbnailUrl: true, isPublic: true,
          _count: { select: { likes: true, comments: true, savedBy: true, reactions: true, reposts: true } },
          polls: { select: { id: true, question: true, responseCount: true, isPaid: true, options: true, closesAt: true } },
          reactions: { select: { type: true } },
        },
      }),
      db.video.count({ where }),
    ]);

    const contentPerformance = videos.map((v) => {
      const views = v.viewCount || 0;
      const likes = v._count.likes;
      const comments = v._count.comments;
      const saves = v._count.savedBy;
      const reposts = v._count.reposts;
      const engagementRate = views > 0 ? ((likes + comments + saves + reposts) / views) * 100 : 0;

      // Reaction breakdown
      const reactionCounts: Record<string, number> = {};
      for (const r of v.reactions) {
        reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
      }

      // Poll data
      let pollData: { id: string; question: string; totalVotes: number; isPaid: boolean; leadingOption: string | null; leadingPercentage: string } | null = null;
      if (v.polls.length > 0) {
        const mainPoll = v.polls[0];
        const options = JSON.parse(mainPoll.options as string) as Array<{ id: string; text: string; voteCount: number }>;
        const totalVotes = mainPoll.responseCount;
        const leading = [...options].sort((a, b) => b.voteCount - a.voteCount)[0];
        pollData = {
          id: mainPoll.id,
          question: mainPoll.question,
          totalVotes,
          isPaid: mainPoll.isPaid,
          leadingOption: leading ? leading.text : null,
          leadingPercentage: leading && totalVotes > 0 ? ((leading.voteCount / totalVotes) * 100).toFixed(1) : '0',
        };
      }

      return {
        id: v.id,
        title: v.title,
        type: v.type,
        status: v.status,
        createdAt: v.createdAt.toISOString(),
        views,
        likes,
        comments,
        saves,
        reposts,
        engagementRate: Math.round(engagementRate * 10) / 10,
        reactions: reactionCounts,
        poll: pollData,
        thumbnailUrl: v.thumbnailUrl,
        isPublic: v.isPublic,
      };
    });

    // Category breakdown
    const categories = await db.video.groupBy({
      by: ['category'],
      where: { creatorId: userId },
      _count: true,
      _sum: { viewCount: true },
      orderBy: { _sum: { viewCount: 'desc' } },
    });

    // Type breakdown
    const leadCount = await db.video.count({ where: { creatorId: userId, type: 'lead' } });
    const responseCount = await db.video.count({ where: { creatorId: userId, type: 'response' } });

    return NextResponse.json({
      success: true,
      data: {
        content: contentPerformance,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        summary: {
          leadCount,
          responseCount,
          categories: categories.map((c) => ({
            category: c.category || 'Uncategorized',
            count: c._count,
            views: c._sum.viewCount || 0,
          })),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/analytics/content error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load content analytics' }, { status: 500 });
  }
}

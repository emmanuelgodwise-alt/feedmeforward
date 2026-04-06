import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users/[userId]/reposts — Get videos reposted by user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const reposts = await db.repost.findMany({
      where: { userId },
      include: {
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

    const total = await db.repost.count({ where: { userId } });

    const data = reposts.map((r) => ({
      id: r.id,
      quote: r.quote,
      createdAt: r.createdAt,
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
      reposts: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/users/[userId]/reposts error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reposts' }, { status: 500 });
  }
}

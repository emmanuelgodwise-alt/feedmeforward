import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/hashtags/[tag] — Get videos by hashtag
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params;

    // Normalize tag: strip # prefix, lowercase
    const normalizedTag = tag.replace(/^#/, '').toLowerCase();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const sort = searchParams.get('sort') || 'latest'; // latest or popular
    const skip = (page - 1) * limit;

    // Find the hashtag
    const hashtag = await db.hashtag.findUnique({
      where: { tag: normalizedTag },
    });

    if (!hashtag) {
      return NextResponse.json({ success: false, error: 'Hashtag not found' }, { status: 404 });
    }

    // Get video IDs associated with this hashtag
    const videoHashtags = await db.videoHashtag.findMany({
      where: { hashtagId: hashtag.id },
      select: { videoId: true },
    });

    const videoIds = videoHashtags.map((vh) => vh.videoId);

    if (videoIds.length === 0) {
      return NextResponse.json({
        success: true,
        hashtag: { tag: hashtag.tag, useCount: hashtag.useCount },
        videos: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    // Build where clause for videos
    const where = {
      id: { in: videoIds },
      isPublic: true,
    };

    const orderBy = sort === 'popular'
      ? { viewCount: 'desc' as const }
      : { createdAt: 'desc' as const };

    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          creator: {
            select: { id: true, username: true, isVerified: true },
          },
          _count: {
            select: { polls: true, likes: true, comments: true, responses: true },
          },
        },
      }),
      db.video.count({ where }),
    ]);

    const parsed = videos.map((v) => ({
      ...v,
      tags: v.tags ? JSON.parse(v.tags) : null,
    }));

    return NextResponse.json({
      success: true,
      hashtag: { tag: hashtag.tag, useCount: hashtag.useCount },
      videos: parsed,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/hashtags/[tag] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch hashtag videos' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { recalculateScore } from '@/lib/score-engine';

// GET /api/videos — List videos with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const creatorId = searchParams.get('creatorId') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      isPublic: true,
    };

    if (type) where.type = type;
    if (status) where.status = status;
    if (category) where.category = category;
    if (creatorId) where.creatorId = creatorId;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [videos, total] = await Promise.all([
      db.video.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      data: parsed,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/videos error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch videos' }, { status: 500 });
  }
}

// POST /api/videos — Create a new video
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, videoUrl, thumbnailUrl, category, tags, type, parentVideoId } = body;

    // Validate
    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (!videoUrl || typeof videoUrl !== 'string') {
      return NextResponse.json({ success: false, error: 'Video URL is required' }, { status: 400 });
    }
    try {
      new URL(videoUrl);
    } catch {
      return NextResponse.json({ success: false, error: 'Video URL must be a valid URL' }, { status: 400 });
    }

    // Validate parentVideoId if provided
    if (parentVideoId) {
      const parent = await db.video.findUnique({ where: { id: parentVideoId } });
      if (!parent) {
        return NextResponse.json({ success: false, error: 'Parent video not found' }, { status: 404 });
      }
    }

    const video = await db.video.create({
      data: {
        creatorId: userId,
        title: title.trim(),
        description: description?.trim() || null,
        videoUrl,
        thumbnailUrl: thumbnailUrl || null,
        category: category || null,
        tags: tags && Array.isArray(tags) && tags.length > 0 ? JSON.stringify(tags) : null,
        type: type || 'lead',
        parentVideoId: parentVideoId || null,
        status: 'active',
      },
      include: {
        creator: { select: { id: true, username: true } },
      },
    });

    // Trigger score recalculation for the creator (fire and forget)
    recalculateScore(userId).catch((err) => console.error('Score recalc failed:', err));

    return NextResponse.json({ success: true, data: { ...video, tags: video.tags ? JSON.parse(video.tags) : null } }, { status: 201 });
  } catch (error) {
    console.error('POST /api/videos error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create video' }, { status: 500 });
  }
}

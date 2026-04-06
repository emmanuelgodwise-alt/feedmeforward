import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/live/sessions — Create a live session
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, category, tags, scheduledAt, isRecorded } = body;

    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const session = await db.liveSession.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        category: category?.trim() || null,
        tags: tags ? JSON.stringify(tags) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        isRecorded: isRecorded === true,
        creatorId: userId,
        status: 'upcoming',
      },
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
        },
      },
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Create live session error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create session' }, { status: 500 });
  }
}

// GET /api/live/sessions — List live sessions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'live';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const category = searchParams.get('category') || undefined;

    const where: Record<string, unknown> = {};
    if (status === 'all') {
      // no filter
    } else {
      where.status = status;
    }
    if (category) {
      where.category = category;
    }

    const sessions = await db.liveSession.findMany({
      where,
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        ...(status === 'live' ? [{ viewerCount: 'desc' }] : []),
        ...(status === 'upcoming' ? [{ scheduledAt: 'asc' }] : []),
        ...(status === 'ended' ? [{ startedAt: 'desc' }] : []),
        { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    });

    // For "all" status, manually sort: live first, then upcoming, then ended
    let sortedSessions = sessions;
    if (status === 'all') {
      const order: Record<string, number> = { live: 0, upcoming: 1, recording: 2, ended: 3 };
      sortedSessions = [...sessions].sort((a, b) => {
        const aOrder = order[a.status] ?? 9;
        const bOrder = order[b.status] ?? 9;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return b.viewerCount - a.viewerCount;
      });
    }

    const total = await db.liveSession.count({ where });

    return NextResponse.json({
      success: true,
      sessions: sortedSessions,
      total,
    });
  } catch (error) {
    console.error('List live sessions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

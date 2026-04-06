import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/live/sessions/[id]/chat — Get live chat messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const before = searchParams.get('before') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const session = await db.liveSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const where: Record<string, unknown> = { sessionId: id };
    if (before) {
      (where as { createdAt: { lt: Date } }).createdAt = { lt: new Date(before) };
    }

    const messages = await db.liveChatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      messages: messages.reverse(), // return chronological order
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get messages' }, { status: 500 });
  }
}

// POST /api/live/sessions/[id]/chat — Send chat message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Message content is required' }, { status: 400 });
    }

    if (content.trim().length > 500) {
      return NextResponse.json({ success: false, error: 'Message too long (max 500 chars)' }, { status: 400 });
    }

    const session = await db.liveSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'live') {
      return NextResponse.json({ success: false, error: 'Session is not live' }, { status: 400 });
    }

    if (!session.chatEnabled) {
      return NextResponse.json({ success: false, error: 'Chat is disabled for this session' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const message = await db.liveChatMessage.create({
      data: {
        sessionId: id,
        userId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        content: content.trim(),
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Send chat message error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}

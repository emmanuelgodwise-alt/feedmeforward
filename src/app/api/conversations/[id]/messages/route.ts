import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/conversations/[id]/messages — Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Verify membership
    const membership = await db.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: id, userId } },
    });

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Not a member of this conversation' }, { status: 403 });
    }

    const body = await request.json();
    const { type = 'text', content, mediaUrl, replyToId } = body;

    // Validate
    if (type === 'text' && (!content || typeof content !== 'string' || content.trim().length === 0)) {
      return NextResponse.json({ success: false, error: 'content is required for text messages' }, { status: 400 });
    }

    if (type === 'system') {
      return NextResponse.json({ success: false, error: 'System messages are not allowed' }, { status: 400 });
    }

    if (content && content.length > 5000) {
      return NextResponse.json({ success: false, error: 'Message content too long' }, { status: 400 });
    }

    // Verify reply target exists
    if (replyToId) {
      const replyTarget = await db.message.findUnique({
        where: { id: replyToId },
      });
      if (!replyTarget || replyTarget.conversationId !== id) {
        return NextResponse.json({ success: false, error: 'Reply target not found' }, { status: 400 });
      }
    }

    // Create message
    const message = await db.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        type,
        content: content?.trim() || null,
        mediaUrl: mediaUrl || null,
        replyToId: replyToId || null,
      },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        replyTo: replyToId ? {
          select: {
            id: true,
            content: true,
            senderId: true,
            sender: {
              select: { id: true, username: true, displayName: true },
            },
          },
        } : false,
      },
    });

    // Update conversation activity
    await db.conversation.update({
      where: { id },
      data: {
        lastMessage: content?.trim() || `[${type}]`,
        lastActivityAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    console.error('POST /api/conversations/[id]/messages error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}

// GET /api/conversations/[id]/messages — Get messages (paginated)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));
    const before = searchParams.get('before');

    // Verify membership
    const membership = await db.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: id, userId } },
    });

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Not a member' }, { status: 403 });
    }

    // Build where
    const where: Record<string, unknown> = { conversationId: id };
    if (before) {
      const beforeMsg = await db.message.findUnique({ where: { id: before } });
      if (beforeMsg) {
        where.createdAt = { lt: beforeMsg.createdAt };
      }
    }

    const messages = await db.message.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            sender: {
              select: { id: true, username: true, displayName: true },
            },
          },
        },
      },
    });

    const hasMore = messages.length > limit;
    const trimmed = hasMore ? messages.slice(0, limit) : messages;

    return NextResponse.json({ messages: trimmed.reverse(), hasMore });
  } catch (error) {
    console.error('GET /api/conversations/[id]/messages error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 });
  }
}

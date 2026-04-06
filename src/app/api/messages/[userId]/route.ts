import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/messages/[userId] — Get conversation messages with a specific user (legacy)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { userId: targetUserId } = await params;

    const { searchParams } = new URL(request.url);
    let limit = parseInt(searchParams.get('limit') || '50', 10);
    limit = Math.max(1, Math.min(200, limit));

    // Find direct conversation between the two users
    const memberships = await db.conversationMember.findMany({
      where: {
        userId: { in: [userId, targetUserId] },
        conversation: { type: 'direct' },
      },
    });

    let conversationId: string | null = null;
    for (const member of memberships) {
      const otherMember = memberships.find(
        (m) => m.conversationId === member.conversationId && m.userId !== member.userId
      );
      if (otherMember) {
        conversationId = member.conversationId;
        break;
      }
    }

    if (!conversationId) {
      return NextResponse.json({ messages: [], hasMore: false });
    }

    // Update last read
    await db.conversationMember.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });

    // Fetch messages
    const messages = await db.message.findMany({
      where: { conversationId },
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    const hasMore = messages.length > limit;
    const trimmedMessages = hasMore ? messages.slice(0, limit) : messages;

    return NextResponse.json({
      messages: trimmedMessages,
      hasMore,
    });
  } catch (error) {
    console.error('GET /api/messages/[userId] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

// DELETE /api/messages/[userId] — Delete a message by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { userId: messageId } = await params;

    const message = await db.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
    }

    if (message.senderId !== userId) {
      return NextResponse.json({ success: false, error: 'You can only delete your own messages' }, { status: 403 });
    }

    await db.message.delete({
      where: { id: messageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/messages/[userId] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete message' }, { status: 500 });
  }
}

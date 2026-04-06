import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/conversations/[id] — Get conversation detail
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

    // Verify user is a member
    const membership = await db.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: id, userId } },
    });

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Not a member of this conversation' }, { status: 403 });
    }

    // Get conversation with members and messages
    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
            },
          },
        },
        messages: {
          take: 50,
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
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    // Mark messages as read
    await db.conversationMember.update({
      where: { conversationId_userId: { conversationId: id, userId } },
      data: { lastReadAt: new Date() },
    });

    // Reverse messages so they're in chronological order
    const messages = [...conversation.messages].reverse();

    return NextResponse.json({
      conversation: {
        ...conversation,
        messages,
        members: conversation.members.map((m) => ({ ...m.user, role: m.role, lastReadAt: m.lastReadAt })),
      },
    });
  } catch (error) {
    console.error('GET /api/conversations/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

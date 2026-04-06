import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/messages — Send a message (legacy: creates a direct conversation + message)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { receiverId, content } = body;

    if (!receiverId || typeof receiverId !== 'string') {
      return NextResponse.json({ success: false, error: 'receiverId is required' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ success: false, error: 'content is required' }, { status: 400 });
    }

    if (content.trim().length < 1 || content.trim().length > 2000) {
      return NextResponse.json({ success: false, error: 'content must be between 1 and 2000 characters' }, { status: 400 });
    }

    if (receiverId === userId) {
      return NextResponse.json({ success: false, error: 'Cannot send a message to yourself' }, { status: 400 });
    }

    const receiver = await db.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });

    if (!receiver) {
      return NextResponse.json({ success: false, error: 'Receiver not found' }, { status: 404 });
    }

    // Find or create direct conversation between the two users
    const existingMembers = await db.conversationMember.findMany({
      where: {
        userId: { in: [userId, receiverId] },
      },
      include: {
        conversation: true,
      },
    });

    // Find a direct conversation that both users are members of
    let conversationId: string | null = null;
    for (const member of existingMembers) {
      if (member.conversation.type !== 'direct') continue;
      const otherMember = existingMembers.find(
        (m) => m.conversationId === member.conversationId && m.userId !== member.userId
      );
      if (otherMember) {
        conversationId = member.conversationId;
        break;
      }
    }

    if (!conversationId) {
      // Create a new direct conversation
      const conversation = await db.conversation.create({
        data: {
          type: 'direct',
        },
      });
      await db.conversationMember.createMany({
        data: [
          { conversationId: conversation.id, userId, role: 'member' },
          { conversationId: conversation.id, userId: receiverId, role: 'member' },
        ],
      });
      conversationId = conversation.id;
    }

    // Create the message
    const message = await db.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: 'text',
        content: content.trim(),
      },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Update conversation last activity
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: content.trim(),
        lastActivityAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    console.error('POST /api/messages error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}

// GET /api/messages — Get conversations list (now uses Conversation model)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Get all conversations the user is a member of
    const memberships = await db.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
                },
              },
            },
          },
        },
      },
      orderBy: { conversation: { lastActivityAt: 'desc' } },
    });

    const conversations = await Promise.all(
      memberships.map(async (membership) => {
        const conv = membership.conversation;
        const otherMembers = conv.members.filter((m) => m.userId !== userId);
        const otherUser = otherMembers.length === 1 ? otherMembers[0].user : null;

        // Count unread messages
        const unreadCount = await db.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            createdAt: { gt: membership.lastReadAt },
          },
        });

        return {
          id: conv.id,
          type: conv.type,
          name: conv.name,
          avatarUrl: conv.avatarUrl,
          lastMessage: conv.lastMessage,
          lastActivityAt: conv.lastActivityAt,
          memberCount: conv.members.length,
          otherUser: otherUser ? {
            id: otherUser.id,
            username: otherUser.username,
            displayName: otherUser.displayName,
            avatarUrl: otherUser.avatarUrl,
            isVerified: otherUser.isVerified,
          } : null,
          unreadCount,
        };
      })
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('GET /api/messages error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

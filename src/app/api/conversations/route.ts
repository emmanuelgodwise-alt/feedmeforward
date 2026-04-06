import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/conversations — Create a conversation
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { participantIds, type = 'direct', name } = body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ success: false, error: 'participantIds is required' }, { status: 400 });
    }

    // For direct messages, check if conversation already exists
    if (type === 'direct') {
      if (participantIds.length !== 1) {
        return NextResponse.json({ success: false, error: 'Direct conversation requires exactly 1 participant' }, { status: 400 });
      }

      const otherUserId = participantIds[0];
      if (otherUserId === userId) {
        return NextResponse.json({ success: false, error: 'Cannot create a conversation with yourself' }, { status: 400 });
      }

      // Check if a direct conversation already exists
      const myMemberships = await db.conversationMember.findMany({
        where: { userId },
        select: { conversationId: true },
      });

      for (const membership of myMemberships) {
        const conversation = await db.conversation.findUnique({
          where: { id: membership.conversationId },
          include: {
            members: {
              select: { userId: true },
            },
          },
        });

        if (conversation && conversation.type === 'direct') {
          const memberIds = conversation.members.map((m) => m.userId);
          if (memberIds.includes(otherUserId)) {
            // Return existing conversation with member data
            const members = await db.conversationMember.findMany({
              where: { conversationId: conversation.id },
              include: {
                user: {
                  select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
                },
              },
            });

            return NextResponse.json({
              success: true,
              conversation: {
                ...conversation,
                members: members.map((m) => ({ ...m.user, role: m.role })),
              },
            });
          }
        }
      }
    }

    // For group conversations, validate
    if (type === 'group') {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ success: false, error: 'Group name is required' }, { status: 400 });
      }
    }

    // Verify all participants exist
    const allParticipantIds = [userId, ...participantIds];
    const existingUsers = await db.user.findMany({
      where: { id: { in: allParticipantIds } },
      select: { id: true },
    });

    const foundIds = new Set(existingUsers.map((u) => u.id));
    for (const pid of allParticipantIds) {
      if (!foundIds.has(pid)) {
        return NextResponse.json({ success: false, error: `User ${pid} not found` }, { status: 404 });
      }
    }

    // Create conversation
    const conversation = await db.conversation.create({
      data: {
        type,
        name: type === 'group' ? name.trim() : null,
      },
    });

    // Add all members
    await db.conversationMember.createMany({
      data: [
        // Creator is admin for groups, member for direct
        { conversationId: conversation.id, userId, role: type === 'group' ? 'admin' : 'member' },
        // Other participants are members
        ...participantIds.map((pid: string) => ({
          conversationId: conversation.id,
          userId: pid,
          role: 'member' as const,
        })),
      ],
    });

    // Get members with user data
    const members = await db.conversationMember.findMany({
      where: { conversationId: conversation.id },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        conversation: {
          ...conversation,
          members: members.map((m) => ({ ...m.user, role: m.role })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/conversations error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create conversation' }, { status: 500 });
  }
}

// GET /api/conversations — List user's conversations
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '30', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

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
      skip: offset,
      take: limit,
    });

    const conversations = await Promise.all(
      memberships.map(async (membership) => {
        const conv = membership.conversation;
        const otherMembers = conv.members.filter((m) => m.userId !== userId);
        const otherUser = otherMembers.length === 1 ? otherMembers[0].user : null;

        // Count unread
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
    console.error('GET /api/conversations error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

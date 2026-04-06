import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/conversations/[id]/members — Add member to group
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

    // Verify conversation is a group
    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true } },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.type !== 'group') {
      return NextResponse.json({ success: false, error: 'Can only add members to group conversations' }, { status: 400 });
    }

    // Verify requester is a member
    const requesterMembership = conversation.members.find((m) => m.userId === userId);
    if (!requesterMembership) {
      return NextResponse.json({ success: false, error: 'Not a member' }, { status: 403 });
    }

    const body = await request.json();
    const { userId: newUserId } = body;

    if (!newUserId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }

    // Check if already a member
    const existingMember = conversation.members.find((m) => m.userId === newUserId);
    if (existingMember) {
      return NextResponse.json({ success: false, error: 'User is already a member' }, { status: 409 });
    }

    // Verify user exists
    const newMember = await db.user.findUnique({
      where: { id: newUserId },
      select: { id: true, username: true },
    });

    if (!newMember) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Add member
    await db.conversationMember.create({
      data: {
        conversationId: id,
        userId: newUserId,
        role: 'member',
      },
    });

    // Create system message
    const senderUser = conversation.members.find((m) => m.userId === userId);
    await db.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        type: 'system',
        content: JSON.stringify({
          action: 'member_added',
          username: newMember.username,
          addedBy: senderUser?.user.username || 'Unknown',
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/conversations/[id]/members error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add member' }, { status: 500 });
  }
}

// DELETE /api/conversations/[id]/members — Leave group or remove member
export async function DELETE(
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
    const targetUserId = searchParams.get('userId');

    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true } },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    // If removing another user, verify requester is admin
    if (targetUserId && targetUserId !== userId) {
      const requesterMembership = conversation.members.find((m) => m.userId === userId);
      if (!requesterMembership || requesterMembership.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Only admins can remove members' }, { status: 403 });
      }
    }

    const removingUserId = targetUserId || userId;
    const removingMember = conversation.members.find((m) => m.userId === removingUserId);

    if (!removingMember) {
      return NextResponse.json({ success: false, error: 'User is not a member' }, { status: 404 });
    }

    // Delete membership
    await db.conversationMember.delete({
      where: { conversationId_userId: { conversationId: id, userId: removingUserId } },
    });

    // System message
    await db.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        type: 'system',
        content: JSON.stringify({
          action: 'member_removed',
          username: removingMember.user.username,
        }),
      },
    });

    // If last admin left, delete the conversation
    const remainingMembers = conversation.members.filter((m) => m.userId !== removingUserId);
    const remainingAdmins = remainingMembers.filter((m) => m.role === 'admin');

    if (remainingAdmins.length === 0 && remainingMembers.length > 0) {
      // Promote first remaining member to admin
      await db.conversationMember.update({
        where: { conversationId_userId: { conversationId: id, userId: remainingMembers[0].userId } },
        data: { role: 'admin' },
      });
    }

    if (remainingMembers.length === 0) {
      // No members left, delete conversation
      await db.conversation.delete({ where: { id } });
      return NextResponse.json({ success: true, deleted: true });
    }

    return NextResponse.json({ success: true, deleted: false });
  } catch (error) {
    console.error('DELETE /api/conversations/[id]/members error:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove member' }, { status: 500 });
  }
}

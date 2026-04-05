import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { createNotification } from '@/lib/notifications';

// POST /api/messages — Send a message
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

    // Cannot send to self
    if (receiverId === userId) {
      return NextResponse.json({ success: false, error: 'Cannot send a message to yourself' }, { status: 400 });
    }

    // Verify receiver exists
    const receiver = await db.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });

    if (!receiver) {
      return NextResponse.json({ success: false, error: 'Receiver not found' }, { status: 404 });
    }

    const message = await db.message.create({
      data: {
        senderId: userId,
        receiverId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Create notification for receiver
    createNotification({
      userId: receiverId,
      fromUserId: userId,
      type: 'comment',
      title: 'New Message',
      message: content.trim().length > 100 ? content.trim().substring(0, 100) + '...' : content.trim(),
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    console.error('POST /api/messages error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}

// GET /api/messages — Get conversations list
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Get all messages where user is sender or receiver
    const messages = await db.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        content: true,
        isRead: true,
        createdAt: true,
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
        },
        receiver: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true },
        },
      },
    });

    // Group by conversation partner and get latest message per conversation
    const conversationMap = new Map<string, {
      otherUser: {
        id: string;
        username: string;
        displayName: string | null;
        avatarUrl: string | null;
        isVerified: boolean;
      };
      lastMessage: {
        id: string;
        content: string;
        createdAt: Date;
        senderId: string;
        receiverId: string;
        isRead: boolean;
      };
      unreadCount: number;
    }>();

    for (const msg of messages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;

      if (!conversationMap.has(partnerId)) {
        const unreadCount = messages.filter(
          (m) => m.senderId === partnerId && m.receiverId === userId && !m.isRead
        ).length;

        conversationMap.set(partnerId, {
          otherUser,
          lastMessage: {
            id: msg.id,
            content: msg.content,
            createdAt: msg.createdAt,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            isRead: msg.isRead,
          },
          unreadCount,
        });
      }
    }

    // Sort by latest message createdAt desc
    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('GET /api/messages error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

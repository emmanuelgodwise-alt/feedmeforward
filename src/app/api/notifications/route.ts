import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/notifications — List notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.NotificationWhereInput = {
      userId,
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    // Get total count and unread count in parallel
    const [total, unreadCount] = await Promise.all([
      db.notification.count({ where }),
      db.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    // Get notifications with fromUser and video data
    const notifications = await db.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
          },
        },
      },
    });

    const formattedNotifications = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt,
      fromUser: n.fromUser
        ? {
            id: n.fromUser.id,
            username: n.fromUser.username,
            displayName: n.fromUser.displayName,
            avatarUrl: n.fromUser.avatarUrl,
          }
        : null,
      video: n.video
        ? {
            id: n.video.id,
            title: n.video.title,
            thumbnailUrl: n.video.thumbnailUrl,
          }
        : null,
    }));

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  }

  try {
    // Run counts in parallel for efficiency
    const [unreadNotifications, unreadMessages] = await Promise.all([
      db.notification.count({
        where: { userId, isRead: false },
      }),
      db.message.count({
        where: {
          conversation: {
            members: {
              some: { userId },
            },
          },
          senderId: { not: userId },
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json({
      hasNewEvents: unreadNotifications > 0 || unreadMessages > 0,
      unreadNotifications,
      unreadMessages,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[realtime/poll] Error checking events:', error);
    return NextResponse.json(
      { error: 'Failed to check events' },
      { status: 500 }
    );
  }
}

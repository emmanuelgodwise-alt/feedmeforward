import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/messages/unread-count — Get total unread message count
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const unreadCount = await db.message.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error('GET /api/messages/unread-count error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch unread count' }, { status: 500 });
  }
}

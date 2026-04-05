import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/notifications/[id] — Mark a notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: notificationId } = await params;

    // Find the notification and verify it belongs to the current user
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true },
    });

    if (!notification) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }

    if (notification.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Mark as read
    await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/notifications/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to mark notification as read' }, { status: 500 });
  }
}

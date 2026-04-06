import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/conversations/[id]/read — Mark conversation as read
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

    const membership = await db.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: id, userId } },
    });

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Not a member' }, { status: 403 });
    }

    await db.conversationMember.update({
      where: { conversationId_userId: { conversationId: id, userId } },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/conversations/[id]/read error:', error);
    return NextResponse.json({ success: false, error: 'Failed to mark as read' }, { status: 500 });
  }
}

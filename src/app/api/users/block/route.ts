import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/users/block — Block a user
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { blockedId, reason } = body as { blockedId?: string; reason?: string };

    if (!blockedId || typeof blockedId !== 'string') {
      return NextResponse.json({ success: false, error: 'blockedId is required' }, { status: 400 });
    }

    // Cannot block yourself
    if (blockedId === userId) {
      return NextResponse.json({ success: false, error: 'You cannot block yourself' }, { status: 400 });
    }

    // Verify target user exists
    const targetUser = await db.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check if already blocked
    const existing = await db.blockedUser.findUnique({
      where: {
        blockerId_blockedId: { blockerId: userId, blockedId },
      },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'User is already blocked' }, { status: 409 });
    }

    await db.blockedUser.create({
      data: {
        blockerId: userId,
        blockedId,
        reason: reason?.trim() || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/users/block error:', error);
    return NextResponse.json({ success: false, error: 'Failed to block user' }, { status: 500 });
  }
}

// GET /api/users/block — List blocked users
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const blockedUsers = await db.blockedUser.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      blockedUsers: blockedUsers.map((bu) => ({
        id: bu.id,
        blockedId: bu.blockedId,
        reason: bu.reason,
        createdAt: bu.createdAt.toISOString(),
        user: bu.blocked,
      })),
    });
  } catch (error) {
    console.error('GET /api/users/block error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch blocked users' }, { status: 500 });
  }
}

// DELETE /api/users/block — Unblock a user
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { blockedId } = body as { blockedId?: string };

    if (!blockedId || typeof blockedId !== 'string') {
      return NextResponse.json({ success: false, error: 'blockedId is required' }, { status: 400 });
    }

    const existing = await db.blockedUser.findUnique({
      where: {
        blockerId_blockedId: { blockerId: userId, blockedId },
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'User is not blocked' }, { status: 404 });
    }

    await db.blockedUser.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/users/block error:', error);
    return NextResponse.json({ success: false, error: 'Failed to unblock user' }, { status: 500 });
  }
}

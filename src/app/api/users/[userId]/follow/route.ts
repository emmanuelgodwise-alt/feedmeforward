import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { recalculateScore } from '@/lib/score-engine';

// POST /api/users/[userId]/follow — Follow a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUserId = request.headers.get('X-User-Id');
    if (!currentUserId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { userId: targetUserId } = await params;

    // Cannot follow yourself
    if (currentUserId === targetUserId) {
      return NextResponse.json({ success: false, error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check target user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        memberScore: true,
        isVerified: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Create follow record (unique constraint handles duplicates via P2002)
    await db.follow.create({
      data: {
        followerId: currentUserId,
        followingId: targetUserId,
      },
    });

    // Create a notification for the followed user
    const follower = await db.user.findUnique({
      where: { id: currentUserId },
      select: { username: true },
    });

    await db.notification.create({
      data: {
        userId: targetUserId,
        fromUserId: currentUserId,
        type: 'follow',
        title: 'New Follower',
        message: `@${follower?.username || 'Someone'} started following you`,
      },
    });

    // Trigger score recalculation for the current user (fire and forget)
    recalculateScore(currentUserId).catch((err) => console.error('Score recalc failed:', err));
    // Trigger score recalculation for the followed user (quality score — new follower)
    recalculateScore(targetUserId).catch((err) => console.error('Score recalc failed:', err));

    return NextResponse.json({
      success: true,
      following: targetUser,
    });
  } catch (error: unknown) {
    // Handle unique constraint violation (P2002) — already following
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Already following this user' }, { status: 409 });
    }

    console.error('POST /api/users/[userId]/follow error:', error);
    return NextResponse.json({ success: false, error: 'Failed to follow user' }, { status: 500 });
  }
}

// DELETE /api/users/[userId]/follow — Unfollow a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUserId = request.headers.get('X-User-Id');
    if (!currentUserId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { userId: targetUserId } = await params;

    // Find the follow record
    const followRecord = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
    });

    if (!followRecord) {
      return NextResponse.json({ success: false, error: 'Not following this user' }, { status: 404 });
    }

    await db.follow.delete({
      where: { id: followRecord.id },
    });

    // Trigger score recalculation for both users (fire and forget)
    recalculateScore(currentUserId).catch((err) => console.error('Score recalc failed:', err));
    recalculateScore(targetUserId).catch((err) => console.error('Score recalc failed:', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/users/[userId]/follow error:', error);
    return NextResponse.json({ success: false, error: 'Failed to unfollow user' }, { status: 500 });
  }
}

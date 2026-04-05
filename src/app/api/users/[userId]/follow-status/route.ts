import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users/[userId]/follow-status — Check follow relationship between current user and target
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUserId = request.headers.get('X-User-Id');
    if (!currentUserId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { userId: targetUserId } = await params;

    // Cannot check follow status with yourself
    if (currentUserId === targetUserId) {
      return NextResponse.json({ isFollowing: false, isFollowedBy: false });
    }

    // Check both directions in parallel
    const [isFollowingRow, isFollowedByRow] = await Promise.all([
      db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: targetUserId,
          },
        },
        select: { id: true },
      }),
      db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: targetUserId,
            followingId: currentUserId,
          },
        },
        select: { id: true },
      }),
    ]);

    return NextResponse.json({
      isFollowing: !!isFollowingRow,
      isFollowedBy: !!isFollowedByRow,
    });
  } catch (error) {
    console.error('GET /api/users/[userId]/follow-status error:', error);
    return NextResponse.json({ success: false, error: 'Failed to check follow status' }, { status: 500 });
  }
}

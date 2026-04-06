import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users/[userId]/recent-followers — Get 5 most recent followers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUserId = request.headers.get('X-User-Id');
    const { userId } = await params;

    // Check target user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get 5 most recent followers
    const recentFollows = await db.follow.findMany({
      where: { followingId: userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    // For each follower, check if current user follows them back
    const followerIds = recentFollows.map((f) => f.followerId);
    let followsBack: Record<string, boolean> = {};

    if (currentUserId && followerIds.length > 0) {
      const mutualFollows = await db.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: followerIds },
        },
        select: { followingId: true },
      });
      followsBack = mutualFollows.reduce(
        (acc, f) => {
          acc[f.followingId] = true;
          return acc;
        },
        {} as Record<string, boolean>
      );
    }

    const followers = recentFollows.map((f) => ({
      id: f.follower.id,
      username: f.follower.username,
      displayName: f.follower.displayName,
      avatarUrl: f.follower.avatarUrl,
      isVerified: f.follower.isVerified,
      followedAt: f.createdAt,
      isFollowing: followsBack[f.followerId] || false,
    }));

    return NextResponse.json({ followers });
  } catch (error) {
    console.error('GET /api/users/[userId]/recent-followers error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch recent followers' }, { status: 500 });
  }
}

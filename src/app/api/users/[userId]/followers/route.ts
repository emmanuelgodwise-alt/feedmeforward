import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users/[userId]/followers — List followers of a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUserId = request.headers.get('X-User-Id');
    if (!currentUserId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = await params;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Check target user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get total count
    const total = await db.follow.count({
      where: { followingId: userId },
    });

    // Get follower records with follower user data
    const follows = await db.follow.findMany({
      where: { followingId: userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            memberScore: true,
            isVerified: true,
            bio: true,
          },
        },
      },
    });

    // For each follower, check if the current user follows them back
    const followerIds = follows.map((f) => f.followerId);

    let followsBack: Record<string, boolean> = {};
    if (followerIds.length > 0) {
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

    const followers = follows.map((f) => ({
      ...f.follower,
      followedByYou: followsBack[f.followerId] || false,
      followedAt: f.createdAt,
    }));

    return NextResponse.json({
      followers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/users/[userId]/followers error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch followers' }, { status: 500 });
  }
}

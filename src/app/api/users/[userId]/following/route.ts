import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users/[userId]/following — List users that a user is following
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
      where: { followerId: userId },
    });

    // Get following records with following user data
    const follows = await db.follow.findMany({
      where: { followerId: userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        following: {
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

    // For each followed user, check if the current user also follows them
    const followingIds = follows.map((f) => f.followingId);

    let followsByYou: Record<string, boolean> = {};
    if (followingIds.length > 0) {
      const yourFollows = await db.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: followingIds },
        },
        select: { followingId: true },
      });
      followsByYou = yourFollows.reduce(
        (acc, f) => {
          acc[f.followingId] = true;
          return acc;
        },
        {} as Record<string, boolean>
      );
    }

    const following = follows.map((f) => ({
      ...f.following,
      followedByYou: followsByYou[f.followingId] || false,
      followedAt: f.createdAt,
    }));

    return NextResponse.json({
      following,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/users/[userId]/following error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch following' }, { status: 500 });
  }
}

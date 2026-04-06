import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/users/search — Search users by username or displayName
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    if (query.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Case-insensitive search on username and displayName
    // SQLite uses LIKE for case-insensitive search by default
    const where: Prisma.UserWhereInput = {
      id: { not: userId }, // Exclude current user
      OR: [
        { username: { contains: query } },
        { displayName: { contains: query } },
      ],
    };

    const total = await db.user.count({ where });

    const users = await db.user.findMany({
      where,
      take: limit,
      orderBy: { memberScore: 'desc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        memberScore: true,
        isVerified: true,
        bio: true,
      },
    });

    // For each result, check follow/following status with current user
    const resultIds = users.map((u) => u.id);

    let followsByYou: Record<string, boolean> = {};
    let followsYou: Record<string, boolean> = {};

    if (resultIds.length > 0) {
      const [yourFollows, theirFollows] = await Promise.all([
        db.follow.findMany({
          where: {
            followerId: userId,
            followingId: { in: resultIds },
          },
          select: { followingId: true },
        }),
        db.follow.findMany({
          where: {
            followerId: { in: resultIds },
            followingId: userId,
          },
          select: { followerId: true },
        }),
      ]);

      followsByYou = yourFollows.reduce(
        (acc, f) => {
          acc[f.followingId] = true;
          return acc;
        },
        {} as Record<string, boolean>
      );

      followsYou = theirFollows.reduce(
        (acc, f) => {
          acc[f.followerId] = true;
          return acc;
        },
        {} as Record<string, boolean>
      );
    }

    const usersWithStatus = users.map((user) => ({
      ...user,
      isFollowing: followsByYou[user.id] || false,
      isFollowedBy: followsYou[user.id] || false,
    }));

    return NextResponse.json({
      users: usersWithStatus,
      total,
    });
  } catch (error) {
    console.error('GET /api/users/search error:', error);
    return NextResponse.json({ success: false, error: 'Failed to search users' }, { status: 500 });
  }
}

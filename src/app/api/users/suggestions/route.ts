import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users/suggestions — Get "People You May Know" suggestions
export async function GET(request: NextRequest) {
  try {
    const currentUserId = request.headers.get('X-User-Id');
    if (!currentUserId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Get IDs of users the current user already follows
    const existingFollows = await db.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });
    const followingIds = existingFollows.map((f) => f.followingId);

    // Get up to 12 users not already followed, excluding self
    // Sort by memberScore desc for quality, then add randomness
    const candidates = await db.user.findMany({
      where: {
        id: { not: currentUserId },
        ...(followingIds.length > 0 ? { id: { notIn: followingIds } } : {}),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        memberScore: true,
        isVerified: true,
        _count: {
          select: { followers: true },
        },
      },
      orderBy: { memberScore: 'desc' },
      take: 24, // grab more, then randomly pick 6
    });

    // Shuffle candidates
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    // Take first 6 after shuffle
    const suggestions = candidates.slice(0, 6).map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      memberScore: user.memberScore,
      isVerified: user.isVerified,
      followerCount: user._count.followers,
      isFollowing: false, // We know they are not followed since we filtered them out
    }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('GET /api/users/suggestions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}

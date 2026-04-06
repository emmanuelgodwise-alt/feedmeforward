import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recalculateScore } from '@/lib/score-engine';

// GET /api/users/[userId] — Get public profile data with score breakdown
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const currentUserId = request.headers.get('X-User-Id');

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        role: true,
        memberScore: true,
        isVerified: true,
        createdAt: true,
        ageRange: true,
        location: true,
        gender: true,
        language: true,
        interests: true,
        _count: {
          select: {
            videos: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Count response videos separately
    const responseCount = await db.video.count({
      where: { creatorId: userId, type: 'response' },
    });

    // Count liked and saved videos
    const likedCount = await db.like.count({
      where: { userId },
    });

    const savedCount = await db.savedVideo.count({
      where: { userId },
    });

    // Calculate score breakdown (also persists updated score)
    const { score: calculatedScore, breakdown } = await recalculateScore(userId);

    // Get rank based on recalculated score
    const rank = await db.user.count({
      where: {
        memberScore: { gt: calculatedScore },
      },
    });

    // Compute mutual follow count (followers who also follow the current viewer)
    let mutualFollowCount = 0;
    if (currentUserId && currentUserId !== userId) {
      // Get target user's follower IDs
      const targetFollowers = await db.follow.findMany({
        where: { followingId: userId },
        select: { followerId: true },
      });
      const targetFollowerIds = targetFollowers.map((f) => f.followerId);

      if (targetFollowerIds.length > 0) {
        // Count how many of those followers also follow the current viewer
        mutualFollowCount = await db.follow.count({
          where: {
            followerId: { in: targetFollowerIds },
            followingId: currentUserId,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        role: user.role,
        memberScore: calculatedScore,
        isVerified: calculatedScore >= 500,
        createdAt: user.createdAt,
        ageRange: user.ageRange,
        location: user.location,
        gender: user.gender,
        language: user.language,
        interests: user.interests,
        videoCount: user._count.videos,
        responseCount,
        followerCount: user._count.followers,
        followingCount: user._count.following,
        likedCount,
        savedCount,
        rank: rank + 1,
        breakdown,
        mutualFollowCount,
      },
    });
  } catch (error) {
    console.error('GET /api/users/[userId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

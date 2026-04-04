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

    // Calculate score breakdown (also persists updated score)
    const { score: calculatedScore, breakdown } = await recalculateScore(userId);

    // Get rank based on recalculated score
    const rank = await db.user.count({
      where: {
        memberScore: { gt: calculatedScore },
      },
    });

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
        videoCount: user._count.videos,
        responseCount,
        followerCount: user._count.followers,
        followingCount: user._count.following,
        rank: rank + 1,
        breakdown,
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

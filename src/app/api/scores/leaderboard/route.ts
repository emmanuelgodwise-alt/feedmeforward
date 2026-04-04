import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/scores/leaderboard — Get top users ranked by member score
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const category = searchParams.get('category') || 'all'; // "all" | "creators" | "engagers"

    let whereClause: Record<string, unknown> = {};

    if (category === 'creators') {
      whereClause = { videos: { some: {} } };
    } else if (category === 'engagers') {
      whereClause = {
        OR: [
          { pollVotes: { some: {} } },
          { comments: { some: {} } },
        ],
      };
    }

    const users = await db.user.findMany({
      where: whereClause,
      orderBy: { memberScore: 'desc' },
      take: limit,
      select: {
        id: true,
        username: true,
        memberScore: true,
        isVerified: true,
        avatarUrl: true,
        _count: {
          select: {
            videos: true,
            followers: true,
          },
        },
      },
    });

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      username: user.username,
      memberScore: user.memberScore,
      isVerified: user.isVerified,
      avatarUrl: user.avatarUrl,
      videoCount: user._count.videos,
      followerCount: user._count.followers,
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('GET /api/scores/leaderboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

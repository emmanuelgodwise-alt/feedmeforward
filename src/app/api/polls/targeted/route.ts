import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { buildWhereClause, type SegmentCriteria } from '@/lib/build-where-clause';

// GET /api/polls/targeted — Get paid polls targeted to current user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Fetch user profile for matching
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        ageRange: true,
        location: true,
        gender: true,
        language: true,
        interests: true,
        memberScore: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get all polls user has already voted on
    const votedPollIds = await db.pollVote.findMany({
      where: { userId },
      select: { pollId: true },
    });
    const votedSet = new Set(votedPollIds.map((v) => v.pollId));

    // Fetch all active paid polls with targeting criteria
    const now = new Date();
    const allTargetedPolls = await db.poll.findMany({
      where: {
        isPaid: true,
        targetingCriteria: { not: null },
        // Poll is still active
        OR: [
          { closesAt: null },
          { closesAt: { gt: now } },
        ],
      },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            creator: {
              select: { id: true, username: true, isVerified: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Fetch more than limit for filtering
    });

    // Filter: check if user matches each poll's targeting criteria
    const matchedPolls = [];

    for (const poll of allTargetedPolls) {
      // Skip if already voted
      if (votedSet.has(poll.id)) continue;

      // Skip if max responses reached
      if (poll.maxResponses && poll.responseCount >= poll.maxResponses) continue;

      try {
        const criteria = JSON.parse(poll.targetingCriteria as string) as SegmentCriteria;
        const whereClause = buildWhereClause(criteria);

        const matchCount = await db.user.count({
          where: {
            ...whereClause,
            id: userId,
          },
        });

        if (matchCount > 0) {
          matchedPolls.push({
            id: poll.id,
            question: poll.question,
            isPaid: poll.isPaid,
            rewardPerResponse: poll.rewardPerResponse,
            totalRewardPool: poll.totalRewardPool,
            responseCount: poll.responseCount,
            maxResponses: poll.maxResponses,
            closesAt: poll.closesAt,
            createdAt: poll.createdAt,
            targetingCriteria: criteria,
            video: poll.video,
          });
        }
      } catch {
        // Skip polls with invalid criteria JSON
      }

      if (matchedPolls.length >= 20) break;
    }

    return NextResponse.json({
      success: true,
      data: matchedPolls,
    });
  } catch (error) {
    console.error('GET /api/polls/targeted error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch targeted polls' }, { status: 500 });
  }
}

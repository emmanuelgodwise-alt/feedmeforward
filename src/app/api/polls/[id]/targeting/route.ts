import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { buildWhereClause, criteriaToBreakdown, type SegmentCriteria } from '@/lib/build-where-clause';

// GET /api/polls/[id]/targeting — Get targeting criteria for a poll
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pollId } = await params;
    const userId = request.headers.get('X-User-Id');

    const poll = await db.poll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        targetingCriteria: true,
      },
    });

    if (!poll) {
      return NextResponse.json({ success: false, error: 'Poll not found' }, { status: 404 });
    }

    if (!poll.targetingCriteria) {
      return NextResponse.json({
        success: true,
        data: {
          criteria: null,
          estimatedReach: null,
          breakdown: [],
        },
      });
    }

    let criteria: SegmentCriteria;
    try {
      criteria = JSON.parse(poll.targetingCriteria) as SegmentCriteria;
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid targeting criteria JSON' }, { status: 500 });
    }

    // Calculate estimated reach
    const whereClause = buildWhereClause(criteria);
    const estimatedReach = await db.user.count({ where: whereClause });

    const breakdown = criteriaToBreakdown(criteria);

    // Check if current user matches
    let userMatches: boolean | null = null;
    if (userId) {
      const matchCount = await db.user.count({
        where: { ...whereClause, id: userId },
      });
      userMatches = matchCount > 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        criteria,
        estimatedReach,
        breakdown,
        userMatches,
      },
    });
  } catch (error) {
    console.error('GET /api/polls/[id]/targeting error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch targeting info' }, { status: 500 });
  }
}

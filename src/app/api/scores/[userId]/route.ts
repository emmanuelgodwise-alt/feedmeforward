import { NextRequest, NextResponse } from 'next/server';
import { recalculateScore } from '@/lib/score-engine';
import { getScoreLevel } from '@/types';

// GET /api/scores/[userId] — Get score breakdown for a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Calculate on-the-fly (calls recalculateScore which also persists)
    const { score, breakdown } = await recalculateScore(userId);

    const level = getScoreLevel(score);

    return NextResponse.json({
      userId,
      memberScore: score,
      isVerified: score >= 500,
      breakdown,
      level,
    });
  } catch (error) {
    console.error('GET /api/scores/[userId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch score' },
      { status: 500 }
    );
  }
}

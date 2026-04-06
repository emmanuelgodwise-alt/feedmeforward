import { NextRequest, NextResponse } from 'next/server';
import { recalculateScore } from '@/lib/score-engine';
import { db } from '@/lib/db';

// POST /api/scores/calculate — Recalculate member scores
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body as { userId?: string };

    if (userId) {
      // Calculate for a single user
      const result = await recalculateScore(userId);
      return NextResponse.json({
        success: true,
        scores: [{
          userId,
          score: result.score,
          breakdown: result.breakdown,
        }],
      });
    } else {
      // Calculate for ALL users
      const users = await db.user.findMany({
        select: { id: true },
      });

      const scores: Array<{ userId: string; score: number; breakdown: { engagement: number; quality: number; accuracy: number; streak: number } }> = [];

      for (const user of users) {
        try {
          const result = await recalculateScore(user.id);
          scores.push({
            userId: user.id,
            score: result.score,
            breakdown: result.breakdown,
          });
        } catch (error) {
          console.error(`Failed to calculate score for user ${user.id}:`, error);
        }
      }

      return NextResponse.json({
        success: true,
        scores,
      });
    }
  } catch (error) {
    console.error('POST /api/scores/calculate error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate scores' },
      { status: 500 }
    );
  }
}

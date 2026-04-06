import { NextRequest, NextResponse } from 'next/server';
import { checkVideoWorthy } from '@/lib/ad-worthy';

// GET /api/ads/worthy-status/[videoId] — Check if Video is Worthy
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;

    const breakdown = await checkVideoWorthy(videoId);

    if (!breakdown) {
      return NextResponse.json(
        { error: 'Video not found', isWorthy: false, criteria: null, breakdown: null },
        { status: 404 }
      );
    }

    // Build criteria summary
    const criteria = {
      minViews: { threshold: 500, actual: breakdown.viewCount, met: breakdown.viewCountMet },
      minPollVotesOrReactions: {
        threshold: '10 votes OR 50 reactions',
        actual: `${breakdown.pollVotes} votes, ${breakdown.reactionCount} reactions`,
        met: breakdown.engagementMet,
      },
      creatorScore: { threshold: 200, actual: breakdown.creatorMemberScore, met: breakdown.creatorScoreMet },
      leadType: { threshold: true, actual: breakdown.isLeadType, met: breakdown.leadTypeMet },
      hasPoll: { threshold: true, actual: breakdown.hasPoll, met: breakdown.hasPollMet },
      noPendingReports: { threshold: 0, actual: breakdown.pendingReports, met: breakdown.noReportsMet },
    };

    const totalCriteria = Object.keys(criteria).length;
    const metCriteria = Object.values(criteria).filter((c) => c.met).length;

    return NextResponse.json({
      isWorthy: breakdown.isWorthy,
      criteria,
      breakdown: {
        viewCount: breakdown.viewCount,
        pollVotes: breakdown.pollVotes,
        reactionCount: breakdown.reactionCount,
        creatorMemberScore: breakdown.creatorMemberScore,
        pendingReports: breakdown.pendingReports,
        isLeadType: breakdown.isLeadType,
        hasPoll: breakdown.hasPoll,
      },
      summary: {
        totalCriteria,
        metCriteria,
        unmetCriteria: totalCriteria - metCriteria,
        percentage: Math.round((metCriteria / totalCriteria) * 100),
      },
    });
  } catch (error) {
    console.error('GET /api/ads/worthy-status/[videoId] error:', error);
    return NextResponse.json({ error: 'Failed to check worthy status' }, { status: 500 });
  }
}

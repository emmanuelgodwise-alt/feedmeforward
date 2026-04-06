import { db } from '@/lib/db';

interface WorthyBreakdown {
  viewCount: number;
  viewCountMet: boolean;
  pollVotes: number;
  pollVotesMet: boolean;
  reactionCount: number;
  reactionsMet: boolean;
  engagementMet: boolean; // pollVotes >= 10 OR reactionCount >= 50
  creatorMemberScore: number;
  creatorScoreMet: boolean;
  isLeadType: boolean;
  leadTypeMet: boolean;
  hasPoll: boolean;
  hasPollMet: boolean;
  pendingReports: number;
  noReportsMet: boolean;
  isWorthy: boolean;
}

/**
 * Check if a video meets all "worthy" criteria for ad placement.
 * Returns a detailed breakdown of each criterion.
 */
export async function checkVideoWorthy(videoId: string): Promise<WorthyBreakdown | null> {
  const video = await db.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      type: true,
      viewCount: true,
      creatorId: true,
      status: true,
      polls: { select: { id: true } },
      reactions: { select: { id: true } },
      reports: {
        select: { id: true, status: true },
        where: { status: 'pending' },
      },
      creator: {
        select: { id: true, memberScore: true },
      },
    },
  });

  if (!video) return null;

  // Count total poll votes for this video
  const pollIds = video.polls.map((p) => p.id);
  let pollVotes = 0;
  if (pollIds.length > 0) {
    const voteAgg = await db.pollVote.groupBy({
      by: ['pollId'],
      where: { pollId: { in: pollIds } },
      _count: { id: true },
    });
    pollVotes = voteAgg.reduce((sum, v) => sum + v._count.id, 0);
  }

  const reactionCount = video.reactions.length;
  const pendingReports = video.reports.length;

  const breakdown: WorthyBreakdown = {
    viewCount: video.viewCount,
    viewCountMet: video.viewCount >= 500,
    pollVotes,
    pollVotesMet: pollVotes >= 10,
    reactionCount,
    reactionsMet: reactionCount >= 50,
    engagementMet: pollVotes >= 10 || reactionCount >= 50,
    creatorMemberScore: video.creator.memberScore,
    creatorScoreMet: video.creator.memberScore >= 200,
    isLeadType: video.type === 'lead',
    leadTypeMet: video.type === 'lead',
    hasPoll: video.polls.length > 0,
    hasPollMet: video.polls.length > 0,
    pendingReports,
    noReportsMet: pendingReports === 0,
    isWorthy: false,
  };

  // Worthy = all criteria met
  breakdown.isWorthy =
    breakdown.viewCountMet &&
    breakdown.engagementMet &&
    breakdown.creatorScoreMet &&
    breakdown.leadTypeMet &&
    breakdown.hasPollMet &&
    breakdown.noReportsMet;

  return breakdown;
}

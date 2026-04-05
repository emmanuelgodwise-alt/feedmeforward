import { db } from '@/lib/db';
import type { ScoreBreakdown } from '@/types';

/**
 * Recalculate score for a single user.
 * Calculates all 4 components, individually caps them, sums to max 1000,
 * updates User.memberScore and User.isVerified in the DB, then returns the result.
 *
 * ENHANCED SCORING (v2):
 * - Video responses are heavily weighted over text-only responses
 * - Response quality is measured by engagement received (likes, comments on responses)
 * - Paid poll participation earns bonus points
 * - Description quality (length/detail) is factored in
 * - Influencer potential is tracked via video response ratio
 */
export async function recalculateScore(userId: string): Promise<{
  score: number;
  breakdown: ScoreBreakdown;
  rating: string;
  influencerScore: number;
  videoResponseRatio: number;
}> {
  // ─── 1. Engagement (max 300) ──────────────────────────────────────
  const [
    leadVideoCount,
    videoResponseCount,
    textOnlyResponseCount,
    pollVoteCount,
    commentCount,
    likeGivenCount,
    followCount,
    paidPollsParticipated,
  ] = await Promise.all([
    db.video.count({ where: { creatorId: userId, type: 'lead' } }),
    db.video.count({ where: { creatorId: userId, type: 'response', isTextOnly: false } }),
    db.video.count({ where: { creatorId: userId, type: 'response', isTextOnly: true } }),
    db.pollVote.count({ where: { userId } }),
    db.comment.count({ where: { userId } }),
    db.like.count({ where: { userId } }),
    db.follow.count({ where: { followerId: userId } }),
    db.pollVote.count({
      where: { userId, poll: { isPaid: true } },
    }),
  ]);

  // Video responses earn 5x more than text-only (which earn 1x)
  const engagement = Math.min(
    300,
    (leadVideoCount * 3) +                    // +3 per lead clip (up from 2)
    (videoResponseCount * 6) +                // +6 per VIDEO response (up from 5, emphasizes video)
    (textOnlyResponseCount * 1) +             // +1 per text-only (demoted from same as video)
    (pollVoteCount * 1) +
    (paidPollsParticipated * 3) +             // +3 bonus per paid poll participated
    (commentCount * 0.5) +                    // reduced from 1 to 0.5 to emphasize video
    (Math.min(likeGivenCount, 50) * 0.5) +
    (Math.min(followCount, 50) * 1)
  );

  // ─── 2. Quality (max 400) ────────────────────────────────────────
  const [
    likesReceivedCount,
    commentsReceivedCount,
    responsesReceivedCount,
    successfulInvitationCount,
  ] = await Promise.all([
    db.like.count({ where: { video: { creatorId: userId } } }),
    db.comment.count({ where: { video: { creatorId: userId } } }),
    db.video.count({
      where: {
        parentVideo: { creatorId: userId },
        type: 'response',
      },
    }),
    db.invitation.count({
      where: { inviterId: userId, status: 'responded' },
    }),
  ]);

  // Quality of responses — responses that themselves received engagement
  const videoResponses = await db.video.findMany({
    where: { creatorId: userId, type: 'response', isTextOnly: false },
    select: { id: true },
  });

  let responseQualityScore = 0;
  if (videoResponses.length > 0) {
    const responseIds = videoResponses.map((v) => v.id);
    const [responseLikes, responseComments] = await Promise.all([
      db.like.count({ where: { videoId: { in: responseIds } } }),
      db.comment.count({ where: { videoId: { in: responseIds } } }),
    ]);
    // Weight: 5 per like on a response (your video response quality matters)
    responseQualityScore = (responseLikes * 5) + (responseComments * 8);
  }

  // Description quality bonus: longer, detailed descriptions on videos
  const userVideosWithDesc = await db.video.findMany({
    where: {
      creatorId: userId,
      type: 'response',
      isTextOnly: false,
      description: { not: null, not: '' },
    },
    select: { description: true },
  });
  const detailedResponses = userVideosWithDesc.filter(
    (v) => v.description && v.description.length > 50
  ).length;

  const descriptionBonus = Math.min(detailedResponses * 3, 30); // cap at 30

  // Each sub-component individually capped at 200pts
  const likesScore = Math.min(likesReceivedCount * 3, 200);
  const commentsScore = Math.min(commentsReceivedCount * 5, 200);
  const responsesScore = Math.min(responsesReceivedCount * 10, 200);
  const invitationsScore = successfulInvitationCount * 20;
  const responseQuality = Math.min(responseQualityScore, 100);

  const quality = Math.min(400, likesScore + commentsScore + responsesScore + invitationsScore + responseQuality + descriptionBonus);

  // ─── 3. Accuracy (max 200) ───────────────────────────────────────
  const popularPollsCreatedCount = await db.poll.count({
    where: {
      video: { creatorId: userId },
      responseCount: { gte: 10 },
    },
  });

  const userVotedPollIds = await db.pollVote.findMany({
    where: { userId },
    select: { pollId: true },
  });

  let popularPollsVotedCount = 0;
  if (userVotedPollIds.length > 0) {
    popularPollsVotedCount = await db.poll.count({
      where: {
        id: { in: userVotedPollIds.map((v) => v.pollId) },
        responseCount: { gte: 20 },
      },
    });
  }

  const accuracy = Math.min(
    200,
    (Math.min(popularPollsCreatedCount, 10) * 5) +
    (Math.min(popularPollsVotedCount, 75) * 2) +
    (paidPollsParticipated * 4) // bonus for paid poll engagement
  );

  // ─── 4. Streak (max 100) ─────────────────────────────────────────
  const streak = await calculateStreak(userId);

  // ─── Total (max 1000) ────────────────────────────────────────────
  const score = Math.min(1000, Math.round(engagement + quality + accuracy + streak));

  // ─── Calculate Rating & Influencer Metrics ───────────────────────
  const totalResponses = videoResponseCount + textOnlyResponseCount;
  const videoResponseRatio = totalResponses > 0 ? videoResponseCount / totalResponses : 0;

  // Influencer Score: composite of video ratio, quality score, and engagement
  const influencerScore = Math.min(
    100,
    Math.round(
      (videoResponseRatio * 40) +                    // 0-40: video response ratio
      (Math.min(responseQualityScore, 100) * 0.3) +  // 0-30: response quality
      (Math.min(engagement / 300, 1) * 30)            // 0-30: engagement level
    )
  );

  // Rating label based on score
  let rating: string;
  if (score >= 900) rating = 'Elite';
  else if (score >= 750) rating = 'Diamond';
  else if (score >= 500) rating = 'Gold';
  else if (score >= 200) rating = 'Silver';
  else rating = 'Bronze';

  // ─── Persist to DB ───────────────────────────────────────────────
  const shouldVerify = score >= 500;
  await db.user.update({
    where: { id: userId },
    data: {
      memberScore: score,
      isVerified: shouldVerify,
    },
  });

  return {
    score,
    breakdown: {
      engagement: Math.round(engagement),
      quality: Math.round(quality),
      accuracy: Math.round(accuracy),
      streak: Math.round(streak),
    },
    rating,
    influencerScore,
    videoResponseRatio: Math.round(videoResponseRatio * 100),
  };
}

/**
 * Calculate streak bonus: +10 per consecutive day counting back from today.
 * Activity = video created, comment posted, vote cast, or like given.
 * Stops at first gap. Cap at 10 day streak = 100pts.
 */
async function calculateStreak(userId: string): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [videoDates, voteDates, commentDates, likeDates] = await Promise.all([
    db.video.findMany({
      where: { creatorId: userId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    db.pollVote.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    db.comment.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    db.like.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
  ]);

  // Collect unique date strings (YYYY-MM-DD)
  const activeDays = new Set<string>();
  const addDays = (items: Array<{ createdAt: Date }>) => {
    for (const item of items) {
      activeDays.add(item.createdAt.toISOString().split('T')[0]);
    }
  };

  addDays(videoDates);
  addDays(voteDates);
  addDays(commentDates);
  addDays(likeDates);

  if (activeDays.size === 0) return 0;

  // Count consecutive days counting back from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Must have activity today to start counting
  if (!activeDays.has(todayStr)) return 0;

  let streak = 0;
  const checkDate = new Date(today);

  for (let i = 0; i < 10; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (activeDays.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return Math.min(streak, 10) * 10;
}

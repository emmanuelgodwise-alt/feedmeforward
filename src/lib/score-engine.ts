import { db } from '@/lib/db';
import type { ScoreBreakdown } from '@/types';

/**
 * Recalculate score for a single user.
 * Calculates all 4 components, individually caps them, sums to max 1000,
 * updates User.memberScore and User.isVerified in the DB, then returns the result.
 */
export async function recalculateScore(userId: string): Promise<{
  score: number;
  breakdown: ScoreBreakdown;
}> {
  // ─── 1. Engagement (max 300) ──────────────────────────────────────
  const [
    leadVideoCount,
    responseClipCount,
    pollVoteCount,
    commentCount,
    likeGivenCount,
    followCount,
  ] = await Promise.all([
    db.video.count({ where: { creatorId: userId, type: 'lead' } }),
    db.video.count({ where: { creatorId: userId, type: 'response' } }),
    db.pollVote.count({ where: { userId } }),
    db.comment.count({ where: { userId } }),
    db.like.count({ where: { userId } }),
    db.follow.count({ where: { followerId: userId } }),
  ]);

  const engagement = Math.min(
    300,
    (leadVideoCount * 2) +
    (responseClipCount * 5) +
    (pollVoteCount * 1) +
    (commentCount * 1) +
    (Math.min(likeGivenCount, 50) * 0.5) +
    (Math.min(followCount, 50) * 1)
  );

  // ─── 2. Quality (max 400) ────────────────────────────────────────
  // Response clips received: response videos where the user's video is the parent
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

  // Each sub-component individually capped at 200pts
  const likesScore = Math.min(likesReceivedCount * 3, 200);
  const commentsScore = Math.min(commentsReceivedCount * 5, 200);
  const responsesScore = Math.min(responsesReceivedCount * 10, 200);
  const invitationsScore = successfulInvitationCount * 20;

  const quality = Math.min(400, likesScore + commentsScore + responsesScore + invitationsScore);

  // ─── 3. Accuracy (max 200) ───────────────────────────────────────
  // Polls created by user with 10+ responses (cap 10 polls = 50pts)
  const popularPollsCreatedCount = await db.poll.count({
    where: {
      video: { creatorId: userId },
      responseCount: { gte: 10 },
    },
  });

  // Poll votes on polls with 20+ total votes (cap 75 = 150pts)
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
    (Math.min(popularPollsVotedCount, 75) * 2)
  );

  // ─── 4. Streak (max 100) ─────────────────────────────────────────
  const streak = await calculateStreak(userId);

  // ─── Total (max 1000) ────────────────────────────────────────────
  const score = Math.min(1000, Math.round(engagement + quality + accuracy + streak));

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

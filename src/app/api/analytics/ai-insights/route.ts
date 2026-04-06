import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────────────────
interface PerformanceInsight {
  category: 'growth' | 'engagement' | 'content' | 'audience' | 'revenue' | 'polls';
  severity: 'opportunity' | 'warning' | 'info';
  title: string;
  description: string;
  metric: string;
  action: string;
  impact: 'high' | 'medium' | 'low';
}

interface ContentSuggestion {
  type: string;
  title: string;
  description: string;
  category: string;
  reasoning: string;
  estimatedImpact: 'high' | 'medium' | 'low';
}

interface OptimalPostingTimes {
  bestDays: string[];
  bestHours: number[];
  timezone: string;
}

interface GrowthProjections {
  projectedViews7d: number;
  projectedFollowers30d: number;
  projectedRevenue30d: number;
}

interface CompetitiveScore {
  overall: number;
  engagement: number;
  growth: number;
  contentQuality: number;
  monetization: number;
  audience: number;
  percentile: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────
function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Main Handler ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Provide X-User-Id header.' },
        { status: 401 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, isVerified: true, createdAt: true, location: true },
    });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // ── Time windows ──────────────────────────────────────────────
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const recentActivityWindow = new Date(now.getTime() - 2 * 60 * 60 * 1000); // last 2 hours

    // ── Data Collection (parallelized) ────────────────────────────
    const [
      // Current 30-day metrics
      currentViewsResult,
      currentLikes,
      currentComments,
      currentResponses,
      currentReposts,
      currentFollowers,

      // Previous 30-day metrics (for WoW/MoM comparison)
      prevViewsResult,
      prevLikes,
      prevComments,
      prevResponses,
      prevFollowers,

      // Lifetime metrics
      totalViewsResult,
      totalFollowers,

      // Content metrics
      leadClips7d,
      leadClips14d,
      polls30d,
      paidPolls,

      // Poll trust scores
      recentPollVotes,

      // Revenue metrics
      thisMonthRevenue,
      lastMonthRevenue,

      // Follower counts
      newFollowers30d,

      // Recent activity
      recentVotes,
      recentCommentsOnMyVideos,
      recentLikesOnMyVideos,

      // Engagement data by time
      recentVotesAll,
      recentLikesAll,
      recentCommentsAll,
      recentReactionsAll,

      // Top video engagement
      topViewedVideo,
      videosByCategory,

      // Platform-wide stats (for competitive scoring)
      platformTotalVideos,
      platformTotalViews,
      platformTotalLikes,
      platformTotalFollowers,
      platformTotalPolls,
      platformTotalRevenue,
      platformAvgViewsPerVideo,
      platformAvgFollowers,
      platformAvgEngagementRaw,
      platformUserCount,

      // User's full video data for engagement calc
      userVideos,
    ] = await Promise.all([
      // Current 30d views
      db.video.aggregate({
        where: { creatorId: userId, createdAt: { gte: thirtyDaysAgo } },
        _sum: { viewCount: true },
      }),
      db.like.count({ where: { video: { creatorId: userId }, createdAt: { gte: thirtyDaysAgo } } }),
      db.comment.count({ where: { video: { creatorId: userId }, createdAt: { gte: thirtyDaysAgo } } }),
      db.video.count({ where: { creatorId: userId, type: 'response', createdAt: { gte: thirtyDaysAgo } } }),
      db.repost.count({ where: { video: { creatorId: userId }, createdAt: { gte: thirtyDaysAgo } } }),
      db.follow.count({ where: { followingId: userId, createdAt: { gte: thirtyDaysAgo } } }),

      // Previous 30d views (days 30-60)
      db.video.aggregate({
        where: { creatorId: userId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        _sum: { viewCount: true },
      }),
      db.like.count({ where: { video: { creatorId: userId }, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      db.comment.count({ where: { video: { creatorId: userId }, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      db.video.count({ where: { creatorId: userId, type: 'response', createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
      db.follow.count({ where: { followingId: userId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),

      // Lifetime totals
      db.video.aggregate({ where: { creatorId: userId }, _sum: { viewCount: true } }),
      db.follow.count({ where: { followingId: userId } }),

      // Content frequency
      db.video.count({ where: { creatorId: userId, type: 'lead', createdAt: { gte: sevenDaysAgo } } }),
      db.video.count({ where: { creatorId: userId, type: 'lead', createdAt: { gte: fourteenDaysAgo } } }),
      db.poll.count({ where: { video: { creatorId: userId }, createdAt: { gte: thirtyDaysAgo } } }),
      db.poll.findMany({
        where: { video: { creatorId: userId }, isPaid: true },
        include: { video: { select: { viewCount: true, _count: { select: { likes: true, comments: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Poll trust data - get recent polls with voter info
      db.poll.findMany({
        where: { video: { creatorId: userId } },
        include: {
          votes: {
            include: { user: { select: { isVerified: true, memberScore: true } } },
            take: 100,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Revenue
      db.transaction.aggregate({
        where: { userId, type: { in: ['earning', 'reward', 'tip'] }, status: 'completed', createdAt: { gte: thisMonthStart } },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { userId, type: { in: ['earning', 'reward', 'tip'] }, status: 'completed', createdAt: { gte: lastMonthStart, lt: lastMonthEnd } },
        _sum: { amount: true },
      }),

      // Follower growth
      db.follow.count({ where: { followingId: userId, createdAt: { gte: thirtyDaysAgo } } }),

      // Recent activity (last 2 hours)
      db.pollVote.count({
        where: { poll: { video: { creatorId: userId } }, createdAt: { gte: recentActivityWindow } },
      }),
      db.comment.count({ where: { video: { creatorId: userId }, createdAt: { gte: recentActivityWindow } } }),
      db.like.count({ where: { video: { creatorId: userId }, createdAt: { gte: recentActivityWindow } } }),

      // Engagement time data
      db.pollVote.findMany({
        where: { poll: { video: { creatorId: userId } }, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
      db.like.findMany({
        where: { video: { creatorId: userId }, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
      db.comment.findMany({
        where: { video: { creatorId: userId }, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
      db.reaction.findMany({
        where: { video: { creatorId: userId }, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),

      // Top video by views
      db.video.findFirst({
        where: { creatorId: userId },
        orderBy: { viewCount: 'desc' },
        select: {
          id: true, title: true, viewCount: true, type: true,
          _count: { select: { likes: true, comments: true, reactions: true, reposts: true } },
        },
      }),

      // Videos by category
      db.video.groupBy({
        by: ['category'],
        where: { creatorId: userId },
        _count: true,
        _sum: { viewCount: true },
        orderBy: { _sum: { viewCount: 'desc' } },
      }),

      // Platform-wide stats
      db.video.count(),
      db.video.aggregate({ _sum: { viewCount: true } }),
      db.like.count(),
      db.follow.count(),
      db.poll.count(),
      db.transaction.aggregate({ where: { type: { in: ['earning', 'reward'] }, status: 'completed' }, _sum: { amount: true } }),
      db.video.aggregate({ _avg: { viewCount: true } }),
      db.user.aggregate({ _avg: { memberScore: true } }),
      db.user.count(),
      db.user.count(),

      // User's videos with engagement for per-video analysis
      db.video.findMany({
        where: { creatorId: userId },
        select: {
          id: true, title: true, viewCount: true, category: true, type: true, createdAt: true,
          _count: { select: { likes: true, comments: true, reactions: true, reposts: true, savedBy: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    // ── Derived Metrics ───────────────────────────────────────────
    const currentViews = currentViewsResult._sum.viewCount || 0;
    const prevViews = prevViewsResult._sum.viewCount || 0;
    const totalViews = totalViewsResult._sum.viewCount || 0;
    const totalInteractions30d = currentLikes + currentComments + currentResponses + currentReposts;
    const engagementRate = currentViews > 0 ? (totalInteractions30d / currentViews) * 100 : 0;
    const viewsWoW = pctChange(currentViews, prevViews);

    const followers30d = currentFollowers;
    const followerGrowthRate = totalFollowers > 0 ? (followers30d / totalFollowers) * 100 : 0;
    const newFollowerRatio = totalFollowers > 0 ? (newFollowers30d / totalFollowers) * 100 : 0;

    // Content frequency (lead clips per week, averaged over 14 days)
    const contentFrequencyPerWeek = leadClips14d / 2;

    // Response rate (responses / lead clips in 30d)
    const leadClips30d = userVideos.filter(
      (v) => v.type === 'lead' && new Date(v.createdAt) >= thirtyDaysAgo
    ).length;
    const responseRate = leadClips30d > 0 ? currentResponses / leadClips30d : 0;

    // Revenue MoM
    const thisMonthRev = thisMonthRevenue._sum.amount || 0;
    const lastMonthRev = lastMonthRevenue._sum.amount || 0;
    const revenueMoM = pctChange(thisMonthRev, lastMonthRev);

    // Poll conversion (for paid polls)
    const paidPollConversions = paidPolls.map((p: any) => {
      const views = (p as any).video?.viewCount || (p as any).viewCount || 1;
      return { question: (p as any).question || '', rate: ((p as any).responseCount || 0) / views * 100 };
    });
    const avgPaidPollConversion = paidPollConversions.length > 0
      ? paidPollConversions.reduce((s, p) => s + p.rate, 0) / paidPollConversions.length
      : 0;

    // Poll trust score average
    const pollTrustScores = recentPollVotes.map((poll) => {
      const totalVotes = poll.responseCount || 0;
      if (totalVotes === 0) return 50; // neutral default

      const verifiedVoters = poll.votes.filter((v) => v.user.isVerified).length;
      const verifiedRatio = poll.votes.length > 0 ? verifiedVoters / poll.votes.length : 0;
      const avgScore = poll.votes.length > 0
        ? poll.votes.reduce((s, v) => s + (v.user.memberScore || 0), 0) / poll.votes.length
        : 0;

      const sampleScore = Math.min(25, (totalVotes / 100) * 25);
      const qualityScore = verifiedRatio * 15 + (Math.min(avgScore, 1000) / 1000) * 10;
      const pollAgeHours = (Date.now() - poll.createdAt.getTime()) / (1000 * 60 * 60);
      const velocityScore = pollAgeHours > 0 ? Math.min(25, ((totalVotes / pollAgeHours) / 10) * 25) : 0;

      return Math.round(sampleScore + qualityScore + 25 + velocityScore); // diversity defaulted to 25
    });
    const avgPollTrustScore = pollTrustScores.length > 0
      ? Math.round(pollTrustScores.reduce((s, v) => s + v, 0) / pollTrustScores.length)
      : 50;

    // Verified voter ratio across polls
    const allVotesForPolls = recentPollVotes.flatMap((p) => p.votes);
    const verifiedVoterRatio = allVotesForPolls.length > 0
      ? allVotesForPolls.filter((v) => v.user.isVerified).length / allVotesForPolls.length * 100
      : 100;

    // Top video engagement
    const topVideoEngRate = topViewedVideo && topViewedVideo.viewCount > 0
      ? ((topViewedVideo._count.likes + topViewedVideo._count.comments + topViewedVideo._count.reactions) / topViewedVideo.viewCount) * 100
      : 0;

    // Recent activity level
    const recentActivityCount = recentVotes + recentCommentsOnMyVideos + recentLikesOnMyVideos;

    // Category dominance
    const topCategory = videosByCategory.length > 0
      ? { name: videosByCategory[0].category || 'Uncategorized', views: videosByCategory[0]._sum.viewCount || 0, count: videosByCategory[0]._count }
      : null;
    const secondCategory = videosByCategory.length > 1
      ? { name: videosByCategory[1].category || 'Uncategorized', views: videosByCategory[1]._sum.viewCount || 0, count: videosByCategory[1]._count }
      : null;
    const categoryDominance = topCategory && secondCategory && secondCategory.views > 0
      ? topCategory.views / secondCategory.views
      : 0;

    // ── Build Performance Insights ────────────────────────────────
    const insights: PerformanceInsight[] = [];

    // Rule 1: Exceptional engagement > 15%
    if (engagementRate > 15) {
      insights.push({
        category: 'engagement',
        severity: 'opportunity',
        title: 'Exceptional engagement detected',
        description: `Your audience engagement rate of ${engagementRate.toFixed(1)}% is well above the platform average. This indicates highly resonant content that drives meaningful interaction. Leverage this momentum by doubling down on the content formats and topics that are generating the most comments and shares.`,
        metric: `${engagementRate.toFixed(1)}% engagement rate`,
        action: 'Analyze your top-performing videos to identify common themes and replicate that success',
        impact: 'high',
      });
    }

    // Rule 2: Low engagement < 3%
    if (engagementRate > 0 && engagementRate < 3) {
      insights.push({
        category: 'engagement',
        severity: 'warning',
        title: 'Low engagement rate',
        description: `Your engagement rate of ${engagementRate.toFixed(1)}% suggests your audience is passively viewing without interacting. This often happens when content lacks clear calls-to-action or when videos don't spark conversation. Consider ending videos with thought-provoking questions to encourage comments and shares.`,
        metric: `${engagementRate.toFixed(1)}% engagement rate`,
        action: 'Add poll questions and discussion prompts to every video to boost interaction',
        impact: 'high',
      });
    }

    // Rule 3: Rapid growth > 20% WoW
    if (viewsWoW > 20) {
      insights.push({
        category: 'growth',
        severity: 'opportunity',
        title: 'Rapid growth trajectory',
        description: `Your views have grown ${viewsWoW}% compared to the previous period, putting you on a rapid growth trajectory. This acceleration could be driven by trending content or improved discoverability. Capitalize on this window by posting more frequently while your audience is expanding.`,
        metric: `${viewsWoW}% view growth`,
        action: 'Increase posting frequency to 3-4 times per week while growth momentum is strong',
        impact: 'high',
      });
    }

    // Rule 4: Views declining > 10% WoW
    if (viewsWoW < -10) {
      insights.push({
        category: 'growth',
        severity: 'warning',
        title: 'View count declining',
        description: `Your views have dropped ${Math.abs(viewsWoW)}% compared to the previous period. This decline could signal content fatigue, algorithm changes, or increased competition. Review your recent content performance to identify what shifted and experiment with new formats to recapture attention.`,
        metric: `${viewsWoW}% view change`,
        action: 'Refresh your content strategy with trending topics and cross-promote on other channels',
        impact: 'high',
      });
    }

    // Rule 5: Low response rate < 0.5
    if (leadClips30d >= 3 && responseRate < 0.5) {
      insights.push({
        category: 'content',
        severity: 'warning',
        title: 'Low response rate on lead clips',
        description: `Your lead clips are generating an average of ${responseRate.toFixed(1)} responses per clip, which is below the healthy threshold. Response clips are a powerful growth lever — they extend your content's reach into new audiences. Strengthen your calls-to-action at the end of videos to encourage more creators to respond.`,
        metric: `${responseRate.toFixed(1)} responses per lead clip`,
        action: 'End every lead clip with a clear invitation: "Show me your take — create a response clip!"',
        impact: 'medium',
      });
    }

    // Rule 6: Strong poll ROI > 80% conversion
    if (paidPollConversions.length > 0 && avgPaidPollConversion > 80) {
      insights.push({
        category: 'polls',
        severity: 'opportunity',
        title: 'Strong poll conversion rate',
        description: `Your paid polls are converting at an impressive ${avgPaidPollConversion.toFixed(0)}% rate, meaning viewers are highly motivated to participate. This is a strong signal that your audience values the topics you're polling on. Consider increasing your poll frequency and reward pool to maximize data collection and audience engagement.`,
        metric: `${avgPaidPollConversion.toFixed(0)}% avg poll conversion`,
        action: 'Scale up paid polls with larger reward pools to capture even more responses',
        impact: 'high',
      });
    }

    // Rule 7: Follower growth > 10% in 30d
    if (followerGrowthRate > 10) {
      insights.push({
        category: 'audience',
        severity: 'opportunity',
        title: 'Audience is growing rapidly',
        description: `You've gained ${followers30d} new followers in the last 30 days, a ${followerGrowthRate.toFixed(1)}% growth rate. This signals expanding reach and increasing brand awareness. Nurture these new followers with welcome content and consistent posting to convert them into loyal, engaged community members.`,
        metric: `+${followers30d} followers (${followerGrowthRate.toFixed(1)}%)`,
        action: 'Create a welcome poll or lead clip for new followers to drive their first interaction',
        impact: 'high',
      });
    }

    // Rule 8: Content frequency < 1/week
    if (contentFrequencyPerWeek < 1 && userVideos.length > 0) {
      insights.push({
        category: 'content',
        severity: 'info',
        title: 'Post more frequently',
        description: `You're averaging ${contentFrequencyPerWeek.toFixed(1)} lead clips per week, which is below the recommended minimum of 1 per week. Consistency is one of the strongest drivers of audience growth and algorithmic visibility. Consider batching content creation to maintain a steady publishing schedule.`,
        metric: `${contentFrequencyPerWeek.toFixed(1)} lead clips/week`,
        action: 'Create a content calendar and aim for at least 2 lead clips per week',
        impact: 'medium',
      });
    }

    // Rule 9: Poll trust score average < 40
    if (avgPollTrustScore < 40 && recentPollVotes.length > 0) {
      insights.push({
        category: 'polls',
        severity: 'warning',
        title: 'Improve poll reliability scores',
        description: `Your average poll trust score of ${avgPollTrustScore}/100 falls below the reliable threshold. This could indicate small sample sizes, low verified voter participation, or slow voting velocity. Higher trust scores make your poll data more credible for business decisions and attract higher-quality respondents.`,
        metric: `Trust score: ${avgPollTrustScore}/100`,
        action: 'Target polls to verified users with higher member scores and allow longer voting windows',
        impact: 'medium',
      });
    }

    // Rule 10: Top category performs 2x better than others
    if (categoryDominance >= 2) {
      insights.push({
        category: 'content',
        severity: 'opportunity',
        title: `Double down on ${topCategory!.name}`,
        description: `Content in the "${topCategory!.name}" category generates ${categoryDominance.toFixed(1)}x more views than your next best category. This is a clear signal of audience preference and content-market fit. Prioritize this category for new lead clips and consider creating a series to build anticipation and repeat viewership.`,
        metric: `${categoryDominance.toFixed(1)}x category dominance (${topCategory!.name})`,
        action: `Create a dedicated content series in ${topCategory!.name} to build audience loyalty`,
        impact: 'high',
      });
    }

    // Rule 11: Revenue increasing MoM > 30%
    if (revenueMoM > 30 && thisMonthRev > 0) {
      insights.push({
        category: 'revenue',
        severity: 'opportunity',
        title: 'Revenue acceleration detected',
        description: `Your revenue has grown ${revenueMoM}% compared to last month, reaching $${thisMonthRev.toFixed(2)}. This acceleration suggests your monetization strategy is working. Identify which revenue streams are driving growth — tips, ad revenue, or paid polls — and allocate more effort toward the most profitable channels.`,
        metric: `+${revenueMoM}% revenue ($${thisMonthRev.toFixed(2)} this month)`,
        action: 'Double down on your highest-earning content type and explore premium subscription tiers',
        impact: 'high',
      });
    }

    // Rule 12: High follower churn risk (new followers / total > 10%)
    if (newFollowerRatio > 10 && totalFollowers > 0) {
      insights.push({
        category: 'audience',
        severity: 'info',
        title: 'Monitor follower retention',
        description: `${newFollowers30d} of your ${totalFollowers} followers joined in the last 30 days (${newFollowerRatio.toFixed(1)}%). While growth is positive, a high proportion of new followers can signal potential churn if they're not actively engaging. Focus on converting new followers into active participants through polls, lead clips, and community circles.`,
        metric: `${newFollowerRatio.toFixed(1)}% new followers`,
        action: 'Create engaging onboarding content and invite new followers to participate in polls',
        impact: 'low',
      });
    }

    // Rule 13: Verified voter ratio < 50%
    if (verifiedVoterRatio < 50 && allVotesForPolls.length >= 10) {
      insights.push({
        category: 'polls',
        severity: 'warning',
        title: 'Boost verified voter participation',
        description: `Only ${verifiedVoterRatio.toFixed(0)}% of your poll voters are verified members. Verified voters bring higher trust scores and more reliable data, which is especially important for business-facing polls. Consider using targeting criteria to prefer verified users or running polls in circles with verified members.`,
        metric: `${verifiedVoterRatio.toFixed(0)}% verified voter ratio`,
        action: 'Use targeting criteria in polls to prioritize verified voters with member scores above 300',
        impact: 'medium',
      });
    }

    // Rule 14: Top-viewed video has low engagement
    if (topViewedVideo && topViewedVideo.viewCount > 50 && topVideoEngRate < 3) {
      insights.push({
        category: 'engagement',
        severity: 'warning',
        title: 'High views but low engagement on top content',
        description: `Your most-viewed video "${topViewedVideo.title}" has ${formatNumber(topViewedVideo.viewCount)} views but only ${topVideoEngRate.toFixed(1)}% engagement. This suggests viewers are finding your content but not connecting enough to interact. The thumbnail and title are working, but the content may need stronger hooks, polls, or CTAs to convert passive viewers into active participants.`,
        metric: `${topVideoEngRate.toFixed(1)}% engagement on ${formatNumber(topViewedVideo.viewCount)} views`,
        action: 'Add a poll or discussion question to your top-performing video to spark interaction',
        impact: 'medium',
      });
    }

    // Rule 15: Recent activity is high
    if (recentActivityCount > 10) {
      insights.push({
        category: 'audience',
        severity: 'opportunity',
        title: 'Audience is highly active right now',
        description: `Your content received ${recentActivityCount} interactions in the last 2 hours, indicating a surge in audience activity. This is the ideal time to post new content, go live, or launch a poll — your audience is already engaged and primed to interact. Don't let this momentum go to waste.`,
        metric: `${recentActivityCount} interactions in the last 2 hours`,
        action: 'Post a new lead clip or launch a poll immediately to capitalize on active audience',
        impact: 'high',
      });
    }

    // ── Content Suggestions ───────────────────────────────────────
    const contentSuggestions: ContentSuggestion[] = [];

    // Suggestion based on top category
    if (topCategory) {
      const topCatSuggestions: Record<string, string> = {
        Tech: 'Create a "Tech Predictions" poll series — ask your audience to vote on upcoming trends in AI, mobile, or crypto',
        Entertainment: 'Launch a "Rate This" series where viewers vote on movie trailers, music videos, or viral clips',
        Sports: 'Create prediction polls for upcoming games or tournaments — audiences love proving their expertise',
        Music: 'Run "Discover vs. Classic" polls pitting new releases against timeless hits to drive passionate debate',
        News: 'Create "Your Take" lead clips on trending news stories — invite diverse perspectives through response clips',
        Lifestyle: 'Share "This or That" lifestyle polls on topics like productivity hacks, fashion, or wellness routines',
        Education: 'Build a "Quiz Time" series with educational polls that test knowledge and reveal surprising facts',
        Other: 'Experiment with a weekly opinion poll that taps into your audience\'s interests and sparks discussion',
      };
      contentSuggestions.push({
        type: 'poll_series',
        title: `${topCategory.name} engagement series`,
        description: topCatSuggestions[topCategory.name] || topCatSuggestions.Other,
        category: topCategory.name,
        reasoning: `${topCategory.name} is your top-performing category with ${formatNumber(topCategory.views)} total views`,
        estimatedImpact: 'high',
      });
    }

    // Suggestion based on engagement patterns
    if (engagementRate > 10) {
      contentSuggestions.push({
        type: 'community_building',
        title: 'Launch a community circle',
        description: 'Your strong engagement rates suggest a dedicated community. Create an exclusive circle where your most active followers can access early content, participate in private polls, and connect with each other.',
        category: topCategory?.name || 'General',
        reasoning: `Engagement rate of ${engagementRate.toFixed(1)}% shows a loyal, interactive audience`,
        estimatedImpact: 'medium',
      });
    }

    if (currentComments < currentLikes * 0.3) {
      contentSuggestions.push({
        type: 'comment_driver',
        title: 'Create debate-worthy content',
        description: 'Your comment-to-like ratio is low, meaning viewers react but don\'t discuss. Create lead clips with provocative questions, "hot take" opinions, or versus content that naturally invites comments and responses.',
        category: topCategory?.name || 'General',
        reasoning: `Comments are only ${currentLikes > 0 ? Math.round((currentComments / currentLikes) * 100) : 0}% of likes — below healthy benchmarks`,
        estimatedImpact: 'medium',
      });
    }

    if (paidPolls.length > 0 && avgPaidPollConversion > 50) {
      contentSuggestions.push({
        type: 'monetization',
        title: 'Scale your paid poll strategy',
        description: 'Your paid polls show strong conversion. Consider creating a premium content tier with exclusive polls that offer higher rewards, targeting niche topics your audience is willing to pay to influence.',
        category: topCategory?.name || 'General',
        reasoning: `Paid polls converting at ${avgPaidPollConversion.toFixed(0)}% — strong monetization signal`,
        estimatedImpact: 'high',
      });
    }

    // Suggestion based on posting frequency
    if (contentFrequencyPerWeek < 2) {
      contentSuggestions.push({
        type: 'consistency',
        title: 'Batch-create weekly content',
        description: 'Dedicate one day per week to creating 3-5 lead clips at once. Plan topics around trending conversations in your niche, and schedule polls to go live alongside each clip for maximum interaction.',
        category: topCategory?.name || 'General',
        reasoning: `Posting ${contentFrequencyPerWeek.toFixed(1)}x/week limits algorithmic visibility and audience retention`,
        estimatedImpact: 'medium',
      });
    }

    // Suggestion based on response rate
    if (responseRate < 1 && leadClips30d >= 2) {
      contentSuggestions.push({
        type: 'engagement_loop',
        title: 'Create a response challenge',
        description: 'Launch a "Response Challenge" where you ask creators to respond to a specific lead clip with their unique take. Highlight the best responses in a follow-up clip to incentivize participation and build a creator network.',
        category: topCategory?.name || 'General',
        reasoning: `Only ${responseRate.toFixed(1)} responses per lead clip — untapped growth opportunity`,
        estimatedImpact: 'medium',
      });
    }

    // Cross-category suggestion
    if (categoryDominance >= 2 && secondCategory) {
      contentSuggestions.push({
        type: 'diversification',
        title: `Test crossover content: ${topCategory!.name} × ${secondCategory.name}`,
        description: `Your ${topCategory!.name} content dominates, but ${secondCategory.name} has untapped potential. Create lead clips that blend both categories — for example, if you dominate Tech and have some Entertainment content, try "Tech Entertainment Reviews" to attract viewers from both audiences.`,
        category: secondCategory.name,
        reasoning: `${topCategory!.name} has ${formatNumber(topCategory!.views)} views vs ${secondCategory.name} at ${formatNumber(secondCategory.views)} — crossover could unlock growth`,
        estimatedImpact: 'medium',
      });
    }

    // ── Optimal Posting Times ─────────────────────────────────────
    const allTimestamps = [
      ...recentVotesAll.map((v) => v.createdAt),
      ...recentLikesAll.map((v) => v.createdAt),
      ...recentCommentsAll.map((v) => v.createdAt),
      ...recentReactionsAll.map((v) => v.createdAt),
    ];

    let bestDays: string[] = [];
    let bestHours: number[] = [];
    const timezone = user.location ? `${user.location} (estimated)` : 'UTC';

    if (allTimestamps.length >= 5) {
      // Day-of-week distribution
      const dayBuckets = Array.from({ length: 7 }, () => 0);
      for (const ts of allTimestamps) dayBuckets[ts.getDay()]++;
      const avgDay = allTimestamps.length / 7;
      bestDays = dayBuckets
        .map((count, idx) => ({ day: DAY_NAMES[idx], count, short: DAY_NAMES_SHORT[idx] }))
        .filter((d) => d.count >= avgDay * 1.2)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((d) => d.short);

      // If not enough best days, take top 3
      if (bestDays.length < 2) {
        bestDays = dayBuckets
          .map((count, idx) => ({ day: DAY_NAMES[idx], count, short: DAY_NAMES_SHORT[idx] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map((d) => d.short);
      }

      // Hour distribution
      const hourBuckets = Array.from({ length: 24 }, () => 0);
      for (const ts of allTimestamps) hourBuckets[ts.getHours()]++;
      const avgHour = allTimestamps.length / 24;

      // Find peak hours — group adjacent hours into windows
      const peakHours = hourBuckets
        .map((count, idx) => ({ hour: idx, count }))
        .filter((h) => h.count >= avgHour * 1.3)
        .sort((a, b) => b.count - a.count);

      bestHours = peakHours.slice(0, 3).map((h) => h.hour).sort((a, b) => a - b);
    } else {
      // Not enough data — use platform-wide defaults
      bestDays = ['Tue', 'Thu', 'Sat'];
      bestHours = [10, 14, 18];
    }

    // ── Growth Projections ────────────────────────────────────────
    // Simple linear projection based on recent trends
    const viewsPerDay7d = currentViews / 7;
    const projectedViews7d = Math.round(currentViews + viewsPerDay7d * 7);

    const followersPerDay = thirtyDaysAgo.getTime() < now.getTime() ? followers30d / 30 : 0;
    const projectedFollowers30d = Math.round(totalFollowers + followersPerDay * 30);

    const revenuePerDay = thisMonthRev / Math.max(now.getDate(), 1);
    const projectedRevenue30d = Math.round((thisMonthRev + revenuePerDay * (30 - now.getDate())) * 100) / 100;

    const growthProjections: GrowthProjections = {
      projectedViews7d,
      projectedFollowers30d,
      projectedRevenue30d,
    };

    // ── Competitive Score ─────────────────────────────────────────
    const totalInteractionsAll = userVideos.reduce(
      (s, v: any) => s + (v._count?.likes || 0) + (v._count?.comments || 0) + (v._count?.reactions || 0) + (v._count?.reposts || 0),
      0
    );
    const avgViewsPerVideo = userVideos.length > 0 ? totalViews / userVideos.length : 0;
    const userAvgEngagement = totalViews > 0 ? (totalInteractionsAll / totalViews) * 100 : 0;
    const userTotalPolls = userVideos.length; // poll count not directly available without include

    // Platform averages (use destructured results)
    const platAvgViews = platformAvgViewsPerVideo._avg?.viewCount || 0;
    const platAvgMemberScore = platformAvgFollowers._avg?.memberScore || 0;
    const platformTotalViewsAll = (platformTotalViews as { _sum: { viewCount: number | null } })._sum.viewCount || 0;
    const platformAvgEngagement = platformTotalViewsAll > 0
      ? ((platformTotalLikes) / platformTotalViewsAll) * 100
      : 5;

    // Engagement score (0-100): compare user engagement to platform average
    const engagementScore = Math.min(100, Math.round(
      platformAvgEngagement > 0 ? (userAvgEngagement / Math.max(platformAvgEngagement, 1)) * 50 : 50
    ));

    // Growth score: based on view growth rate
    const growthScore = Math.min(100, Math.max(0, Math.round(50 + viewsWoW * 1.5)));

    // Content quality score: based on avg views per video vs platform
    const contentQualityScore = Math.min(100, Math.round(
      platAvgViews > 0 ? (avgViewsPerVideo / Math.max(platAvgViews, 1)) * 50 : 50
    ));

    // Monetization score: based on revenue
    const platformAvgRevenue = platformUserCount > 0
      ? (platformTotalRevenue._sum.amount || 0) / platformUserCount
      : 10;
    const monetizationScore = Math.min(100, Math.round(
      platformAvgRevenue > 0 ? (thisMonthRev / Math.max(platformAvgRevenue, 1)) * 50 : 50
    ));

    // Audience score: based on follower count and growth
    const audienceScore = Math.min(100, Math.round(
      (totalFollowers / Math.max(platformUserCount / 10, 1)) * 30 +
      Math.min(followerGrowthRate, 20) * 2
    ));

    // Overall weighted composite
    const overall = Math.min(100, Math.round(
      engagementScore * 0.25 +
      growthScore * 0.25 +
      contentQualityScore * 0.20 +
      monetizationScore * 0.15 +
      audienceScore * 0.15
    ));

    let percentile: string;
    if (overall >= 90) percentile = 'Top 5%';
    else if (overall >= 75) percentile = 'Top 15%';
    else if (overall >= 60) percentile = 'Top 30%';
    else if (overall >= 45) percentile = 'Top 50%';
    else if (overall >= 30) percentile = 'Top 70%';
    else percentile = 'Bottom 30%';

    const competitiveScore: CompetitiveScore = {
      overall,
      engagement: engagementScore,
      growth: growthScore,
      contentQuality: contentQualityScore,
      monetization: monetizationScore,
      audience: audienceScore,
      percentile,
    };

    // ── Sort insights by impact then severity ─────────────────────
    const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const severityOrder: Record<string, number> = { warning: 0, opportunity: 1, info: 2 };
    insights.sort((a, b) => {
      const imp = impactOrder[a.impact] - impactOrder[b.impact];
      if (imp !== 0) return imp;
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    // ── If no insights generated, add a default ──────────────────
    if (insights.length === 0) {
      insights.push({
        category: 'content',
        severity: 'info',
        title: 'Start building your content presence',
        description: 'Your account is still in the early stages. Focus on creating your first lead clips with engaging polls to start building an audience. Consistency and quality content are the foundations of growth on any platform.',
        metric: '0 lead clips',
        action: 'Create your first lead clip with an engaging poll question',
        impact: 'medium',
      });
    }

    // ── Response ──────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: {
        generatedAt: now.toISOString(),
        period: '30d',
        performanceInsights: insights,
        contentSuggestions,
        optimalPostingTimes: {
          bestDays,
          bestHours,
          timezone,
        },
        growthProjections,
        competitiveScore,
        // Contextual metadata for the frontend
        _meta: {
          totalInsights: insights.length,
          highImpactCount: insights.filter((i) => i.impact === 'high').length,
          warningCount: insights.filter((i) => i.severity === 'warning').length,
          opportunityCount: insights.filter((i) => i.severity === 'opportunity').length,
          suggestionCount: contentSuggestions.length,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/analytics/ai-insights error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate AI insights. Please try again.' },
      { status: 500 }
    );
  }
}

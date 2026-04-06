import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, memberScore: true, createdAt: true } });
    if (!user) return Response.json({ success: false, error: 'User not found' }, { status: 404 });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ─── Fetch creator's metrics ─────────────────────────────────
    const [
      creatorVideos,
      creatorFollowers,
      creatorLikes,
      creatorComments,
      creatorResponses,
      creatorReactions,
    ] = await Promise.all([
      db.video.findMany({ where: { creatorId: userId }, select: { id: true, viewCount: true, category: true, type: true, createdAt: true } }),
      db.follow.count({ where: { followingId: userId } }),
      db.like.count({ where: { video: { creatorId: userId } } }),
      db.comment.count({ where: { video: { creatorId: userId } } }),
      db.video.count({ where: { creatorId: userId, parentVideoId: { not: null } } }),
      db.reaction.count({ where: { video: { creatorId: userId } } }),
    ]);

    const totalViews = creatorVideos.reduce((s, v) => s + v.viewCount, 0);
    const totalEngagement = creatorLikes + creatorComments + creatorResponses + creatorReactions;
    const leadClips = creatorVideos.filter(v => v.type === 'lead').length;
    const avgEngagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;
    const avgResponsesPerLead = leadClips > 0 ? creatorResponses / leadClips : 0;

    const creatorMetrics = {
      totalViews,
      avgEngagementRate: Math.round(avgEngagementRate * 10) / 10,
      followerCount: creatorFollowers,
      memberScore: user.memberScore,
      contentCount: creatorVideos.length,
      totalResponses: creatorResponses,
      avgPollTrustScore: 50, // default estimate
    };

    // ─── Fetch platform-wide metrics ─────────────────────────────
    const [
      totalVideos,
      totalUsers,
      platformViewSum,
      allCreatorVideos,
      platformFollowers,
    ] = await Promise.all([
      db.video.count(),
      db.user.count(),
      db.video.aggregate({ _sum: { viewCount: true } }),
      db.video.findMany({ select: { id: true, viewCount: true, creatorId: true, createdAt: true } }),
      db.follow.count(),
    ]);

    // Per-creator view aggregation
    const viewsByCreator = new Map<string, number>();
    for (const v of allCreatorVideos) {
      viewsByCreator.set(v.creatorId, (viewsByCreator.get(v.creatorId) || 0) + v.viewCount);
    }
    const creatorViewCounts = Array.from(viewsByCreator.values());
    const avgViewsPerCreator = creatorViewCounts.length > 0 ? creatorViewCounts.reduce((a, b) => a + b, 0) / creatorViewCounts.length : 0;
    creatorViewCounts.sort((a, b) => a - b);
    const medianViewsPerVideo = creatorViewCounts.length > 0
      ? creatorViewCounts[Math.floor(creatorViewCounts.length / 2)]
      : 0;
    const avgViewsPerVideo = totalVideos > 0 ? (platformViewSum._sum.viewCount || 0) / totalVideos : 0;

    // Engagement rate per creator (sample)
    const sampleCreators = allCreatorVideos.length > 0
      ? [...new Set(allCreatorVideos.slice(0, 500).map(v => v.creatorId))]
      : [];
    let avgPlatformEngagement = 0;
    if (sampleCreators.length > 0) {
      const [totalLikesSample, totalCommentsSample, totalReactionsSample] = await Promise.all([
        db.like.count({ where: { video: { creatorId: { in: sampleCreators } } } }),
        db.comment.count({ where: { video: { creatorId: { in: sampleCreators } } } }),
        db.reaction.count({ where: { video: { creatorId: { in: sampleCreators } } } }),
      ]);
      const sampleViews = sampleCreators.reduce((s, cid) => s + (viewsByCreator.get(cid) || 0), 0);
      avgPlatformEngagement = sampleViews > 0 ? ((totalLikesSample + totalCommentsSample + totalReactionsSample) / sampleViews) * 100 : 0;
    }

    const avgFollowers = totalUsers > 0 ? platformFollowers / totalUsers : 0;
    const avgVideosPerCreator = totalUsers > 0 ? totalVideos / totalUsers : 0;

    // Average member score (sample)
    const scoreSample = await db.user.findMany({ take: 500, select: { memberScore: true } });
    const avgMemberScore = scoreSample.length > 0 ? scoreSample.reduce((s, u) => s + u.memberScore, 0) / scoreSample.length : 0;

    // Average responses per lead (sample)
    const leadVideos = await db.video.findMany({ where: { type: 'lead' }, take: 500, select: { id: true } });
    const responseCounts = await Promise.all(
      leadVideos.map(lv => db.video.count({ where: { parentVideoId: lv.id } }))
    );
    const avgResponsesPerLeadPlatform = leadVideos.length > 0 ? responseCounts.reduce((s, c) => s + c, 0) / leadVideos.length : 0;

    const platformAverages = {
      avgViewsPerVideo: Math.round(avgViewsPerVideo),
      avgEngagementRate: Math.round(avgPlatformEngagement * 10) / 10,
      avgFollowers: Math.round(avgFollowers),
      avgMemberScore: Math.round(avgMemberScore),
      avgResponsesPerLead: Math.round(avgResponsesPerLeadPlatform * 10) / 10,
      avgPollTrustScore: 50,
      avgVideosPerCreator: Math.round(avgVideosPerCreator * 10) / 10,
      medianViewsPerVideo: Math.round(medianViewsPerVideo),
    };

    // ─── Percentile Rankings ──────────────────────────────────────
    const totalCreators = creatorViewCounts.length || 1;
    const viewsPercentile = Math.round((creatorViewCounts.filter(v => v <= totalViews).length / totalCreators) * 100);
    const engPercentile = avgPlatformEngagement > 0 ? Math.min(99, Math.round(Math.max(0, (avgEngagementRate / (avgPlatformEngagement * 3)) * 100))) : 50;
    const followersPercentile = Math.round(Math.min(99, (creatorFollowers / Math.max(1, avgFollowers * 3)) * 100));
    const scorePercentile = Math.round(Math.min(99, (user.memberScore / Math.max(1, avgMemberScore * 1.5)) * 100));
    const contentPercentile = Math.round(Math.min(99, (creatorVideos.length / Math.max(1, avgVideosPerCreator * 5)) * 100));
    const responsesPercentile = avgResponsesPerLeadPlatform > 0 ? Math.min(99, Math.round((avgResponsesPerLead / (avgResponsesPerLeadPlatform * 3)) * 100)) : 50;
    const pollPercentile = 50;

    const percentileRankings = {
      viewsPercentile: Math.min(99, viewsPercentile),
      engagementPercentile: engPercentile,
      followersPercentile,
      scorePercentile,
      contentPercentile,
      responsesPercentile,
      pollTrustPercentile: pollPercentile,
    };

    // ─── Category Benchmarks ─────────────────────────────────────
    const creatorCategories = [...new Set(creatorVideos.map(v => v.category).filter(Boolean))] as string[];
    const categoryBenchmarks = await Promise.all(
      creatorCategories.map(async (cat) => {
        const [catVideos, catCreatorViews] = await Promise.all([
          db.video.findMany({
            where: { category: cat },
            select: { id: true, viewCount: true, title: true },
            take: 100,
            orderBy: { viewCount: 'desc' },
          }),
          db.video.aggregate({ where: { category: cat }, _sum: { viewCount: true }, _count: true }),
        ]);

        const creatorCatViews = creatorVideos.filter(v => v.category === cat).reduce((s, v) => s + v.viewCount, 0);
        const catTotalViews = catCreatorViews._sum.viewCount || 0;
        const catTotalVideos = catCreatorViews._count || 1;
        const catAvgViews = catTotalVideos > 0 ? catTotalViews / catTotalVideos : 0;
        const catTopPerformers = catVideos.slice(0, 3).map(v => ({ id: v.id, title: v.title, views: v.viewCount }));

        return {
          category: cat,
          creatorViews: creatorCatViews,
          categoryAvgViews: Math.round(catAvgViews),
          totalVideosInCategory: catTotalVideos,
          topPerformers: catTopPerformers,
          aboveAverage: creatorCatViews > catAvgViews,
        };
      })
    );

    // ─── Ranking Badge ───────────────────────────────────────────
    const compositeScore = (
      percentileRankings.viewsPercentile * 0.2 +
      percentileRankings.engagementPercentile * 0.2 +
      percentileRankings.followersPercentile * 0.15 +
      percentileRankings.scorePercentile * 0.15 +
      percentileRankings.contentPercentile * 0.15 +
      percentileRankings.responsesPercentile * 0.05 +
      percentileRankings.pollTrustPercentile * 0.1
    );

    let rankingBadge: string;
    if (compositeScore >= 95) rankingBadge = 'Top 1%';
    else if (compositeScore >= 90) rankingBadge = 'Top 5%';
    else if (compositeScore >= 80) rankingBadge = 'Top 10%';
    else if (compositeScore >= 65) rankingBadge = 'Top 25%';
    else if (compositeScore >= 50) rankingBadge = 'Top 50%';
    else rankingBadge = 'Average';

    // ─── Growth Comparison ───────────────────────────────────────
    const recentFollowerGrowth = await db.follow.count({
      where: { followingId: userId, createdAt: { gte: thirtyDaysAgo } },
    });

    const platformRecentFollows = await db.follow.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });
    const creatorGrowthRate = creatorFollowers > 0 ? (recentFollowerGrowth / creatorFollowers) * 100 : 0;
    const platformGrowthRate = totalUsers > 0 ? (platformRecentFollows / totalUsers) * 100 : 0;

    const growthComparison = {
      creatorGrowthRate30d: Math.round(creatorGrowthRate * 10) / 10,
      platformAvgGrowthRate30d: Math.round(platformGrowthRate * 10) / 10,
      creatorViews30d: creatorVideos.filter(v => v.createdAt >= thirtyDaysAgo).reduce((s, v) => s + v.viewCount, 0),
      aboveAverage: creatorGrowthRate >= platformGrowthRate,
    };

    return Response.json({
      success: true,
      data: {
        creatorMetrics,
        platformAverages,
        percentileRankings,
        categoryBenchmarks,
        rankingBadge,
        compositeScore: Math.round(compositeScore * 10) / 10,
        growthComparison,
      },
    });
  } catch (error) {
    console.error('[Analytics Benchmarks Error]', error);
    return Response.json({ success: false, error: 'Failed to load benchmarks' }, { status: 500 });
  }
}

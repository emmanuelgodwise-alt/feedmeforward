import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/analytics/compare — Side-by-side comparison of multiple videos
export async function GET(request: NextRequest) {
  try {
    // ─── Authentication ─────────────────────────────────────────
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Provide X-User-Id header.' },
        { status: 401 },
      );
    }

    // ─── Validate query parameters ──────────────────────────────
    const searchParams = request.nextUrl.searchParams;
    const videoIdsParam = searchParams.get('videoIds');

    if (!videoIdsParam || videoIdsParam.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: videoIds. Provide a comma-separated list of video IDs.' },
        { status: 400 },
      );
    }

    const videoIds = videoIdsParam
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (videoIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid video IDs provided.' },
        { status: 400 },
      );
    }

    if (videoIds.length > 5) {
      return NextResponse.json(
        { success: false, error: 'Too many videos to compare. Maximum is 5 videos.' },
        { status: 400 },
      );
    }

    // Deduplicate IDs
    const uniqueIds = [...new Set(videoIds)];
    if (uniqueIds.length !== videoIds.length) {
      return NextResponse.json(
        { success: false, error: 'Duplicate video IDs detected. Each video can only be compared once.' },
        { status: 400 },
      );
    }

    // ─── Fetch videos (must belong to authenticated user) ───────
    const videos = await db.video.findMany({
      where: {
        id: { in: uniqueIds },
        creatorId: userId,
      },
      select: {
        id: true,
        title: true,
        type: true,
        category: true,
        createdAt: true,
        viewCount: true,
        thumbnailUrl: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            responses: true,
            reactions: true,
            reposts: true,
          },
        },
        reactions: {
          select: { type: true },
        },
        polls: {
          select: {
            id: true,
            question: true,
            options: true,
            responseCount: true,
          },
          take: 1,
        },
      },
    });

    // Validate all requested IDs were found and belong to user
    const foundIds = new Set(videos.map((v) => v.id));
    const missingIds = uniqueIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Video(s) not found or do not belong to you: ${missingIds.join(', ')}`,
        },
        { status: 404 },
      );
    }

    if (videos.length < 2) {
      return NextResponse.json(
        { success: false, error: 'At least 2 videos are required for comparison.' },
        { status: 400 },
      );
    }

    const now = new Date();

    // ─── Build video comparison data ────────────────────────────
    const videoData = videos.map((video) => {
      const views = video.viewCount || 0;
      const likes = video._count.likes;
      const comments = video._count.comments;
      const responses = video._count.responses;
      const shares = video._count.reposts;
      const totalEngagement = likes + comments + responses;
      const engagementRate = views > 0 ? (totalEngagement / views) * 100 : 0;

      // Days since published (minimum 1 to avoid division by zero)
      const msSincePublished = now.getTime() - video.createdAt.getTime();
      const daysSincePublished = Math.max(1, Math.floor(msSincePublished / (1000 * 60 * 60 * 24)));

      const viewsPerDay = views / daysSincePublished;
      const engagementVelocity = totalEngagement / daysSincePublished;

      // Reaction breakdown
      const reactionBreakdown: Record<string, number> = {};
      const reactionTypes = ['fire', 'heart', 'laugh', 'wow', 'sad', 'angry', 'clap', 'thinking'];
      for (const type of reactionTypes) {
        reactionBreakdown[type] = 0;
      }
      for (const reaction of video.reactions) {
        reactionBreakdown[reaction.type] = (reactionBreakdown[reaction.type] || 0) + 1;
      }

      // Poll data (if has poll)
      let pollData: {
        totalVotes: number;
        leadingOption: string | null;
        optionsCount: number;
      } | null = null;
      if (video.polls.length > 0) {
        const poll = video.polls[0];
        let options: Array<{ id: string; text: string; voteCount: number }> = [];
        try {
          options = JSON.parse(poll.options as string) as Array<{ id: string; text: string; voteCount: number }>;
        } catch {
          options = [];
        }
        const totalVotes = poll.responseCount || options.reduce((sum, o) => sum + (o.voteCount || 0), 0);
        const sortedOptions = [...options].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
        const leadingOption = sortedOptions.length > 0 && (sortedOptions[0].voteCount || 0) > 0
          ? sortedOptions[0].text
          : null;

        pollData = {
          totalVotes,
          leadingOption,
          optionsCount: options.length,
        };
      }

      return {
        id: video.id,
        title: video.title,
        thumbnail: video.thumbnailUrl || '',
        type: video.type,
        category: video.category,
        createdAt: video.createdAt.toISOString(),
        views,
        likes,
        comments,
        responses,
        engagementRate: Math.round(engagementRate * 100) / 100,
        reactionBreakdown,
        pollData,
        shares,
        daysSincePublished,
        viewsPerDay: Math.round(viewsPerDay * 100) / 100,
        engagementVelocity: Math.round(engagementVelocity * 100) / 100,
        // Raw values for internal comparison
        _raw: {
          totalReactions: Object.values(reactionBreakdown).reduce((s, v) => s + v, 0),
          totalEngagement,
          pollParticipation: pollData?.totalVotes || 0,
        },
      };
    });

    // ─── Head-to-head comparison analysis ───────────────────────

    // Best performing for each key metric
    const bestPerforming = ((): Array<{ metric: string; videoId: string; value: number | string }> => {
      const metrics: Array<{ key: string; label: string; getValue: (v: typeof videoData[0]) => number; format?: (v: number) => number | string }> = [
        { key: 'views', label: 'Views', getValue: (v) => v.views },
        { key: 'likes', label: 'Likes', getValue: (v) => v.likes },
        { key: 'comments', label: 'Comments', getValue: (v) => v.comments },
        { key: 'responses', label: 'Responses', getValue: (v) => v.responses },
        { key: 'shares', label: 'Shares', getValue: (v) => v.shares },
        { key: 'engagementRate', label: 'Engagement Rate', getValue: (v) => v.engagementRate, format: (v) => `${Math.round(v * 100) / 100}%` },
        { key: 'viewsPerDay', label: 'Views Per Day', getValue: (v) => v.viewsPerDay, format: (v) => Math.round(v * 100) / 100 },
        { key: 'engagementVelocity', label: 'Engagement Velocity', getValue: (v) => v.engagementVelocity, format: (v) => Math.round(v * 100) / 100 },
      ];

      return metrics.map(({ key, label, getValue, format }) => {
        let bestVideo = videoData[0];
        let bestValue = getValue(bestVideo);
        for (let i = 1; i < videoData.length; i++) {
          const val = getValue(videoData[i]);
          if (val > bestValue) {
            bestValue = val;
            bestVideo = videoData[i];
          }
        }
        return {
          metric: label,
          videoId: bestVideo.id,
          value: format ? format(bestValue) : bestValue,
        };
      });
    })();

    // Averages
    const count = videoData.length;
    const avgViews = Math.round(videoData.reduce((s, v) => s + v.views, 0) / count);
    const avgEngagement =
      Math.round(
        (videoData.reduce((s, v) => s + v.engagementRate, 0) / count) * 100,
      ) / 100;
    const avgViewsPerDay =
      Math.round(
        (videoData.reduce((s, v) => s + v.viewsPerDay, 0) / count) * 100,
      ) / 100;

    // Ranges
    const allViews = videoData.map((v) => v.views);
    const allEngagement = videoData.map((v) => v.engagementRate);
    const viewsRange = {
      min: Math.min(...allViews),
      max: Math.max(...allViews),
      spread: Math.max(...allViews) - Math.min(...allViews),
    };
    const engagementRange = {
      min: Math.round(Math.min(...allEngagement) * 100) / 100,
      max: Math.round(Math.max(...allEngagement) * 100) / 100,
      spread: Math.round((Math.max(...allEngagement) - Math.min(...allEngagement)) * 100) / 100,
    };

    // ─── Overall winner (composite score) ───────────────────────
    // Normalize each metric 0-100, then compute weighted composite
    const maxViews = Math.max(...videoData.map((v) => v.views), 1);
    const maxEngagement = Math.max(...videoData.map((v) => v.engagementRate), 0.01);
    const maxViewsPerDay = Math.max(...videoData.map((v) => v.viewsPerDay), 0.01);
    const maxReactions = Math.max(...videoData.map((v) => v._raw.totalReactions), 1);
    const maxVelocity = Math.max(...videoData.map((v) => v.engagementVelocity), 0.01);
    const maxPollParticipation = Math.max(...videoData.map((v) => v._raw.pollParticipation), 1);

    const compositeScores = videoData.map((v) => {
      const normViews = (v.views / maxViews) * 100;
      const normEngagement = (v.engagementRate / maxEngagement) * 100;
      const normViewsPerDay = (v.viewsPerDay / maxViewsPerDay) * 100;
      const normReactions = (v._raw.totalReactions / maxReactions) * 100;
      const normVelocity = (v.engagementVelocity / maxVelocity) * 100;
      const normPoll = (v._raw.pollParticipation / maxPollParticipation) * 100;

      // Weighted composite: views 25%, engagement 20%, reactions 15%, responses 10%, velocity 20%, poll 10%
      const composite =
        normViews * 0.25 +
        normEngagement * 0.20 +
        normReactions * 0.15 +
        ((v.responses / Math.max(...videoData.map((x) => x.responses), 1)) * 100) * 0.10 +
        normVelocity * 0.20 +
        normPoll * 0.10;

      return { videoId: v.id, compositeScore: Math.round(composite * 100) / 100 };
    });

    const winnerEntry = compositeScores.reduce((a, b) =>
      a.compositeScore > b.compositeScore ? a : b,
    );
    const winnerVideo = videoData.find((v) => v.id === winnerEntry.videoId)!;

    const comparison = {
      bestPerforming,
      averages: {
        avgViews,
        avgEngagement,
        avgViewsPerDay,
      },
      range: {
        viewsRange,
        engagementRange,
      },
      winner: {
        videoId: winnerVideo.id,
        title: winnerVideo.title,
        compositeScore: winnerEntry.compositeScore,
        highlights: bestPerforming
          .filter((b) => b.videoId === winnerVideo.id)
          .map((b) => b.metric),
      },
    };

    // ─── Normalized metrics for radar/spider chart ──────────────
    const maxResponses = Math.max(...videoData.map((v) => v.responses), 1);

    const metrics = videoData.map((v) => {
      const normViews = maxViews > 0 ? Math.round((v.views / maxViews) * 100) : 0;
      const normEngagement = maxEngagement > 0 ? Math.round((v.engagementRate / maxEngagement) * 100) : 0;
      const normReactions = maxReactions > 0 ? Math.round((v._raw.totalReactions / maxReactions) * 100) : 0;
      const normResponses = maxResponses > 0 ? Math.round((v.responses / maxResponses) * 100) : 0;
      const normVelocity = maxViewsPerDay > 0 ? Math.round((v.engagementVelocity / maxVelocity) * 100) : 0;
      const normPoll = maxPollParticipation > 0 ? Math.round((v._raw.pollParticipation / maxPollParticipation) * 100) : 0;

      return {
        videoId: v.id,
        title: v.title,
        views: normViews,
        engagement: normEngagement,
        reactions: normReactions,
        responses: normResponses,
        velocity: normVelocity,
        pollParticipation: normPoll,
      };
    });

    // ─── Clean up internal _raw field before response ───────────
    const cleanVideos = videoData.map(({ _raw, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      data: {
        videos: cleanVideos,
        comparison,
        metrics,
      },
    });
  } catch (error) {
    console.error('GET /api/analytics/compare error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load video comparison analytics' },
      { status: 500 },
    );
  }
}

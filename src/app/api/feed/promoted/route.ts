import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/feed/promoted — get promoted videos for the feed
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Get user profile for targeting
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        ageRange: true,
        location: true,
        gender: true,
        language: true,
        memberScore: true,
      },
    });

    // Find active promoted videos with budget remaining
    const promotedVideos = await db.promotedVideo.findMany({
      where: {
        status: 'active',
        spent: { lt: db.promotedVideo.fields.budget },
        startsAt: { lte: now },
        OR: [
          { endsAt: null },
          { endsAt: { gt: now } },
        ],
        // Don't show the creator's own promoted videos
        creatorId: { not: userId },
      },
      include: {
        video: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isVerified: true,
              },
            },
            _count: {
              select: { likes: true, comments: true, responses: true },
            },
          },
        },
      },
      take: 10, // fetch more, then filter
      orderBy: { createdAt: 'desc' },
    });

    // Filter by targeting criteria and limit to 3
    const filtered = promotedVideos.filter((pv) => {
      if (!pv.targetingCriteria) return true; // no targeting = show to all

      try {
        const criteria = JSON.parse(pv.targetingCriteria) as Record<string, unknown>;

        // Age range check
        if (criteria.age && user?.ageRange) {
          const targetAges = criteria.age as string[];
          if (Array.isArray(targetAges) && !targetAges.includes(user.ageRange)) {
            return false;
          }
        }

        // Location check
        if (criteria.location && user?.location) {
          const targetLocations = criteria.location as string[];
          if (Array.isArray(targetLocations) && !targetLocations.includes(user.location)) {
            return false;
          }
        }

        // Gender check
        if (criteria.gender && user?.gender) {
          const targetGenders = criteria.gender as string[];
          if (Array.isArray(targetGenders) && !targetGenders.includes(user.gender)) {
            return false;
          }
        }

        // Min score check
        if (criteria.minScore && user?.memberScore) {
          if (user.memberScore < (criteria.minScore as number)) {
            return false;
          }
        }

        return true;
      } catch {
        return true; // if criteria is malformed, show to all
      }
    }).slice(0, 3);

    // Deduct $0.01 per impression and increment impression count
    const results = [];
    for (const pv of filtered) {
      const impressionCost = 0.01;

      // Check if budget can cover impression
      const remaining = pv.budget - pv.spent;
      if (remaining < impressionCost) {
        // Mark as exhausted
        await db.promotedVideo.update({
          where: { id: pv.id },
          data: { status: 'exhausted' },
        });
        continue;
      }

      // Update promotion: increment impressions and spent
      await db.promotedVideo.update({
        where: { id: pv.id },
        data: {
          impressions: { increment: 1 },
          spent: { increment: impressionCost },
        },
      });

      results.push({
        id: pv.id,
        isPromoted: true,
        video: {
          id: pv.video.id,
          title: pv.video.title,
          description: pv.video.description,
          videoUrl: pv.video.videoUrl,
          thumbnailUrl: pv.video.thumbnailUrl,
          category: pv.video.category,
          viewCount: pv.video.viewCount,
          createdAt: pv.video.createdAt.toISOString(),
          creator: pv.video.creator,
          stats: pv.video._count,
        },
      });
    }

    return NextResponse.json({ promoted: results });
  } catch (error) {
    console.error('GET /api/feed/promoted error:', error);
    return NextResponse.json({ error: 'Failed to fetch promoted videos' }, { status: 500 });
  }
}

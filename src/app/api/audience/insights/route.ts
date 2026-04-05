import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/audience/insights — Platform-wide audience analytics
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Count total users with at least one profile data field filled
    const totalWithProfile = await db.user.count({
      where: {
        OR: [
          { ageRange: { not: null } },
          { location: { not: null } },
          { gender: { not: null } },
          { language: { not: null } },
          { interests: { not: null } },
        ],
      },
    });

    const totalUsers = await db.user.count();

    // Distribution by age range
    const ageRangeDist = await db.user.groupBy({
      by: ['ageRange'],
      where: { ageRange: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Distribution by gender
    const genderDist = await db.user.groupBy({
      by: ['gender'],
      where: { gender: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Top 10 locations
    const locationDist = await db.user.groupBy({
      by: ['location'],
      where: { location: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Distribution by language
    const languageDist = await db.user.groupBy({
      by: ['language'],
      where: { language: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Score range distribution
    const scoreRanges = [
      { label: '0-100', min: 0, max: 100 },
      { label: '101-300', min: 101, max: 300 },
      { label: '301-500', min: 301, max: 500 },
      { label: '501-750', min: 501, max: 750 },
      { label: '751+', min: 751, max: 999999 },
    ];

    const scoreDistribution = await Promise.all(
      scoreRanges.map(async (range) => {
        const count = await db.user.count({
          where: {
            memberScore: { gte: range.min, lte: range.max },
          },
        });
        return { range: range.label, count };
      })
    );

    // Top 20 interests by frequency
    const allUsers = await db.user.findMany({
      where: { interests: { not: null } },
      select: { interests: true },
    });

    const interestCounts: Record<string, number> = {};
    for (const user of allUsers) {
      if (user.interests) {
        try {
          const parsed = JSON.parse(user.interests) as string[];
          for (const interest of parsed) {
            const normalized = interest.toLowerCase().trim();
            if (normalized) {
              interestCounts[normalized] = (interestCounts[normalized] || 0) + 1;
            }
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    const topInterests = Object.entries(interestCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalWithProfile,
        percentageWithProfile: totalUsers > 0
          ? Math.round((totalWithProfile / totalUsers) * 100)
          : 0,
        distributions: {
          byAgeRange: ageRangeDist
            .filter((g) => g.ageRange)
            .map((g) => ({ value: g.ageRange, count: g._count.id })),
          byGender: genderDist
            .filter((g) => g.gender)
            .map((g) => ({ value: g.gender, count: g._count.id })),
          byLocation: locationDist
            .filter((g) => g.location)
            .map((g) => ({ value: g.location, count: g._count.id })),
          byLanguage: languageDist
            .filter((g) => g.language)
            .map((g) => ({ value: g.language, count: g._count.id })),
          byScoreRange: scoreDistribution,
        },
        topInterests,
      },
    });
  } catch (error) {
    console.error('Audience insights error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audience insights' },
      { status: 500 }
    );
  }
}

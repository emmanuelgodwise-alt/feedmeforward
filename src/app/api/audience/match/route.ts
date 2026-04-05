import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface MatchCriteria {
  ageRange?: string;
  location?: string;
  gender?: string;
  language?: string;
  interests?: string[];
  minScore?: number;
}

function buildWhereClause(criteria: MatchCriteria) {
  const AND: Record<string, unknown>[] = [];

  if (criteria.ageRange) {
    AND.push({ ageRange: criteria.ageRange });
  }
  if (criteria.location) {
    AND.push({ location: { contains: criteria.location } });
  }
  if (criteria.gender) {
    AND.push({ gender: criteria.gender });
  }
  if (criteria.language) {
    AND.push({ language: criteria.language });
  }
  if (criteria.interests && criteria.interests.length > 0) {
    const interestConditions = criteria.interests.map((interest) => ({
      interests: { contains: interest },
    }));
    AND.push({ OR: interestConditions });
  }
  if (criteria.minScore !== undefined && criteria.minScore > 0) {
    AND.push({ memberScore: { gte: criteria.minScore } });
  }

  return AND.length > 0 ? { AND } : {};
}

// POST /api/audience/match — Preview audience matching
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const criteria: MatchCriteria = body.criteria || body;

    // Validate allowed criteria fields
    const allowedFields = ['ageRange', 'location', 'gender', 'language', 'interests', 'minScore'];
    const invalidFields = Object.keys(criteria).filter((key) => !allowedFields.includes(key));
    if (invalidFields.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid criteria fields: ' + invalidFields.join(', ') },
        { status: 400 }
      );
    }

    // Build where clause
    const whereClause = buildWhereClause(criteria);

    // Count total matched users
    const totalMatched = await db.user.count({ where: whereClause });

    // Get breakdown by age range
    const ageRangeBreakdown = await db.user.groupBy({
      by: ['ageRange'],
      where: {
        ...whereClause,
        ageRange: { not: null },
      },
      _count: { id: true },
    });

    // Get breakdown by location
    const locationBreakdown = await db.user.groupBy({
      by: ['location'],
      where: {
        ...whereClause,
        location: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Get breakdown by gender
    const genderBreakdown = await db.user.groupBy({
      by: ['gender'],
      where: {
        ...whereClause,
        gender: { not: null },
      },
      _count: { id: true },
    });

    // Get breakdown by language
    const languageBreakdown = await db.user.groupBy({
      by: ['language'],
      where: {
        ...whereClause,
        language: { not: null },
      },
      _count: { id: true },
    });

    // Get top interests from matching users
    const matchingUsers = await db.user.findMany({
      where: whereClause,
      select: { interests: true },
    });

    const interestCounts: Record<string, number> = {};
    for (const user of matchingUsers) {
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
        totalMatched,
        breakdown: {
          byAgeRange: ageRangeBreakdown
            .filter((g) => g.ageRange)
            .map((g) => ({ value: g.ageRange, count: g._count.id })),
          byLocation: locationBreakdown
            .filter((g) => g.location)
            .map((g) => ({ value: g.location, count: g._count.id })),
          byGender: genderBreakdown
            .filter((g) => g.gender)
            .map((g) => ({ value: g.gender, count: g._count.id })),
          byLanguage: languageBreakdown
            .filter((g) => g.language)
            .map((g) => ({ value: g.language, count: g._count.id })),
          topInterests,
        },
      },
    });
  } catch (error) {
    console.error('Audience match error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to match audience' },
      { status: 500 }
    );
  }
}

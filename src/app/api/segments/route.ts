import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface SegmentCriteria {
  ageRange?: string;
  location?: string;
  gender?: string;
  language?: string;
  interests?: string[];
  minScore?: number;
}

function buildUserWhereClause(criteria: SegmentCriteria) {
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
    // Users whose interests JSON array contains at least one of the specified interests
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

// POST /api/segments — Create a saved audience segment
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
    const { name, description, criteria } = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Segment name is required' },
        { status: 400 }
      );
    }

    // Validate criteria
    if (!criteria || typeof criteria !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Criteria object is required' },
        { status: 400 }
      );
    }

    // Validate allowed criteria fields
    const allowedFields = ['ageRange', 'location', 'gender', 'language', 'interests', 'minScore'];
    const invalidFields = Object.keys(criteria).filter((key) => !allowedFields.includes(key));
    if (invalidFields.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid criteria fields: ' + invalidFields.join(', ') },
        { status: 400 }
      );
    }

    const validAgeRanges = ['18-24', '25-34', '35-44', '45-54', '55+'];
    if (criteria.ageRange && !validAgeRanges.includes(criteria.ageRange)) {
      return NextResponse.json(
        { success: false, error: 'Invalid age range' },
        { status: 400 }
      );
    }

    const validGenders = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
    if (criteria.gender && !validGenders.includes(criteria.gender)) {
      return NextResponse.json(
        { success: false, error: 'Invalid gender' },
        { status: 400 }
      );
    }

    if (criteria.interests && !Array.isArray(criteria.interests)) {
      return NextResponse.json(
        { success: false, error: 'Interests must be an array' },
        { status: 400 }
      );
    }

    if (criteria.minScore !== undefined && (typeof criteria.minScore !== 'number' || criteria.minScore < 0)) {
      return NextResponse.json(
        { success: false, error: 'minScore must be a non-negative number' },
        { status: 400 }
      );
    }

    // Calculate userCount by querying matching users
    const whereClause = buildUserWhereClause(criteria as SegmentCriteria);
    const userCount = await db.user.count({ where: whereClause });

    // Create the segment
    const segment = await db.audienceSegment.create({
      data: {
        creatorId: userId,
        name: name.trim(),
        description: description || null,
        criteria: JSON.stringify(criteria),
        userCount,
      },
    });

    return NextResponse.json({ success: true, data: segment }, { status: 201 });
  } catch (error) {
    console.error('Create segment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create segment' },
      { status: 500 }
    );
  }
}

// GET /api/segments — List segments for authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const segments = await db.audienceSegment.findMany({
      where: {
        creatorId: userId,
        ...(search && {
          name: { contains: search, mode: 'insensitive' as const },
        }),
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: segments });
  } catch (error) {
    console.error('List segments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list segments' },
      { status: 500 }
    );
  }
}

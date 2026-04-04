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

// PUT /api/segments/[id] — Update a segment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify the segment exists and belongs to the user
    const existing = await db.audienceSegment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Segment not found' },
        { status: 404 }
      );
    }
    if (existing.creatorId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to update this segment' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, criteria } = body;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Segment name is required' },
          { status: 400 }
        );
      }
    }

    // Validate criteria if provided
    if (criteria !== undefined) {
      if (!criteria || typeof criteria !== 'object') {
        return NextResponse.json(
          { success: false, error: 'Criteria must be an object' },
          { status: 400 }
        );
      }

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
    }

    // Recalculate userCount
    const criteriaToUse: SegmentCriteria = criteria
      ? criteria
      : JSON.parse(existing.criteria);

    const whereClause = buildUserWhereClause(criteriaToUse);
    const userCount = await db.user.count({ where: whereClause });

    // Update the segment
    const segment = await db.audienceSegment.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description || null }),
        ...(criteria !== undefined && { criteria: JSON.stringify(criteria) }),
        userCount,
      },
    });

    return NextResponse.json({ success: true, data: segment });
  } catch (error) {
    console.error('Update segment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update segment' },
      { status: 500 }
    );
  }
}

// DELETE /api/segments/[id] — Delete a segment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify ownership
    const existing = await db.audienceSegment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Segment not found' },
        { status: 404 }
      );
    }
    if (existing.creatorId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this segment' },
        { status: 403 }
      );
    }

    await db.audienceSegment.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Segment deleted' });
  } catch (error) {
    console.error('Delete segment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete segment' },
      { status: 500 }
    );
  }
}

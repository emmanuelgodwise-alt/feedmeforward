import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/polls-marketplace — List marketplace listings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creator = searchParams.get('creator');
    const status = searchParams.get('status');
    const applicant = searchParams.get('applicant');

    // Build where clause
    const where: Record<string, unknown> = {};

    if (creator) {
      where.creatorId = creator;
    }

    if (status) {
      if (status === 'all') {
        // No status filter
      } else if (
        status === 'active' ||
        status === 'closed' ||
        status === 'draft' ||
        status === 'paused' ||
        status === 'completed'
      ) {
        where.status = status;
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid status filter. Use "active", "closed", "draft", "paused", "completed", or "all".' },
          { status: 400 }
        );
      }
    } else {
      // Default: only active listings
      where.status = 'active';
    }

    // If applicant filter is provided, only return listings the user has applied to
    if (applicant) {
      where.applications = {
        some: { userId: applicant },
      };
    }

    const listings = await db.paidPollListing.findMany({
      where,
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
      },
      orderBy: { rewardPerResponse: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: listings,
    });
  } catch (error) {
    console.error('GET /api/polls-marketplace error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch marketplace listings' }, { status: 500 });
  }
}

// POST /api/polls-marketplace — Create a marketplace listing
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      minScore,
      verifiedOnly,
      minPollResponses,
      location,
      ageRange,
      gender,
      interests,
      rewardPerResponse,
      totalBudget,
      slots,
      closesAt,
    } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (!description || typeof description !== 'string' || description.trim().length < 1) {
      return NextResponse.json({ success: false, error: 'Description is required' }, { status: 400 });
    }
    if (rewardPerResponse == null || typeof rewardPerResponse !== 'number' || rewardPerResponse <= 0) {
      return NextResponse.json({ success: false, error: 'rewardPerResponse is required and must be a positive number' }, { status: 400 });
    }
    if (!slots || typeof slots !== 'number' || slots <= 0) {
      return NextResponse.json({ success: false, error: 'slots is required and must be a positive integer' }, { status: 400 });
    }

    // Auto-calculate totalBudget from rewardPerResponse * slots if not provided
    const calculatedTotalBudget = totalBudget != null ? totalBudget : rewardPerResponse * slots;

    // Validate interests if provided
    let interestsStr: string | null = null;
    if (interests) {
      try {
        interestsStr = JSON.stringify(interests);
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid interests JSON' }, { status: 400 });
      }
    }

    const listing = await db.paidPollListing.create({
      data: {
        creatorId: userId,
        title: title.trim(),
        description: description.trim(),
        minScore: minScore != null ? minScore : null,
        verifiedOnly: !!verifiedOnly,
        minPollResponses: minPollResponses != null ? minPollResponses : null,
        location: location || null,
        ageRange: ageRange || null,
        gender: gender || null,
        interests: interestsStr,
        rewardPerResponse,
        totalBudget: calculatedTotalBudget,
        slots,
        closesAt: closesAt ? new Date(closesAt) : null,
        status: 'active',
      },
    });

    return NextResponse.json({
      success: true,
      data: listing,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/polls-marketplace error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create marketplace listing' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Helper: transform DB listing to API response shape
function transformListing(listing: any) {
  let parsedInterests: string[] | null = null;
  if (listing.interests) {
    try { parsedInterests = JSON.parse(listing.interests); } catch { parsedInterests = null; }
  }

  return {
    id: listing.id,
    creatorId: listing.creatorId,
    creatorUsername: listing.creatorUsername ?? listing.creator?.username ?? null,
    creatorAvatarUrl: listing.creatorAvatarUrl ?? listing.creator?.avatarUrl ?? null,
    creatorDisplayName: listing.creatorDisplayName ?? listing.creator?.displayName ?? null,
    title: listing.title,
    description: listing.description,
    companyName: listing.companyName,
    industry: listing.industry,
    sessionFormat: listing.sessionFormat,
    sessionDuration: listing.sessionDuration,
    scheduledAt: listing.scheduledAt?.toISOString() ?? null,
    rewardPerParticipant: listing.rewardPerParticipant,
    totalSlots: listing.totalSlots,
    filledSlots: listing.filledSlots,
    totalBudget: listing.totalBudget,
    qualificationCriteria: {
      minScore: listing.minScore ?? null,
      verifiedOnly: listing.verifiedOnly ?? false,
      minPollResponses: listing.minPollResponses ?? null,
      location: listing.location ?? null,
      ageRange: listing.ageRange ?? null,
      gender: listing.gender ?? null,
      interests: parsedInterests,
    },
    status: listing.status,
    closesAt: listing.closesAt?.toISOString() ?? null,
    applicationsCount: listing._count?.applications ?? listing.applicationsCount ?? 0,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
}

// GET /api/focus-groups — List all focus group listings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creator = searchParams.get('creator');
    const status = searchParams.get('status');

    // Build where clause
    const where: Record<string, unknown> = {};

    if (creator) {
      where.creatorId = creator;
    }

    if (status) {
      if (status === 'all') {
        // No status filter
      } else if (
        status === 'open' ||
        status === 'paused' ||
        status === 'closed' ||
        status === 'completed'
      ) {
        where.status = status;
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid status filter. Use "open", "paused", "closed", "completed", or "all".' },
          { status: 400 }
        );
      }
    } else {
      // Default: only open listings
      where.status = 'open';
    }

    const listings = await db.focusGroupListing.findMany({
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
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { rewardPerParticipant: 'desc' },
    });

    const transformed = listings.map(transformListing);

    return NextResponse.json({
      success: true,
      listings: transformed,
      total: transformed.length,
    });
  } catch (error) {
    console.error('GET /api/focus-groups error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch focus group listings' }, { status: 500 });
  }
}

// POST /api/focus-groups — Create a new focus group listing
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
      companyName,
      industry,
      sessionFormat,
      sessionDuration,
      scheduledAt,
      rewardPerParticipant,
      totalSlots,
      minScore,
      verifiedOnly,
      minPollResponses,
      location,
      ageRange,
      gender,
      interests,
      closesAt,
    } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (!description || typeof description !== 'string' || description.trim().length < 1) {
      return NextResponse.json({ success: false, error: 'Description is required' }, { status: 400 });
    }
    if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 1) {
      return NextResponse.json({ success: false, error: 'Company name is required' }, { status: 400 });
    }
    if (!industry || typeof industry !== 'string' || industry.trim().length < 1) {
      return NextResponse.json({ success: false, error: 'Industry is required' }, { status: 400 });
    }

    // Auto-calculate totalBudget from rewardPerParticipant * totalSlots if not provided
    const slots = totalSlots || 10;
    const reward = rewardPerParticipant ?? 0;
    const totalBudget = reward * slots;

    // Validate interests if provided
    let interestsStr: string | null = null;
    if (interests) {
      try {
        interestsStr = JSON.stringify(interests);
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid interests JSON' }, { status: 400 });
      }
    }

    // Fetch user info for denormalized fields
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { username: true, displayName: true, avatarUrl: true },
    });

    const listing = await db.focusGroupListing.create({
      data: {
        creatorId: userId,
        creatorUsername: user?.username ?? null,
        creatorAvatarUrl: user?.avatarUrl ?? null,
        creatorDisplayName: user?.displayName ?? null,
        title: title.trim(),
        description: description.trim(),
        companyName: companyName.trim(),
        industry: industry.trim(),
        sessionFormat: sessionFormat || 'async_video',
        sessionDuration: sessionDuration || 60,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        rewardPerParticipant: reward,
        totalSlots: slots,
        totalBudget,
        minScore: minScore != null ? minScore : null,
        verifiedOnly: !!verifiedOnly,
        minPollResponses: minPollResponses != null ? minPollResponses : null,
        location: location || null,
        ageRange: ageRange || null,
        gender: gender || null,
        interests: interestsStr,
        closesAt: closesAt ? new Date(closesAt) : null,
        status: 'open',
      },
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
    });

    const transformed = transformListing({ ...listing, _count: { applications: 0 } });

    return NextResponse.json({
      success: true,
      listing: transformed,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/focus-groups error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create focus group listing' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/polls-marketplace/[id] — Get single listing with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');

    const listing = await db.paidPollListing.findUnique({
      where: { id },
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
        applications: {
          select: { status: true },
        },
      },
    });

    if (!listing) {
      return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
    }

    // Check current user's application status (if any)
    type UserApp = {
      id: string;
      status: string;
      coverMessage: string | null;
      createdAt: Date;
      reviewedAt: Date | null;
    } | null;
    let userApplication: UserApp = null;
    if (userId) {
      const app = await db.paidPollApplication.findUnique({
        where: {
          listingId_userId: {
            listingId: id,
            userId,
          },
        },
        select: {
          id: true,
          status: true,
          coverMessage: true,
          createdAt: true,
          reviewedAt: true,
        },
      });
      userApplication = app;
    }

    // Count applications per status
    const applicationCounts: Record<string, number> = {};
    for (const app of listing.applications) {
      applicationCounts[app.status] = (applicationCounts[app.status] || 0) + 1;
    }

    // Transform to match store's MarketplaceListing interface
    let parsedInterests: string[] | null = null;
    if (listing.interests) {
      try { parsedInterests = JSON.parse(listing.interests); } catch { parsedInterests = null; }
    }

    const transformedListing = {
      id: listing.id,
      creatorId: listing.creatorId,
      creatorUsername: listing.creator?.username ?? null,
      creatorAvatarUrl: listing.creator?.avatarUrl ?? null,
      creatorDisplayName: listing.creator?.displayName ?? null,
      title: listing.title,
      description: listing.description,
      rewardPerResponse: listing.rewardPerResponse,
      totalSlots: listing.slots,
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
      applicationsCount: listing.applications.length,
      applicationCounts,
      userApplication,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      listing: transformedListing,
    });
  } catch (error) {
    console.error('GET /api/polls-marketplace/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch listing' }, { status: 500 });
  }
}

// PATCH /api/polls-marketplace/[id] — Update listing (creator only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check listing exists and user is the creator
    const listing = await db.paidPollListing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
    }

    if (listing.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can update this listing' }, { status: 403 });
    }

    // Build update data from updatable fields
    const data: Record<string, unknown> = {};
    const updatableFields = [
      'title',
      'description',
      'minScore',
      'verifiedOnly',
      'minPollResponses',
      'location',
      'ageRange',
      'gender',
      'interests',
      'rewardPerResponse',
      'totalBudget',
      'slots',
      'closesAt',
      'status',
    ];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        if (field === 'interests' && body[field] !== null) {
          try {
            data[field] = JSON.stringify(body[field]);
          } catch {
            return NextResponse.json({ success: false, error: 'Invalid interests JSON' }, { status: 400 });
          }
        } else if (field === 'closesAt' && body[field] !== null) {
          data[field] = new Date(body[field]);
        } else if (field === 'rewardPerResponse' || field === 'totalBudget') {
          // Recalculate totalBudget if rewardPerResponse changed and totalBudget not explicitly set
          if (field === 'rewardPerResponse' && body.totalBudget === undefined) {
            data[field] = body[field];
            data.totalBudget = body[field] * listing.slots;
          } else {
            data[field] = body[field];
          }
        } else {
          data[field] = body[field];
        }
      }
    }

    // Recalculate totalBudget if slots changed
    if (body.slots !== undefined && body.totalBudget === undefined) {
      data.totalBudget = (body.rewardPerResponse ?? listing.rewardPerResponse) * body.slots;
    }

    const updatedListing = await db.paidPollListing.update({
      where: { id },
      data,
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

    // Transform the updated listing
    let parsedInterests: string[] | null = null;
    if (updatedListing.interests) {
      try { parsedInterests = JSON.parse(updatedListing.interests); } catch { parsedInterests = null; }
    }
    const transformedListing = {
      ...updatedListing,
      totalSlots: updatedListing.slots,
      qualificationCriteria: {
        minScore: updatedListing.minScore ?? null,
        verifiedOnly: updatedListing.verifiedOnly ?? false,
        minPollResponses: updatedListing.minPollResponses ?? null,
        location: updatedListing.location ?? null,
        ageRange: updatedListing.ageRange ?? null,
        gender: updatedListing.gender ?? null,
        interests: parsedInterests,
      },
      closesAt: updatedListing.closesAt?.toISOString() ?? null,
      createdAt: updatedListing.createdAt.toISOString(),
      updatedAt: updatedListing.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      listing: transformedListing,
    });
  } catch (error) {
    console.error('PATCH /api/polls-marketplace/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update listing' }, { status: 500 });
  }
}

// DELETE /api/polls-marketplace/[id] — Delete listing (creator only, draft or active with no accepted applications)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const listing = await db.paidPollListing.findUnique({
      where: { id },
      include: {
        applications: {
          select: { status: true },
        },
      },
    });

    if (!listing) {
      return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
    }

    if (listing.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can delete this listing' }, { status: 403 });
    }

    if (listing.status !== 'draft' && listing.status !== 'active') {
      return NextResponse.json(
        { success: false, error: `Cannot delete a listing with status "${listing.status}"` },
        { status: 400 }
      );
    }

    // If active, check there are no accepted applications
    if (listing.status === 'active') {
      const hasAccepted = listing.applications.some((app) => app.status === 'accepted');
      if (hasAccepted) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete a listing that has accepted applications' },
          { status: 400 }
        );
      }
    }

    await db.paidPollListing.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/polls-marketplace/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete listing' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/survey-marketplace/[id] — Get single listing with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');

    const listing = await db.surveyListing.findUnique({
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
      coverMessage: string;
      createdAt: Date;
      reviewedAt: Date | null;
    } | null;
    let userApplication: UserApp = null;
    if (userId) {
      const app = await db.surveyApplication.findUnique({
        where: {
          listingId_applicantId: {
            listingId: id,
            applicantId: userId,
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

    let parsedInterests: string[] | null = null;
    if (listing.interests) {
      try { parsedInterests = JSON.parse(listing.interests); } catch { parsedInterests = null; }
    }

    const transformedListing = {
      id: listing.id,
      creatorId: listing.creatorId,
      creatorUsername: listing.creatorUsername ?? listing.creator?.username ?? null,
      creatorAvatarUrl: listing.creatorAvatarUrl ?? listing.creator?.avatarUrl ?? null,
      creatorDisplayName: listing.creatorDisplayName ?? listing.creator?.displayName ?? null,
      title: listing.title,
      description: listing.description,
      organizationName: listing.organizationName,
      sector: listing.sector,
      surveyType: listing.surveyType,
      estimatedMinutes: listing.estimatedMinutes,
      questionsCount: listing.questionsCount,
      rewardPerResponse: listing.rewardPerResponse,
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
    console.error('GET /api/survey-marketplace/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch listing' }, { status: 500 });
  }
}

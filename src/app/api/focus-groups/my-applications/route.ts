import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/focus-groups/my-applications — List current user's applications with listing info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId query parameter is required' }, { status: 400 });
    }

    // Build where clause
    const where: Record<string, unknown> = { applicantId: userId };

    if (status) {
      if (status === 'all') {
        // No status filter
      } else if (
        status === 'pending' ||
        status === 'accepted' ||
        status === 'declined' ||
        status === 'completed'
      ) {
        where.status = status;
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid status filter. Use "pending", "accepted", "declined", "completed", or "all".' },
          { status: 400 }
        );
      }
    }

    const applications = await db.focusGroupApplication.findMany({
      where,
      include: {
        listing: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const transformed = applications.map((app) => ({
      id: app.id,
      listingId: app.listingId,
      listingTitle: app.listing?.title ?? null,
      listingCompanyName: app.listing?.companyName ?? null,
      listingIndustry: app.listing?.industry ?? null,
      listingSessionFormat: app.listing?.sessionFormat ?? null,
      listingRewardPerParticipant: app.listing?.rewardPerParticipant ?? null,
      listingStatus: app.listing?.status ?? null,
      applicantId: app.applicantId,
      applicantUsername: app.applicantUsername ?? null,
      applicantAvatarUrl: app.applicantAvatarUrl ?? null,
      applicantScore: app.applicantScore ?? null,
      applicantVerified: app.applicantVerified ?? null,
      coverMessage: app.coverMessage,
      status: app.status,
      reviewedAt: app.reviewedAt?.toISOString() ?? null,
      createdAt: app.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      applications: transformed,
    });
  } catch (error) {
    console.error('GET /api/focus-groups/my-applications error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch your applications' }, { status: 500 });
  }
}

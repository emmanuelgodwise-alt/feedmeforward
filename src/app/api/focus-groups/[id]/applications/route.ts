import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/focus-groups/[id]/applications — List all applications for a listing (creator only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Check listing exists and user is the creator
    const listing = await db.focusGroupListing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
    }

    if (listing.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can view applications' }, { status: 403 });
    }

    // Build where clause for applications
    const applicationWhere: Record<string, unknown> = { listingId: id };

    if (status) {
      if (status === 'all') {
        // No status filter
      } else if (
        status === 'pending' ||
        status === 'accepted' ||
        status === 'declined' ||
        status === 'completed'
      ) {
        applicationWhere.status = status;
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid status filter. Use "pending", "accepted", "declined", "completed", or "all".' },
          { status: 400 }
        );
      }
    }

    const applications = await db.focusGroupApplication.findMany({
      where: applicationWhere,
      include: {
        applicant: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const transformed = applications.map((app) => ({
      id: app.id,
      listingId: app.listingId,
      applicantId: app.applicantId,
      applicantUsername: app.applicantUsername ?? app.applicant?.username ?? null,
      applicantAvatarUrl: app.applicantAvatarUrl ?? app.applicant?.avatarUrl ?? null,
      applicantDisplayName: app.applicant?.displayName ?? null,
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
    console.error('GET /api/focus-groups/[id]/applications error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch applications' }, { status: 500 });
  }
}

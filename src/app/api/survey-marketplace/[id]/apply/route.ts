import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/survey-marketplace/[id]/apply — User applies to a survey listing
export async function POST(
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
    const { coverMessage } = body;

    // Check listing exists
    const listing = await db.surveyListing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
    }

    // Check listing is open
    if (listing.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'This listing is not currently accepting applications' },
        { status: 400 }
      );
    }

    // Check not past closesAt
    if (listing.closesAt && new Date(listing.closesAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This listing has closed and is no longer accepting applications' },
        { status: 410 }
      );
    }

    // Check user hasn't already applied
    const existingApplication = await db.surveyApplication.findUnique({
      where: {
        listingId_applicantId: {
          listingId: id,
          applicantId: userId,
        },
      },
    });
    if (existingApplication) {
      return NextResponse.json(
        { success: false, error: 'You have already applied to this listing' },
        { status: 409 }
      );
    }

    // Fetch user credentials from their profile
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        memberScore: true,
        isVerified: true,
        username: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Create application with auto-attached credentials
    const application = await db.surveyApplication.create({
      data: {
        listingId: id,
        applicantId: userId,
        applicantUsername: user.username ?? null,
        applicantAvatarUrl: user.avatarUrl ?? null,
        applicantScore: user.memberScore,
        applicantVerified: user.isVerified,
        coverMessage: coverMessage || '',
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      application,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/survey-marketplace/[id]/apply error:', error);
    return NextResponse.json({ success: false, error: 'Failed to apply to listing' }, { status: 500 });
  }
}

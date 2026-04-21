import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/polls-marketplace/[id]/apply — User applies to a listing
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
    const listing = await db.paidPollListing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
    }

    // Check listing is active
    if (listing.status !== 'active') {
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
    const existingApplication = await db.paidPollApplication.findUnique({
      where: {
        listingId_userId: {
          listingId: id,
          userId,
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
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Count user's PollVote records (totalPollResponses)
    const totalPollResponses = await db.pollVote.count({
      where: { userId },
    });

    // Count user's Follow records where they are being followed (totalFollowers)
    const totalFollowers = await db.follow.count({
      where: { followingId: userId },
    });

    // Create application with auto-attached credentials
    const application = await db.paidPollApplication.create({
      data: {
        listingId: id,
        userId,
        coverMessage: coverMessage || null,
        memberScore: user.memberScore,
        isVerified: user.isVerified,
        totalPollResponses,
        totalFollowers,
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      data: application,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/polls-marketplace/[id]/apply error:', error);
    return NextResponse.json({ success: false, error: 'Failed to apply to listing' }, { status: 500 });
  }
}

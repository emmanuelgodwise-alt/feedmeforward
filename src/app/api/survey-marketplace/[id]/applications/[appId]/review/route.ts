import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/survey-marketplace/[id]/applications/[appId]/review — Review an application (creator only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id, appId } = await params;
    const body = await request.json();
    const { action } = body;

    // Validate action
    if (!action || (action !== 'accept' && action !== 'decline')) {
      return NextResponse.json(
        { success: false, error: 'Action must be "accept" or "decline"' },
        { status: 400 }
      );
    }

    // Check listing exists and user is the creator
    const listing = await db.surveyListing.findUnique({ where: { id } });
    if (!listing) {
      return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
    }

    if (listing.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can review applications' }, { status: 403 });
    }

    // Check application exists and belongs to this listing
    const application = await db.surveyApplication.findUnique({
      where: { id: appId },
    });

    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    if (application.listingId !== id) {
      return NextResponse.json({ success: false, error: 'Application does not belong to this listing' }, { status: 400 });
    }

    if (application.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Cannot review an application with status "${application.status}"` },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      // Check filledSlots doesn't exceed totalSlots
      if (listing.filledSlots >= listing.totalSlots) {
        return NextResponse.json(
          { success: false, error: 'All slots are already filled' },
          { status: 400 }
        );
      }

      // Accept application and increment filledSlots in a transaction
      const [updatedApplication] = await db.$transaction([
        db.surveyApplication.update({
          where: { id: appId },
          data: {
            status: 'accepted',
            reviewedAt: new Date(),
          },
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
        }),
        db.surveyListing.update({
          where: { id },
          data: {
            filledSlots: { increment: 1 },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        application: updatedApplication,
      });
    } else {
      // Decline application
      const updatedApplication = await db.surveyApplication.update({
        where: { id: appId },
        data: {
          status: 'declined',
          reviewedAt: new Date(),
        },
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
      });

      return NextResponse.json({
        success: true,
        application: updatedApplication,
      });
    }
  } catch (error) {
    console.error('POST /api/survey-marketplace/[id]/applications/[appId]/review error:', error);
    return NextResponse.json({ success: false, error: 'Failed to review application' }, { status: 500 });
  }
}

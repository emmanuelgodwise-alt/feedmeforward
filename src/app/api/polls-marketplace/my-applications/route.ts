import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/polls-marketplace/my-applications — List current user's applications with listing info
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build where clause
    const where: Record<string, unknown> = { userId };

    if (status) {
      if (status === 'all') {
        // No status filter
      } else if (
        status === 'pending' ||
        status === 'accepted' ||
        status === 'declined' ||
        status === 'withdrawn' ||
        status === 'completed'
      ) {
        where.status = status;
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid status filter. Use "pending", "accepted", "declined", "withdrawn", "completed", or "all".' },
          { status: 400 }
        );
      }
    }

    const applications = await db.paidPollApplication.findMany({
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

    return NextResponse.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error('GET /api/polls-marketplace/my-applications error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch your applications' }, { status: 500 });
  }
}

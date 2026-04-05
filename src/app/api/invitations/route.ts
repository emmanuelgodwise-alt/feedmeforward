import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recalculateScore } from '@/lib/score-engine';

// ─── Helper: validate email format ────────────────────────────────────
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ─── POST /api/invitations — Create a new invitation ─────────────────
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { inviteeEmail, videoId } = body as {
      inviteeEmail?: string;
      videoId?: string;
    };

    // Validate required fields
    if (!inviteeEmail || typeof inviteeEmail !== 'string') {
      return NextResponse.json({ success: false, error: 'inviteeEmail is required' }, { status: 400 });
    }

    const normalizedEmail = inviteeEmail.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
    }

    // Validate videoId if provided
    if (videoId) {
      const video = await db.video.findUnique({
        where: { id: videoId },
        select: { id: true },
      });
      if (!video) {
        return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
      }
    }

    // Check max 50 invitations per user per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayInvitationCount = await db.invitation.count({
      where: {
        inviterId: userId,
        createdAt: { gte: todayStart },
      },
    });
    if (todayInvitationCount >= 50) {
      return NextResponse.json(
        { success: false, error: 'Daily invitation limit (50) reached. Try again tomorrow.' },
        { status: 429 }
      );
    }

    // Check for duplicate: don't allow invitations to same email that are still "sent" or "clicked"
    const existingPending = await db.invitation.findFirst({
      where: {
        inviterId: userId,
        inviteeEmail: normalizedEmail,
        status: { in: ['sent', 'clicked'] },
      },
    });
    if (existingPending) {
      return NextResponse.json(
        { success: false, error: 'An invitation to this email is already pending' },
        { status: 409 }
      );
    }

    // Create the invitation
    const invitation = await db.invitation.create({
      data: {
        inviterId: userId,
        inviteeEmail: normalizedEmail,
        videoId: videoId || null,
        status: 'sent',
      },
      include: {
        inviter: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        video: videoId
          ? { select: { id: true, title: true, thumbnailUrl: true } }
          : false,
      },
    });

    // Give inviter 10 member score points
    await db.user.update({
      where: { id: userId },
      data: { memberScore: { increment: 10 } },
    });

    // Trigger full score recalculation (fire and forget)
    recalculateScore(userId).catch((err) => console.error('Score recalc failed:', err));

    return NextResponse.json(
      {
        success: true,
        data: {
          id: invitation.id,
          inviterId: invitation.inviterId,
          inviteeEmail: invitation.inviteeEmail,
          videoId: invitation.videoId,
          status: invitation.status,
          rewardGiven: invitation.rewardGiven,
          createdAt: invitation.createdAt.toISOString(),
          inviter: invitation.inviter,
          video: invitation.video ?? undefined,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/invitations error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create invitation' }, { status: 500 });
  }
}

// ─── GET /api/invitations — List invitations for authenticated user ────
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sent'; // sent | received
    const status = searchParams.get('status') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Get user's email for "received" type
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Build where clause
    const where: Record<string, unknown> = {};

    if (type === 'received') {
      where.inviteeEmail = user.email;
    } else {
      where.inviterId = userId;
    }

    if (status) {
      where.status = status;
    }

    const [invitations, total] = await Promise.all([
      db.invitation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          inviter: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          video: {
            select: { id: true, title: true, thumbnailUrl: true },
          },
        },
      }),
      db.invitation.count({ where }),
    ]);

    const parsedInvitations = invitations.map((inv) => ({
      id: inv.id,
      inviterId: inv.inviterId,
      inviteeEmail: inv.inviteeEmail,
      videoId: inv.videoId,
      status: inv.status,
      rewardGiven: inv.rewardGiven,
      createdAt: inv.createdAt.toISOString(),
      respondedAt: inv.respondedAt?.toISOString() ?? null,
      inviter: inv.inviter,
      video: inv.video ?? undefined,
    }));

    return NextResponse.json({
      success: true,
      data: parsedInvitations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/invitations error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invitations' }, { status: 500 });
  }
}

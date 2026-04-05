import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recalculateScore } from '@/lib/score-engine';

// ─── Helper: validate email format ────────────────────────────────────
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ─── POST /api/invitations/bulk — Send bulk invitations (up to 10) ───
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { emails, videoId } = body as {
      emails?: string[];
      videoId?: string;
    };

    // Validate emails array
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ success: false, error: 'emails array is required with at least 1 email' }, { status: 400 });
    }
    if (emails.length > 10) {
      return NextResponse.json({ success: false, error: 'Maximum 10 emails per bulk request' }, { status: 400 });
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
    const remainingQuota = 50 - todayInvitationCount;
    if (remainingQuota <= 0) {
      return NextResponse.json(
        { success: false, error: 'Daily invitation limit (50) reached. Try again tomorrow.' },
        { status: 429 }
      );
    }

    // Normalize and deduplicate emails
    const normalizedEmails = [...new Set(
      emails
        .filter((e): e is string => typeof e === 'string')
        .map((e) => e.trim().toLowerCase())
    )];

    // Filter out invalid emails
    const invalidEmails: string[] = [];
    const validEmails: string[] = [];
    for (const email of normalizedEmails) {
      if (isValidEmail(email)) {
        validEmails.push(email);
      } else {
        invalidEmails.push(email);
      }
    }

    // Check for existing pending invitations to these emails
    const existingPending = await db.invitation.findMany({
      where: {
        inviterId: userId,
        inviteeEmail: { in: validEmails },
        status: { in: ['sent', 'clicked'] },
      },
      select: { inviteeEmail: true },
    });

    const pendingEmailSet = new Set(existingPending.map((inv) => inv.inviteeEmail));
    const skippedEmails = [
      ...invalidEmails,
      ...validEmails.filter((e) => pendingEmailSet.has(e)),
    ];

    // Emails that can actually be invited
    const emailsToInvite = validEmails.filter((e) => !pendingEmailSet.has(e));

    // Respect daily quota limit
    const emailsToProcess = emailsToInvite.slice(0, remainingQuota);
    const quotaSkipped = emailsToInvite.slice(remainingQuota);
    if (quotaSkipped.length > 0) {
      skippedEmails.push(...quotaSkipped);
    }

    // Create invitations for valid emails
    let createdCount = 0;
    let scorePointsEarned = 0;

    if (emailsToProcess.length > 0) {
      // Create all invitations in a single batch
      await db.invitation.createMany({
        data: emailsToProcess.map((email) => ({
          inviterId: userId,
          inviteeEmail: email,
          videoId: videoId || null,
          status: 'sent',
        })),
      });

      createdCount = emailsToProcess.length;
      scorePointsEarned = createdCount * 10;

      // Give inviter score points (10 per invitation)
      if (scorePointsEarned > 0) {
        await db.user.update({
          where: { id: userId },
          data: { memberScore: { increment: scorePointsEarned } },
        });

        // Trigger full score recalculation (fire and forget)
        recalculateScore(userId).catch((err) => console.error('Score recalc failed:', err));
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        createdCount,
        skippedEmails,
        skippedCount: skippedEmails.length,
        scorePointsEarned,
        remainingQuota: remainingQuota - createdCount,
      },
    });
  } catch (error) {
    console.error('POST /api/invitations/bulk error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send bulk invitations' }, { status: 500 });
  }
}

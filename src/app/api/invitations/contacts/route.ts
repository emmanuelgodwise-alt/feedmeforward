import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recalculateScore } from '@/lib/score-engine';

// ─── Helper: validate email format ────────────────────────────────────
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ─── POST /api/invitations/contacts ────────────────────────────────
// Process imported phone contacts and create invitations for non-members
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { contacts } = body as {
      contacts?: { name: string; phone?: string; email?: string }[];
    };

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ success: false, error: 'contacts array is required' }, { status: 400 });
    }

    if (contacts.length > 200) {
      return NextResponse.json({ success: false, error: 'Maximum 200 contacts per request' }, { status: 400 });
    }

    // Extract and normalize emails from contacts
    const contactEmails: { name: string; email: string }[] = [];
    for (const contact of contacts) {
      if (contact.email && typeof contact.email === 'string') {
        const email = contact.email.trim().toLowerCase();
        if (isValidEmail(email)) {
          contactEmails.push({ name: contact.name || '', email });
        }
      }
    }

    // Deduplicate by email
    const uniqueEmailMap = new Map<string, string>();
    for (const ce of contactEmails) {
      if (!uniqueEmailMap.has(ce.email)) {
        uniqueEmailMap.set(ce.email, ce.name);
      }
    }

    const uniqueEmails = [...uniqueEmailMap.keys()];

    // Check which emails are already on the platform
    const existingUsers = await db.user.findMany({
      where: { email: { in: uniqueEmails } },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isVerified: true,
      },
    });

    const onPlatformEmails = new Set(existingUsers.map((u) => u.email));
    const notOnPlatformEmails = uniqueEmails.filter((e) => !onPlatformEmails.has(e));

    // Check daily quota
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayInvitationCount = await db.invitation.count({
      where: {
        inviterId: userId,
        createdAt: { gte: todayStart },
      },
    });
    const remainingQuota = 50 - todayInvitationCount;

    // Check for existing pending invitations
    const existingPending = await db.invitation.findMany({
      where: {
        inviterId: userId,
        inviteeEmail: { in: notOnPlatformEmails },
        status: { in: ['sent', 'clicked'] },
      },
      select: { inviteeEmail: true },
    });

    const pendingEmailSet = new Set(existingPending.map((inv) => inv.inviteeEmail));
    const alreadyInvitedEmails = notOnPlatformEmails.filter((e) => pendingEmailSet.has(e));
    const newInviteEmails = notOnPlatformEmails.filter((e) => !pendingEmailSet.has(e));

    // Respect daily quota
    const emailsToProcess = newInviteEmails.slice(0, Math.max(0, remainingQuota));
    const quotaSkipped = newInviteEmails.slice(Math.max(0, remainingQuota));

    // Create invitations in batch
    let createdCount = 0;
    if (emailsToProcess.length > 0) {
      await db.invitation.createMany({
        data: emailsToProcess.map((email) => ({
          inviterId: userId,
          inviteeEmail: email,
          status: 'sent',
        })),
      });

      createdCount = emailsToProcess.length;

      // Give score points
      const scorePoints = createdCount * 10;
      if (scorePoints > 0) {
        await db.user.update({
          where: { id: userId },
          data: { memberScore: { increment: scorePoints } },
        });
        recalculateScore(userId).catch(() => {});
      }
    }

    // Categorize all not-on-platform emails
    const invited = [...emailsToProcess, ...alreadyInvitedEmails];
    const skipped = [...quotaSkipped];

    return NextResponse.json({
      success: true,
      data: {
        onPlatform: existingUsers.map((u) => ({
          email: u.email,
          userId: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          isVerified: u.isVerified,
        })),
        notOnPlatform: invited,
        invited: invited,
        alreadyInvited: alreadyInvitedEmails,
        skipped,
        createdCount,
        scorePointsEarned: createdCount * 10,
        remainingQuota: remainingQuota - createdCount,
      },
    });
  } catch (error) {
    console.error('POST /api/invitations/contacts error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process contacts' }, { status: 500 });
  }
}

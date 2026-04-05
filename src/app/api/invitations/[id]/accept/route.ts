import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recalculateScore } from '@/lib/score-engine';

// ─── POST /api/invitations/[id]/accept — Accept an invitation ────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: invitationId } = await params;

    // Get the user's email for matching
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Verify the invitation exists
    const invitation = await db.invitation.findUnique({
      where: { id: invitationId },
      include: {
        inviter: {
          select: { id: true, username: true },
        },
      },
    });
    if (!invitation) {
      return NextResponse.json({ success: false, error: 'Invitation not found' }, { status: 404 });
    }

    // Verify the inviteeEmail matches user's email
    if (invitation.inviteeEmail !== user.email) {
      return NextResponse.json(
        { success: false, error: 'This invitation is not addressed to you' },
        { status: 403 }
      );
    }

    // Check if already responded
    if (invitation.status === 'responded') {
      return NextResponse.json(
        { success: false, error: 'Invitation has already been accepted' },
        { status: 409 }
      );
    }

    // Update invitation status to "responded"
    const updatedInvitation = await db.invitation.update({
      where: { id: invitationId },
      data: {
        status: 'responded',
        respondedAt: new Date(),
      },
    });

    // Give the inviter rewards if not already given
    if (!invitation.rewardGiven) {
      // 50 bonus score points + $2 wallet reward to the inviter
      await db.$transaction([
        // Update invitation rewardGiven flag
        db.invitation.update({
          where: { id: invitationId },
          data: { rewardGiven: true },
        }),
        // Give inviter 50 score points
        db.user.update({
          where: { id: invitation.inviterId },
          data: { memberScore: { increment: 50 } },
        }),
        // Give inviter $2 wallet reward
        db.transaction.create({
          data: {
            userId: invitation.inviterId,
            amount: 2.0,
            type: 'reward',
            status: 'completed',
            description: `Invitation reward: ${user.email} accepted your invitation`,
            referenceId: invitationId,
          },
        }),
        // Update inviter wallet balance
        db.user.update({
          where: { id: invitation.inviterId },
          data: { walletBalance: { increment: 2.0 } },
        }),
      ]);

      // Trigger full score recalculation for the inviter (fire and forget)
      recalculateScore(invitation.inviterId).catch((err) =>
        console.error('Inviter score recalc failed:', err)
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedInvitation.id,
        status: updatedInvitation.status,
        respondedAt: updatedInvitation.respondedAt?.toISOString() ?? null,
        rewardGiven: true,
      },
    });
  } catch (error) {
    console.error('POST /api/invitations/[id]/accept error:', error);
    return NextResponse.json({ success: false, error: 'Failed to accept invitation' }, { status: 500 });
  }
}

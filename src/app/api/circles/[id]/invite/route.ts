import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/circles/[id]/invite — Invite user to circle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const inviterId = request.headers.get('X-User-Id');

    if (!inviterId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const circle = await db.circle.findUnique({ where: { id } });
    if (!circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 });
    }

    // Only members can invite
    const membership = await db.circleMember.findUnique({
      where: { circleId_userId: { circleId: id, userId: inviterId } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Only members can invite' }, { status: 403 });
    }

    const body = await request.json();
    const { userId: inviteeId } = body;

    if (!inviteeId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check invitee exists
    const invitee = await db.user.findUnique({
      where: { id: inviteeId },
      select: { id: true, username: true },
    });
    if (!invitee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already a member
    const existingMember = await db.circleMember.findUnique({
      where: { circleId_userId: { circleId: id, userId: inviteeId } },
    });
    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
    }

    // For public circles, auto-join
    if (circle.isPublic) {
      const [newMember] = await db.$transaction([
        db.circleMember.create({
          data: { circleId: id, userId: inviteeId, role: 'member' },
        }),
        db.circle.update({
          where: { id },
          data: { memberCount: { increment: 1 } },
        }),
      ]);
      return NextResponse.json({
        success: true,
        message: `${invitee.username} has been added to the circle`,
        member: newMember,
      });
    }

    // For private circles, create an invitation
    const invitation = await db.invitation.create({
      data: {
        inviterId,
        inviteeEmail: invitee.username, // Store username for identification
        circleId: id,
        status: 'sent',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${invitee.username}`,
      invitation,
    });
  } catch (error) {
    console.error('Error inviting user:', error);
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
  }
}

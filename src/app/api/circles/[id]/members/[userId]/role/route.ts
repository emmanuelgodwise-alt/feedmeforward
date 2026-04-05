import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/circles/[id]/members/[userId]/role — Change member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const { id, userId: targetUserId } = await params;
    const actorId = request.headers.get('X-User-Id');

    if (!actorId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check circle exists
    const circle = await db.circle.findUnique({ where: { id } });
    if (!circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 });
    }

    // Only creator or admin can change roles
    if (circle.creatorId !== actorId) {
      const actorMembership = await db.circleMember.findUnique({
        where: { circleId_userId: { circleId: id, userId: actorId } },
      });
      if (!actorMembership || actorMembership.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 });
      }
    }

    // Cannot change creator's role
    if (circle.creatorId === targetUserId) {
      return NextResponse.json({ error: 'Cannot change the creator\'s role' }, { status: 403 });
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !['member', 'moderator', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be member, moderator, or admin.' }, { status: 400 });
    }

    // Check target membership exists
    const targetMembership = await db.circleMember.findUnique({
      where: { circleId_userId: { circleId: id, userId: targetUserId } },
    });
    if (!targetMembership) {
      return NextResponse.json({ error: 'User is not a member' }, { status: 404 });
    }

    const updated = await db.circleMember.update({
      where: { circleId_userId: { circleId: id, userId: targetUserId } },
      data: { role },
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (error) {
    console.error('Error changing role:', error);
    return NextResponse.json({ error: 'Failed to change role' }, { status: 500 });
  }
}

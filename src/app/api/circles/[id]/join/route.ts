import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

// POST /api/circles/[id]/join — Join a circle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: circleId } = await params;

    // Verify circle exists
    const circle = await db.circle.findUnique({
      where: { id: circleId },
      select: { id: true, isPublic: true, creatorId: true, name: true },
    });

    if (!circle) {
      return NextResponse.json({ success: false, error: 'Circle not found' }, { status: 404 });
    }

    // Check not already a member
    const existingMember = await db.circleMember.findUnique({
      where: {
        circleId_userId: { circleId, userId },
      },
    });

    if (existingMember) {
      return NextResponse.json({ success: false, error: 'Already a member of this circle' }, { status: 409 });
    }

    // If private circle, reject
    if (!circle.isPublic) {
      return NextResponse.json({ success: false, error: 'This circle is private. You must be invited to join.' }, { status: 403 });
    }

    // Create membership + increment member count atomically
    const member = await db.$transaction(async (tx) => {
      const newMember = await tx.circleMember.create({
        data: {
          circleId,
          userId,
          role: 'member',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      await tx.circle.update({
        where: { id: circleId },
        data: { memberCount: { increment: 1 } },
      });

      return newMember;
    });

    // Create notification for circle creator
    const joiner = await db.user.findUnique({
      where: { id: userId },
      select: { username: true, displayName: true },
    });

    await db.notification.create({
      data: {
        userId: circle.creatorId,
        fromUserId: userId,
        type: 'circle_join',
        title: 'New Member',
        message: `${joiner?.displayName || '@' + (joiner?.username || 'Someone')} joined your circle "${circle.name}"`,
      },
    });

    return NextResponse.json({ success: true, member }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Already a member of this circle' }, { status: 409 });
    }
    console.error('POST /api/circles/[id]/join error:', error);
    return NextResponse.json({ success: false, error: 'Failed to join circle' }, { status: 500 });
  }
}

// DELETE /api/circles/[id]/join — Leave a circle
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: circleId } = await params;

    // Verify circle exists
    const circle = await db.circle.findUnique({
      where: { id: circleId },
      select: { id: true, creatorId: true },
    });

    if (!circle) {
      return NextResponse.json({ success: false, error: 'Circle not found' }, { status: 404 });
    }

    // Verify membership exists
    const membership = await db.circleMember.findUnique({
      where: {
        circleId_userId: { circleId, userId },
      },
    });

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Not a member of this circle' }, { status: 404 });
    }

    // Cannot leave if you're the creator
    if (circle.creatorId === userId) {
      return NextResponse.json({ success: false, error: 'Creator cannot leave. Delete the circle instead.' }, { status: 400 });
    }

    // Delete membership + decrement member count atomically
    await db.$transaction(async (tx) => {
      await tx.circleMember.delete({
        where: { id: membership.id },
      });

      await tx.circle.update({
        where: { id: circleId },
        data: { memberCount: { decrement: 1 } },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/circles/[id]/join error:', error);
    return NextResponse.json({ success: false, error: 'Failed to leave circle' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/circles/[id]/members — List members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('X-User-Id') || '';

    const circle = await db.circle.findUnique({ where: { id } });

    if (!circle) {
      return NextResponse.json({ error: 'Circle not found' }, { status: 404 });
    }

    // Only members or public circles can see members
    if (!circle.isPublic && userId) {
      const membership = await db.circleMember.findUnique({
        where: { circleId_userId: { circleId: id, userId } },
      });
      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const members = await db.circleMember.findMany({
      where: { circleId: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
      orderBy: [{ role: 'desc' }, { joinedAt: 'asc' }],
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    });
  } catch (error) {
    console.error('Error listing members:', error);
    return NextResponse.json({ error: 'Failed to list members' }, { status: 500 });
  }
}

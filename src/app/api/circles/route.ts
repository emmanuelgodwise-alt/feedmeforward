import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

// GET /api/circles — List circles with filters
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || undefined;
    const my = searchParams.get('my') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.CircleWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // If my=true, only show circles where user is a member
    if (my && userId) {
      where.members = {
        some: { userId },
      };
    } else if (my && !userId) {
      return NextResponse.json({ success: false, error: 'Authentication required to view your circles' }, { status: 401 });
    }

    const [circles, total] = await Promise.all([
      db.circle.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { memberCount: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          members: userId
            ? {
                where: { userId },
                select: { id: true },
              }
            : false,
        },
      }),
      db.circle.count({ where }),
    ]);

    // Fetch member counts in batch if needed (already on model)
    const enrichedCircles = await Promise.all(
      circles.map(async (circle) => {
        const isMember = userId ? circle.members.length > 0 : false;

        // Remove the members array from the response
        const { members, ...rest } = circle;

        return {
          ...rest,
          memberCount: circle.memberCount,
          isMember,
        };
      })
    );

    return NextResponse.json({
      circles: enrichedCircles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/circles error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch circles' }, { status: 500 });
  }
}

// POST /api/circles — Create a new circle
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, coverUrl, isPublic } = body;

    // Validate name
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'Circle name is required' }, { status: 400 });
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      return NextResponse.json({ success: false, error: 'Circle name must be at least 3 characters' }, { status: 400 });
    }
    if (trimmedName.length > 100) {
      return NextResponse.json({ success: false, error: 'Circle name must be at most 100 characters' }, { status: 400 });
    }

    // Create circle + admin membership atomically
    const circle = await db.$transaction(async (tx) => {
      const newCircle = await tx.circle.create({
        data: {
          name: trimmedName,
          description: description?.trim() || null,
          coverUrl: coverUrl || null,
          creatorId: userId,
          isPublic: isPublic !== undefined ? isPublic : true,
          memberCount: 1,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      await tx.circleMember.create({
        data: {
          circleId: newCircle.id,
          userId,
          role: 'admin',
        },
      });

      return newCircle;
    });

    return NextResponse.json({ success: true, circle }, { status: 201 });
  } catch (error) {
    console.error('POST /api/circles error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create circle' }, { status: 500 });
  }
}

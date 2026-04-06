import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/circles/[id] — Get circle detail with members and videos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('X-User-Id');

    const circle = await db.circle.findUnique({
      where: { id },
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
        members: {
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
          orderBy: { joinedAt: 'asc' },
        },
        videos: {
          include: {
            video: {
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
                _count: {
                  select: { likes: true, comments: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!circle) {
      return NextResponse.json({ success: false, error: 'Circle not found' }, { status: 404 });
    }

    // Check if current user is a member
    let isMember = false;
    if (userId) {
      isMember = circle.members.some((m) => m.userId === userId);
    }

    // Format members
    const formattedMembers = circle.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      circleId: m.circleId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    }));

    // Format videos
    const formattedVideos = circle.videos.map((cv) => ({
      id: cv.id,
      circleId: cv.circleId,
      videoId: cv.videoId,
      sharedBy: cv.sharedBy,
      createdAt: cv.createdAt,
      video: {
        ...cv.video,
        likeCount: cv.video._count.likes,
        commentCount: cv.video._count.comments,
      },
    }));

    const { videos: circleVideos, ...circleData } = circle;

    return NextResponse.json({
      success: true,
      circle: {
        ...circleData,
        memberCount: circle.memberCount,
        isMember,
        members: formattedMembers,
        videos: formattedVideos,
      },
    });
  } catch (error) {
    console.error('GET /api/circles/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch circle' }, { status: 500 });
  }
}

// PATCH /api/circles/[id] — Update circle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, coverUrl, isPublic } = body;

    // Verify circle exists
    const circle = await db.circle.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true },
        },
      },
    });

    if (!circle) {
      return NextResponse.json({ success: false, error: 'Circle not found' }, { status: 404 });
    }

    // Check permission: creator or admin
    if (circle.creatorId !== userId) {
      const membership = await db.circleMember.findUnique({
        where: {
          circleId_userId: { circleId: id, userId },
        },
        select: { role: true },
      });

      if (!membership || membership.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Only the creator or admin can update this circle' }, { status: 403 });
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      const trimmedName = typeof name === 'string' ? name.trim() : '';
      if (trimmedName.length < 3 || trimmedName.length > 100) {
        return NextResponse.json({ success: false, error: 'Circle name must be between 3 and 100 characters' }, { status: 400 });
      }
      updateData.name = trimmedName;
    }
    if (description !== undefined) {
      updateData.description = typeof description === 'string' ? description.trim() || null : null;
    }
    if (coverUrl !== undefined) {
      updateData.coverUrl = coverUrl || null;
    }
    if (isPublic !== undefined) {
      updateData.isPublic = Boolean(isPublic);
    }

    const updatedCircle = await db.circle.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ success: true, circle: updatedCircle });
  } catch (error) {
    console.error('PATCH /api/circles/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update circle' }, { status: 500 });
  }
}

// DELETE /api/circles/[id] — Delete circle
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Verify circle exists
    const circle = await db.circle.findUnique({
      where: { id },
      select: { creatorId: true },
    });

    if (!circle) {
      return NextResponse.json({ success: false, error: 'Circle not found' }, { status: 404 });
    }

    // Only creator can delete
    if (circle.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can delete this circle' }, { status: 403 });
    }

    // Delete circle (cascade will handle members and videos)
    await db.circle.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/circles/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete circle' }, { status: 500 });
  }
}

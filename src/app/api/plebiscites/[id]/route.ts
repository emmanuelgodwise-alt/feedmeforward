import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/plebiscites/[id] — Get single plebiscite with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');

    const plebiscite = await db.plebiscite.findUnique({
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
      },
    });

    if (!plebiscite) {
      return NextResponse.json({ success: false, error: 'Plebiscite not found' }, { status: 404 });
    }

    // Check if current user has voted
    let userVote: string | null = null;
    if (userId) {
      const existingVote = await db.plebisciteVote.findUnique({
        where: {
          plebisciteId_userId: {
            plebisciteId: id,
            userId,
          },
        },
        select: { choice: true },
      });
      userVote = existingVote?.choice || null;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...plebiscite,
        userVote,
      },
    });
  } catch (error) {
    console.error('GET /api/plebiscites/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch plebiscite' }, { status: 500 });
  }
}

// DELETE /api/plebiscites/[id] — Delete a plebiscite (creator only, draft or active)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const plebiscite = await db.plebiscite.findUnique({ where: { id } });
    if (!plebiscite) {
      return NextResponse.json({ success: false, error: 'Plebiscite not found' }, { status: 404 });
    }

    if (plebiscite.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can delete this plebiscite' }, { status: 403 });
    }

    if (plebiscite.status !== 'draft' && plebiscite.status !== 'active') {
      return NextResponse.json(
        { success: false, error: `Cannot delete a plebiscite with status "${plebiscite.status}"` },
        { status: 400 }
      );
    }

    await db.plebiscite.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/plebiscites/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete plebiscite' }, { status: 500 });
  }
}

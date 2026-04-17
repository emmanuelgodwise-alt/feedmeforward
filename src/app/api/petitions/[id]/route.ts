import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/petitions/[id] — Get single petition with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const { id } = await params;

    const petition = await db.petition.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        signatures: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!petition) {
      return NextResponse.json({ success: false, error: 'Petition not found' }, { status: 404 });
    }

    // Check if current user has signed
    let hasSigned = false;
    if (userId) {
      const existingSignature = await db.petitionSignature.findUnique({
        where: { petitionId_userId: { petitionId: id, userId } },
      });
      hasSigned = !!existingSignature;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...petition,
        hasSigned,
      },
    });
  } catch (error) {
    console.error('GET /api/petitions/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get petition' }, { status: 500 });
  }
}

// DELETE /api/petitions/[id] — Delete petition (creator only, draft or active)
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

    const petition = await db.petition.findUnique({ where: { id } });
    if (!petition) {
      return NextResponse.json({ success: false, error: 'Petition not found' }, { status: 404 });
    }

    if (petition.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can delete this petition' }, { status: 403 });
    }

    if (petition.status !== 'draft' && petition.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Only draft or active petitions can be deleted' }, { status: 400 });
    }

    await db.petition.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('DELETE /api/petitions/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete petition' }, { status: 500 });
  }
}

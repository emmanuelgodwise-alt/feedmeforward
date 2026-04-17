import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/petitions/[id]/resolve — Mark petition as resolved (creator only)
export async function POST(
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
      return NextResponse.json({ success: false, error: 'Only the creator can resolve this petition' }, { status: 403 });
    }

    const updatedPetition = await db.petition.update({
      where: { id },
      data: {
        status: 'resolved',
      },
    });

    return NextResponse.json({ success: true, data: updatedPetition });
  } catch (error) {
    console.error('POST /api/petitions/[id]/resolve error:', error);
    return NextResponse.json({ success: false, error: 'Failed to resolve petition' }, { status: 500 });
  }
}

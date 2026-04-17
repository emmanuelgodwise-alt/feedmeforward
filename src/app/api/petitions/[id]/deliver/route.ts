import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/petitions/[id]/deliver — Mark petition as delivered (creator only)
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
      return NextResponse.json({ success: false, error: 'Only the creator can mark this petition as delivered' }, { status: 403 });
    }

    if (petition.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Only active petitions can be marked as delivered' }, { status: 400 });
    }

    const updatedPetition = await db.petition.update({
      where: { id },
      data: {
        status: 'delivered',
        deliveredAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: updatedPetition });
  } catch (error) {
    console.error('POST /api/petitions/[id]/deliver error:', error);
    return NextResponse.json({ success: false, error: 'Failed to mark petition as delivered' }, { status: 500 });
  }
}

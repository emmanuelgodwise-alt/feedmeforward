import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/petitions/[id]/sign — Sign a petition
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: petitionId } = await params;
    const body = await request.json();
    const { videoUrl, videoId, comment } = body;

    // Check petition exists and is active
    const petition = await db.petition.findUnique({ where: { id: petitionId } });
    if (!petition) {
      return NextResponse.json({ success: false, error: 'Petition not found' }, { status: 404 });
    }

    if (petition.status !== 'active') {
      return NextResponse.json({ success: false, error: 'This petition is no longer accepting signatures' }, { status: 400 });
    }

    // Check if petition has closed
    if (petition.closesAt && new Date(petition.closesAt) < new Date()) {
      return NextResponse.json({ success: false, error: 'This petition has closed' }, { status: 410 });
    }

    // Check if user has already signed (unique constraint will catch it, but give a nice message)
    const existingSignature = await db.petitionSignature.findUnique({
      where: { petitionId_userId: { petitionId, userId } },
    });
    if (existingSignature) {
      return NextResponse.json({ success: false, error: 'You have already signed this petition' }, { status: 409 });
    }

    // Create signature and increment count in a transaction
    const [, updatedPetition] = await db.$transaction([
      db.petitionSignature.create({
        data: {
          petitionId,
          userId,
          videoUrl: videoUrl || null,
          videoId: videoId || null,
          comment: comment || null,
        },
      }),
      db.petition.update({
        where: { id: petitionId },
        data: {
          currentSignatures: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        petitionId,
        currentSignatures: updatedPetition.currentSignatures,
      },
    });
  } catch (error) {
    console.error('POST /api/petitions/[id]/sign error:', error);
    return NextResponse.json({ success: false, error: 'Failed to sign petition' }, { status: 500 });
  }
}

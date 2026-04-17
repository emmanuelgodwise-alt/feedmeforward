import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/petitions/[id]/respond — Add target response (creator only)
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
    const body = await request.json();
    const { responseText } = body;

    if (!responseText || typeof responseText !== 'string' || responseText.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Response text is required' }, { status: 400 });
    }

    const petition = await db.petition.findUnique({ where: { id } });
    if (!petition) {
      return NextResponse.json({ success: false, error: 'Petition not found' }, { status: 404 });
    }

    if (petition.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can add a response' }, { status: 403 });
    }

    const updatedPetition = await db.petition.update({
      where: { id },
      data: {
        status: 'responded',
        responseText: responseText.trim(),
      },
    });

    return NextResponse.json({ success: true, data: updatedPetition });
  } catch (error) {
    console.error('POST /api/petitions/[id]/respond error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add response' }, { status: 500 });
  }
}

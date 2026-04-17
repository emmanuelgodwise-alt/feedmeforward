import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/plebiscites/[id]/close — Close a plebiscite (creator only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id: plebisciteId } = await params;

    // Fetch plebiscite
    const plebiscite = await db.plebiscite.findUnique({ where: { id: plebisciteId } });
    if (!plebiscite) {
      return NextResponse.json({ success: false, error: 'Plebiscite not found' }, { status: 404 });
    }

    // Only creator can close
    if (plebiscite.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can close this plebiscite' }, { status: 403 });
    }

    // Must be active to close
    if (plebiscite.status !== 'active') {
      return NextResponse.json(
        { success: false, error: `Cannot close a plebiscite with status "${plebiscite.status}"` },
        { status: 400 }
      );
    }

    // Determine winner
    let winnerLabel: 'A' | 'B' | null = null;
    if (plebiscite.optionAVotes > plebiscite.optionBVotes) {
      winnerLabel = 'A';
    } else if (plebiscite.optionBVotes > plebiscite.optionAVotes) {
      winnerLabel = 'B';
    }
    // If tied, winnerLabel stays null

    const updated = await db.plebiscite.update({
      where: { id: plebisciteId },
      data: {
        status: 'closed',
        winnerLabel,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        winnerLabel: updated.winnerLabel,
        optionAVotes: updated.optionAVotes,
        optionBVotes: updated.optionBVotes,
        totalVotes: updated.totalVotes,
      },
    });
  } catch (error) {
    console.error('POST /api/plebiscites/[id]/close error:', error);
    return NextResponse.json({ success: false, error: 'Failed to close plebiscite' }, { status: 500 });
  }
}

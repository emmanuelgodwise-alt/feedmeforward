import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/plebiscites/[id]/vote — Cast a vote
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
    const body = await request.json();
    const { choice } = body;

    // Validate choice
    if (!choice || (choice !== 'A' && choice !== 'B')) {
      return NextResponse.json({ success: false, error: 'Choice must be "A" or "B"' }, { status: 400 });
    }

    // Fetch plebiscite
    const plebiscite = await db.plebiscite.findUnique({ where: { id: plebisciteId } });
    if (!plebiscite) {
      return NextResponse.json({ success: false, error: 'Plebiscite not found' }, { status: 404 });
    }

    // Check plebiscite is active
    if (plebiscite.status !== 'active') {
      return NextResponse.json({ success: false, error: 'This plebiscite is no longer accepting votes' }, { status: 410 });
    }

    // Check if past closesAt
    if (plebiscite.closesAt && new Date(plebiscite.closesAt) < new Date()) {
      return NextResponse.json({ success: false, error: 'This plebiscite has closed' }, { status: 410 });
    }

    // Check verifiedOnly restriction
    if (plebiscite.verifiedOnly) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { isVerified: true },
      });
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      if (!user.isVerified) {
        return NextResponse.json({ success: false, error: 'Only verified users can vote on this plebiscite' }, { status: 403 });
      }
    }

    // Check if user has already voted (unique constraint)
    const existingVote = await db.plebisciteVote.findUnique({
      where: {
        plebisciteId_userId: { plebisciteId, userId },
      },
    });
    if (existingVote) {
      return NextResponse.json({ success: false, error: 'You have already voted on this plebiscite' }, { status: 409 });
    }

    // Atomic transaction: create vote + increment tallies
    const [vote] = await db.$transaction([
      db.plebisciteVote.create({
        data: {
          plebisciteId,
          userId,
          choice,
        },
      }),
      db.plebiscite.update({
        where: { id: plebisciteId },
        data: {
          ...(choice === 'A'
            ? { optionAVotes: { increment: 1 } }
            : { optionBVotes: { increment: 1 } }),
          totalVotes: { increment: 1 },
        },
      }),
    ]);

    // Fetch updated tallies to return
    const updated = await db.plebiscite.findUnique({
      where: { id: plebisciteId },
      select: { optionAVotes: true, optionBVotes: true, totalVotes: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        voteId: vote.id,
        choice: vote.choice,
        optionAVotes: updated?.optionAVotes ?? plebiscite.optionAVotes + (choice === 'A' ? 1 : 0),
        optionBVotes: updated?.optionBVotes ?? plebiscite.optionBVotes + (choice === 'B' ? 1 : 0),
        totalVotes: updated?.totalVotes ?? plebiscite.totalVotes + 1,
      },
    });
  } catch (error) {
    console.error('POST /api/plebiscites/[id]/vote error:', error);
    return NextResponse.json({ success: false, error: 'Failed to cast vote' }, { status: 500 });
  }
}

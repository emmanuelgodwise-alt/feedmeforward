import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/polls — Create a poll
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, question, options, isPaid, rewardPerResponse, totalRewardPool, maxResponses, closesAt } = body;

    // Validate
    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json({ success: false, error: 'Video ID is required' }, { status: 400 });
    }
    if (!question || typeof question !== 'string' || question.trim().length < 1) {
      return NextResponse.json({ success: false, error: 'Question is required' }, { status: 400 });
    }
    if (!options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ success: false, error: 'At least 2 options are required' }, { status: 400 });
    }
    if (options.length > 6) {
      return NextResponse.json({ success: false, error: 'Maximum 6 options allowed' }, { status: 400 });
    }

    // Verify video exists and user is creator
    const video = await db.video.findUnique({ where: { id: videoId } });
    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }
    if (video.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the video creator can create polls' }, { status: 403 });
    }

    // Prepare options with IDs and zero vote counts
    const preparedOptions = options.map((opt: { id?: string; text: string }) => ({
      id: opt.id || `opt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: typeof opt.text === 'string' ? opt.text.trim() : String(opt.text),
      voteCount: 0,
    }));

    const poll = await db.poll.create({
      data: {
        videoId,
        question: question.trim(),
        options: JSON.stringify(preparedOptions),
        isPaid: !!isPaid,
        rewardPerResponse: isPaid ? (parseFloat(rewardPerResponse) || 0) : null,
        totalRewardPool: isPaid ? (parseFloat(totalRewardPool) || 0) : null,
        maxResponses: maxResponses ? parseInt(maxResponses, 10) : null,
        responseCount: 0,
        closesAt: closesAt ? new Date(closesAt) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...poll,
        options: preparedOptions,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/polls error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create poll' }, { status: 500 });
  }
}

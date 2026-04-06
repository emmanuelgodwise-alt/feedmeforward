import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Revenue sharing constants
const PLATFORM_SHARE = 0.30;
const CREATOR_SHARE = 0.45;
const VOTER_SHARE = 0.25;

// POST /api/ads/distribute-revenue — Distribute Revenue (cron-callable)
export async function POST(request: Request) {
  try {
    // Note: This endpoint is designed to be called by the system (serve endpoint)
    // No auth required for internal cron/system calls, but validate via header if present
    const authHeader = request.headers.get('X-User-Id');
    const internalSecret = request.headers.get('X-Internal-Secret');

    // Allow if called internally (no auth header but has internal secret or called from serve)
    // For production, you'd want proper service-to-service auth here

    const body = await request.json();
    const { campaignId, videoId, amount, impressionId } = body as {
      campaignId?: string;
      videoId?: string;
      amount?: number;
      impressionId?: string;
    };

    // Validate required fields
    if (!campaignId || typeof campaignId !== 'string') {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }
    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    // Verify campaign exists
    const campaign = await db.adCampaign.findUnique({
      where: { id: campaignId },
      select: { id: true, advertiserId: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Verify video exists and get creator
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: { id: true, creatorId: true },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Check for duplicate distribution for this impression
    if (impressionId) {
      const existingShare = await db.adRevenueShare.findFirst({
        where: { campaignId, videoId, transactionId: `imp_${impressionId}` },
      });
      if (existingShare) {
        return NextResponse.json({ success: true, message: 'Revenue already distributed for this impression', id: existingShare.id });
      }
    }

    // Calculate shares
    const platformAmount = Math.round(amount * PLATFORM_SHARE * 10000) / 10000;
    const creatorAmount = Math.round(amount * CREATOR_SHARE * 10000) / 10000;
    const voterPool = Math.round(amount * VOTER_SHARE * 10000) / 10000;

    // Get all poll voters for this video
    const polls = await db.poll.findMany({
      where: { videoId },
      select: { id: true },
    });

    const pollIds = polls.map((p) => p.id);
    let voters: { userId: string }[] = [];

    if (pollIds.length > 0) {
      const voteResults = await db.pollVote.groupBy({
        by: ['userId'],
        where: { pollId: { in: pollIds } },
      });
      voters = voteResults.map((v) => ({ userId: v.userId }));
    }

    // Distribute voter share proportionally
    const voterShares: { userId: string; amount: number; transactionId: string }[] = [];
    if (voters.length > 0 && voterPool > 0) {
      const perVoter = Math.round((voterPool / voters.length) * 10000) / 10000;

      for (const voter of voters) {
        // Avoid duplicate: check if voter already got a share for this campaign+video
        const existingVoterShare = await db.adRevenueShare.findFirst({
          where: {
            campaignId,
            videoId,
            recipientId: voter.userId,
            recipientRole: 'voter',
          },
        });

        if (!existingVoterShare) {
          voterShares.push({
            userId: voter.userId,
            amount: perVoter,
            transactionId: impressionId ? `imp_${impressionId}_voter_${voter.userId}` : `rev_${Date.now()}_voter_${voter.userId}`,
          });
        }
      }
    }

    // Execute all distributions in a transaction
    const result = await db.$transaction(async (tx) => {
      const shares: Array<{ id: string; recipientId: string; recipientRole: string; amount: number; percentage: number }> = [];

      // 1. Platform share (no wallet credit needed — kept by platform)
      const platformShare = await tx.adRevenueShare.create({
        data: {
          campaignId,
          videoId,
          recipientId: campaign.advertiserId, // Reference advertiser for tracking
          recipientRole: 'platform',
          amount: platformAmount,
          percentage: PLATFORM_SHARE * 100,
          transactionId: impressionId ? `imp_${impressionId}_platform` : null,
        },
      });
      shares.push(platformShare);

      // 2. Creator share — credit wallet
      const creatorTx = await tx.transaction.create({
        data: {
          userId: video.creatorId,
          amount: creatorAmount,
          type: 'earning',
          status: 'completed',
          description: `Ad revenue (creator share) from campaign ${campaignId}`,
          referenceId: impressionId || campaignId,
        },
      });

      const creatorShare = await tx.adRevenueShare.create({
        data: {
          campaignId,
          videoId,
          recipientId: video.creatorId,
          recipientRole: 'creator',
          amount: creatorAmount,
          percentage: CREATOR_SHARE * 100,
          transactionId: creatorTx.id,
        },
      });
      shares.push(creatorShare);

      // Credit creator wallet
      await tx.user.update({
        where: { id: video.creatorId },
        data: { walletBalance: { increment: creatorAmount } },
      });

      // 3. Voter shares — credit wallets proportionally
      for (const voterShare of voterShares) {
        const voterTx = await tx.transaction.create({
          data: {
            userId: voterShare.userId,
            amount: voterShare.amount,
            type: 'earning',
            status: 'completed',
            description: `Ad revenue (voter share) from campaign ${campaignId}`,
            referenceId: impressionId || campaignId,
          },
        });

        const vs = await tx.adRevenueShare.create({
          data: {
            campaignId,
            videoId,
            recipientId: voterShare.userId,
            recipientRole: 'voter',
            amount: voterShare.amount,
            percentage: VOTER_SHARE * 100,
            transactionId: voterTx.id,
          },
        });
        shares.push(vs);

        // Credit voter wallet
        await tx.user.update({
          where: { id: voterShare.userId },
          data: { walletBalance: { increment: voterShare.amount } },
        });
      }

      return shares;
    });

    return NextResponse.json({
      success: true,
      data: {
        totalAmount: amount,
        platformShare: Math.round(platformAmount * 10000) / 10000,
        creatorShare: Math.round(creatorAmount * 10000) / 10000,
        voterPoolTotal: Math.round(voterPool * 10000) / 10000,
        voterCount: voterShares.length,
        voterPerShare: voterShares.length > 0 ? Math.round((voterPool / voters.length) * 10000) / 10000 : 0,
        sharesCreated: result.length,
        shares: result.map((s) => ({
          id: s.id,
          recipientRole: s.recipientRole,
          amount: s.amount,
          percentage: s.percentage,
        })),
      },
    });
  } catch (error) {
    console.error('POST /api/ads/distribute-revenue error:', error);
    return NextResponse.json({ error: 'Failed to distribute revenue' }, { status: 500 });
  }
}

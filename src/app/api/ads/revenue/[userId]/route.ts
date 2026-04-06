import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/ads/revenue/[userId] — Get Ad Revenue for a User
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all revenue shares for this user (both as creator and voter)
    const revenueShares = await db.adRevenueShare.findMany({
      where: { recipientId: userId },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            adType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also get linked transactions
    const transactionIds = revenueShares
      .map((rs) => rs.transactionId)
      .filter((id): id is string => id !== null);

    const transactions = transactionIds.length > 0
      ? await db.transaction.findMany({
          where: { id: { in: transactionIds } },
          select: { id: true, status: true },
        })
      : [];

    const txMap = new Map(transactions.map((tx) => [tx.id, tx.status]));

    // Aggregate totals
    let totalCreatorRevenue = 0;
    let totalVoterRevenue = 0;
    let totalPlatformRevenue = 0;
    let pendingAmount = 0;
    let paidAmount = 0;

    // Group by video for breakdown
    const videoBreakdown = new Map<string, {
      videoId: string;
      creatorRevenue: number;
      voterRevenue: number;
      totalRevenue: number;
      campaignCount: number;
      campaignTitles: string[];
    }>();

    // Group by role
    const roleBreakdown = {
      creator: { count: 0, total: 0 },
      voter: { count: 0, total: 0 },
      platform: { count: 0, total: 0 },
    };

    const enrichedShares = revenueShares.map((rs) => {
      const txStatus = rs.transactionId ? (txMap.get(rs.transactionId) || 'pending') : 'pending';
      const isPaid = txStatus === 'completed';
      const effectiveAmount = isPaid ? rs.amount : 0;

      if (rs.recipientRole === 'creator') {
        totalCreatorRevenue += rs.amount;
        roleBreakdown.creator.count++;
        roleBreakdown.creator.total += rs.amount;
      } else if (rs.recipientRole === 'voter') {
        totalVoterRevenue += rs.amount;
        roleBreakdown.voter.count++;
        roleBreakdown.voter.total += rs.amount;
      } else if (rs.recipientRole === 'platform') {
        totalPlatformRevenue += rs.amount;
        roleBreakdown.platform.count++;
        roleBreakdown.platform.total += rs.amount;
      }

      if (isPaid) {
        paidAmount += rs.amount;
      } else {
        pendingAmount += rs.amount;
      }

      // Video breakdown
      const existing = videoBreakdown.get(rs.videoId) || {
        videoId: rs.videoId,
        creatorRevenue: 0,
        voterRevenue: 0,
        totalRevenue: 0,
        campaignCount: 0,
        campaignTitles: [] as string[],
      };

      if (rs.recipientRole === 'creator') {
        existing.creatorRevenue += rs.amount;
      } else if (rs.recipientRole === 'voter') {
        existing.voterRevenue += rs.amount;
      }
      existing.totalRevenue += rs.amount;
      if (!existing.campaignTitles.includes(rs.campaign.title)) {
        existing.campaignTitles.push(rs.campaign.title);
        existing.campaignCount++;
      }

      videoBreakdown.set(rs.videoId, existing);

      return {
        id: rs.id,
        campaignId: rs.campaignId,
        campaignTitle: rs.campaign.title,
        adType: rs.campaign.adType,
        videoId: rs.videoId,
        recipientRole: rs.recipientRole,
        amount: Math.round(rs.amount * 10000) / 10000, // 4 decimal precision
        percentage: rs.percentage,
        status: txStatus,
        createdAt: rs.createdAt,
      };
    });

    // Get video details for the breakdown
    const videoIds = [...videoBreakdown.keys()];
    const videos = videoIds.length > 0
      ? await db.video.findMany({
          where: { id: { in: videoIds } },
          select: { id: true, title: true, thumbnailUrl: true, viewCount: true },
        })
      : [];

    const videoMap = new Map(videos.map((v) => [v.id, v]));

    const videoBreakdownArray = [...videoBreakdown.values()].map((vb) => {
      const video = videoMap.get(vb.videoId);
      return {
        videoId: vb.videoId,
        videoTitle: video?.title || 'Unknown Video',
        videoThumbnail: video?.thumbnailUrl || null,
        videoViewCount: video?.viewCount || 0,
        creatorRevenue: Math.round(vb.creatorRevenue * 10000) / 10000,
        voterRevenue: Math.round(vb.voterRevenue * 10000) / 10000,
        totalRevenue: Math.round(vb.totalRevenue * 10000) / 10000,
        campaignCount: vb.campaignCount,
        campaignTitles: vb.campaignTitles,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        user: { id: userId, username: user.username },
        totals: {
          totalRevenue: Math.round((totalCreatorRevenue + totalVoterRevenue) * 10000) / 10000,
          creatorRevenue: Math.round(totalCreatorRevenue * 10000) / 10000,
          voterRevenue: Math.round(totalVoterRevenue * 10000) / 10000,
          platformRevenue: Math.round(totalPlatformRevenue * 10000) / 10000,
          paidAmount: Math.round(paidAmount * 10000) / 10000,
          pendingAmount: Math.round(pendingAmount * 10000) / 10000,
        },
        byRole: {
          creator: {
            shares: roleBreakdown.creator.count,
            total: Math.round(roleBreakdown.creator.total * 10000) / 10000,
          },
          voter: {
            shares: roleBreakdown.voter.count,
            total: Math.round(roleBreakdown.voter.total * 10000) / 10000,
          },
          platform: {
            shares: roleBreakdown.platform.count,
            total: Math.round(roleBreakdown.platform.total * 10000) / 10000,
          },
        },
        byVideo: videoBreakdownArray.sort((a, b) => b.totalRevenue - a.totalRevenue),
        shares: enrichedShares,
      },
    });
  } catch (error) {
    console.error('GET /api/ads/revenue/[userId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch ad revenue' }, { status: 500 });
  }
}

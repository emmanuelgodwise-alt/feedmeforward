import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/calls/history — Get user's call history
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));

    // Get conversation IDs the user is a member of
    const memberships = await db.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    const conversationIds = memberships.map((m) => m.conversationId);

    if (conversationIds.length === 0) {
      return NextResponse.json({ voiceCalls: [], videoCalls: [] });
    }

    // Fetch voice calls
    const voiceCalls = await db.voiceCall.findMany({
      where: {
        conversationId: { in: conversationIds },
        status: 'ended',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        caller: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        conversation: {
          include: {
            members: {
              where: { userId: { not: userId } },
              include: {
                user: {
                  select: { id: true, username: true, displayName: true, avatarUrl: true },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    // Fetch video calls
    const videoCalls = await db.videoCall.findMany({
      where: {
        conversationId: { in: conversationIds },
        status: 'ended',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        caller: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        conversation: {
          include: {
            members: {
              where: { userId: { not: userId } },
              include: {
                user: {
                  select: { id: true, username: true, displayName: true, avatarUrl: true },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    return NextResponse.json({
      voiceCalls: voiceCalls.map((c) => ({
        ...c,
        otherUser: c.conversation.members[0]?.user || null,
      })),
      videoCalls: videoCalls.map((c) => ({
        ...c,
        otherUser: c.conversation.members[0]?.user || null,
      })),
    });
  } catch (error) {
    console.error('GET /api/calls/history error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch call history' }, { status: 500 });
  }
}

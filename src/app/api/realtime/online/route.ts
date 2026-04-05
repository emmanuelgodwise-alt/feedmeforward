import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  }

  try {
    // Get user IDs that the current user follows or is followed by
    const follows = await db.follow.findMany({
      where: {
        OR: [
          { followerId: userId },
          { followingId: userId },
        ],
      },
      select: {
        followerId: true,
        followingId: true,
      },
    });

    // Collect unique user IDs (excluding self)
    const userIds = new Set<string>();
    for (const f of follows) {
      if (f.followerId !== userId) userIds.add(f.followerId);
      if (f.followingId !== userId) userIds.add(f.followingId);
    }

    if (userIds.size === 0) {
      return NextResponse.json({ users: [], timestamp: Date.now() });
    }

    // Fetch user profiles for the social graph
    const users = await db.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    // In a production app with WebSocket/Redis, isOnline would come from a
    // presence store. For now, we return the list and let the SSE heartbeat
    // + polling determine liveness on the client side.
    const usersWithPresence = users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      isOnline: false,
      lastSeen: new Date().toISOString(),
    }));

    return NextResponse.json({
      users: usersWithPresence,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[realtime/online] Error fetching online users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch online users' },
      { status: 500 }
    );
  }
}

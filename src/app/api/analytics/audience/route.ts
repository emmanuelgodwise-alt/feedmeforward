import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/analytics/audience — Deep audience demographics analytics
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // ─── Followers demographics ────────────────────────────────
    const followers = await db.user.findMany({
      where: { followers: { some: { followingId: userId } } },
      select: { ageRange: true, gender: true, location: true, language: true, interests: true, memberScore: true, createdAt: true, role: true },
    });

    // ─── Active engagers (people who liked/commented/reacted) ─
    const engagers = await db.user.findMany({
      where: {
        OR: [
          { likes: { some: { video: { creatorId: userId }, createdAt: { gte: periodStart } } } },
          { comments: { some: { video: { creatorId: userId }, createdAt: { gte: periodStart } } } },
          { reactions: { some: { video: { creatorId: userId }, createdAt: { gte: periodStart } } } },
        ],
      },
      select: { ageRange: true, gender: true, location: true, language: true, interests: true, memberScore: true },
    });

    // ─── Voters on polls ───────────────────────────────────────
    const voters = await db.user.findMany({
      where: { pollVotes: { some: { poll: { video: { creatorId: userId } } } } },
      select: { ageRange: true, gender: true, location: true, language: true, interests: true, memberScore: true, isVerified: true },
    });

    // ─── Aggregate functions ───────────────────────────────────
    function aggregateByField(users: Array<Record<string, unknown>>, field: string) {
      const counts: Record<string, number> = {};
      for (const u of users) {
        const val = u[field] as string || 'Unknown';
        counts[val] = (counts[val] || 0) + 1;
      }
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({ value, count }));
    }

    function aggregateInterests(users: Array<{ interests: unknown }>) {
      const counts: Record<string, number> = {};
      for (const u of users) {
        const interests = u.interests;
        if (Array.isArray(interests)) {
          for (const interest of interests) {
            if (typeof interest === 'string') {
              counts[interest] = (counts[interest] || 0) + 1;
            }
          }
        }
      }
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name, count]) => ({ name, count }));
    }

    function scoreDistribution(users: Array<{ memberScore: number | null }>) {
      const ranges = [
        { range: '0-100', min: 0, max: 100 },
        { range: '101-250', min: 101, max: 250 },
        { range: '251-500', min: 251, max: 500 },
        { range: '501-1000', min: 501, max: 1000 },
        { range: '1000+', min: 1001, max: Infinity },
      ];
      return ranges.map((r) => ({
        range: r.range,
        count: users.filter((u) => {
          const score = u.memberScore || 0;
          return score >= r.min && score <= r.max;
        }).length,
      }));
    }

    // ─── Follower growth over time ─────────────────────────────
    const followerGrowth: Array<{ date: string; newFollowers: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const count = await db.follow.count({
        where: { followingId: userId, createdAt: { gte: dayStart, lt: dayEnd } },
      });
      followerGrowth.push({ date: dayStart.toISOString().split('T')[0], newFollowers: count });
    }

    // ─── Online presence / activity patterns ───────────────────
    const activityByDay = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
      // Approximate: count engagements on that day of week
      const dayFollowers = followers.filter((f) => f.createdAt && f.createdAt.getDay() === ((idx + 1) % 7));
      return { day, followers: dayFollowers.length };
    });

    // ─── Verified ratio ────────────────────────────────────────
    const verifiedVoters = voters.filter((v) => v.isVerified).length;
    const verifiedFollowers = followers.filter((f) => 'isVerified' in f && (f as { isVerified: boolean }).isVerified).length;

    return NextResponse.json({
      success: true,
      data: {
        period,
        overview: {
          totalFollowers: followers.length,
          totalEngagers: engagers.length,
          totalVoters: voters.length,
          engagerToFollowerRatio: followers.length > 0
            ? Math.round((engagers.length / followers.length) * 100) / 100
            : 0,
          verifiedVoterRatio: voters.length > 0
            ? Math.round((verifiedVoters / voters.length) * 100)
            : 0,
        },
        followers: {
          byAgeRange: aggregateByField(followers as unknown as Array<Record<string, unknown>>, 'ageRange'),
          byGender: aggregateByField(followers as unknown as Array<Record<string, unknown>>, 'gender'),
          byLocation: aggregateByField(followers as unknown as Array<Record<string, unknown>>, 'location').slice(0, 15),
          byLanguage: aggregateByField(followers as unknown as Array<Record<string, unknown>>, 'language'),
          byScore: scoreDistribution(followers as unknown as Array<{ memberScore: number | null }>),
          topInterests: aggregateInterests(followers as unknown as Array<{ interests: unknown }>),
        },
        engagers: {
          byAgeRange: aggregateByField(engagers as unknown as Array<Record<string, unknown>>, 'ageRange'),
          byGender: aggregateByField(engagers as unknown as Array<Record<string, unknown>>, 'gender'),
          byLocation: aggregateByField(engagers as unknown as Array<Record<string, unknown>>, 'location').slice(0, 10),
          byScore: scoreDistribution(engagers as unknown as Array<{ memberScore: number | null }>),
          topInterests: aggregateInterests(engagers as unknown as Array<{ interests: unknown }>),
        },
        voters: {
          byAgeRange: aggregateByField(voters as unknown as Array<Record<string, unknown>>, 'ageRange'),
          byGender: aggregateByField(voters as unknown as Array<Record<string, unknown>>, 'gender'),
          byLocation: aggregateByField(voters as unknown as Array<Record<string, unknown>>, 'location').slice(0, 10),
          byScore: scoreDistribution(voters as unknown as Array<{ memberScore: number | null }>),
          verifiedCount: verifiedVoters,
          topInterests: aggregateInterests(voters as unknown as Array<{ interests: unknown }>),
        },
        followerGrowth,
        activityByDay,
      },
    });
  } catch (error) {
    console.error('GET /api/analytics/audience error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load audience analytics' }, { status: 500 });
  }
}

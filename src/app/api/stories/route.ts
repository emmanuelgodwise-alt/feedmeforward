import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const VALID_TYPES = ['text', 'image', 'video'];

// POST /api/stories — Create a story
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { type, text, imageUrl, videoUrl } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ success: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    // Validate content
    if (!text && !imageUrl && !videoUrl) {
      return NextResponse.json({ success: false, error: 'At least one of text, imageUrl, or videoUrl is required' }, { status: 400 });
    }

    if (text && text.length > 500) {
      return NextResponse.json({ success: false, error: 'Text must be 500 characters or less' }, { status: 400 });
    }

    // Auto-expire in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = await db.story.create({
      data: {
        creatorId: userId,
        type,
        text: text || null,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        expiresAt,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, story });
  } catch (error) {
    console.error('POST /api/stories error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create story' }, { status: 500 });
  }
}

// GET /api/stories — Get stories from followed users + self
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const now = new Date();

    // Get followed user IDs
    const followingRecords = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = followingRecords.map((f) => f.followingId);
    const creatorIds = [...followingIds, userId];

    // Get non-expired stories grouped by creator
    const stories = await db.story.findMany({
      where: {
        creatorId: { in: creatorIds },
        expiresAt: { gt: now },
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
      orderBy: [
        { creatorId: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Group by creator
    const creatorMap = new Map<string, typeof stories>();
    for (const story of stories) {
      if (!creatorMap.has(story.creatorId)) {
        creatorMap.set(story.creatorId, []);
      }
      creatorMap.get(story.creatorId)!.push(story);
    }

    const storyGroups = [];

    // Self stories first
    if (creatorMap.has(userId)) {
      const selfStories = creatorMap.get(userId)!;
      const storyItems = selfStories.map((s) => {
        const viewers: string[] = JSON.parse(s.viewers);
        const isViewed = viewers.includes(userId);
        return {
          id: s.id,
          type: s.type,
          text: s.text,
          imageUrl: s.imageUrl,
          videoUrl: s.videoUrl,
          viewCount: s.viewCount,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          isViewed,
        };
      });

      storyGroups.push({
        creator: selfStories[0].creator,
        stories: storyItems,
        hasUnviewed: storyItems.some((s) => !s.isViewed),
      });
    }

    // Followed users' stories
    for (const fId of followingIds) {
      if (!creatorMap.has(fId)) continue;
      const userStories = creatorMap.get(fId)!;

      // Mark as viewed for this user
      for (const s of userStories) {
        const viewers: string[] = JSON.parse(s.viewers);
        if (!viewers.includes(userId)) {
          viewers.push(userId);
          await db.story.update({
            where: { id: s.id },
            data: { viewers: JSON.stringify(viewers), viewCount: { increment: 1 } },
          });
        }
      }

      const storyItems = userStories.map((s) => ({
        id: s.id,
        type: s.type,
        text: s.text,
        imageUrl: s.imageUrl,
        videoUrl: s.videoUrl,
        viewCount: s.viewCount,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isViewed: true,
      }));

      storyGroups.push({
        creator: userStories[0].creator,
        stories: storyItems,
        hasUnviewed: false, // just viewed them all
      });
    }

    return NextResponse.json({ storyGroups });
  } catch (error) {
    console.error('GET /api/stories error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stories' }, { status: 500 });
  }
}

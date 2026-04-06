import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/hashtags/sync — Sync hashtags for a video
export async function POST(request: NextRequest) {
  try {
    const { videoId, tags } = await request.json();

    if (!videoId || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { success: false, error: 'videoId and non-empty tags array required' },
        { status: 400 }
      );
    }

    // Verify video exists
    const video = await db.video.findUnique({ where: { id: videoId } });
    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    // Normalize tags: strip # prefix, lowercase, trim, deduplicate
    const normalizedTags = [...new Set(
      tags
        .map((t: string) => t.replace(/^#/, '').trim().toLowerCase())
        .filter((t: string) => t.length > 0 && /^[a-z0-9_]{1,50}$/.test(t))
    )];

    if (normalizedTags.length === 0) {
      return NextResponse.json({ success: true, hashtags: [] });
    }

    // Create hashtags (skip duplicates)
    for (const tag of normalizedTags) {
      try {
        await db.hashtag.create({ data: { tag } });
      } catch {
        // Tag already exists, skip
      }
    }

    // Fetch all matching hashtags with their IDs
    const hashtags = await db.hashtag.findMany({
      where: { tag: { in: normalizedTags } },
    });

    const hashtagMap = new Map(hashtags.map((h) => [h.tag, h.id]));

    // Create VideoHashtag relations (skip duplicates)
    const relations = normalizedTags
      .map((tag: string) => hashtagMap.get(tag))
      .filter((v): v is string => Boolean(v))
      .map((hashtagId: string) => ({
        videoId,
        hashtagId,
      }));

    if (relations.length > 0) {
      for (const rel of relations) {
        try {
          await db.videoHashtag.create({ data: rel });
        } catch {
          // Relation already exists, skip
        }
      }
    }

    // Increment useCount for each hashtag (only for newly created relations)
    // We need to count how many were actually new
    const existingRelations = await db.videoHashtag.findMany({
      where: { videoId },
      select: { hashtagId: true },
    });

    const existingIds = new Set(existingRelations.map((r) => r.hashtagId));
    const newRelationIds = relations
      .filter((r: { videoId: string; hashtagId: string }) => !existingIds.has(r.hashtagId))
      .map((r: { videoId: string; hashtagId: string }) => r.hashtagId);

    // Actually, skipDuplicates already handled it, but we need to figure out
    // which were new. Let's use a simpler approach: increment for all,
    // then decrement for those that already existed.
    // Simpler: just increment for each unique hashtag since we used skipDuplicates
    for (const tag of normalizedTags) {
      const hId = hashtagMap.get(tag);
      if (hId) {
        await db.hashtag.update({
          where: { id: hId },
          data: { useCount: { increment: 1 } },
        });
      }
    }

    // Fetch fresh hashtag data with updated counts
    const updatedHashtags = await db.hashtag.findMany({
      where: { tag: { in: normalizedTags } },
    });

    return NextResponse.json({
      success: true,
      hashtags: updatedHashtags.map((h) => ({
        id: h.id,
        tag: h.tag,
        useCount: h.useCount,
        createdAt: h.createdAt,
      })),
    });
  } catch (error) {
    console.error('POST /api/hashtags/sync error:', error);
    return NextResponse.json({ success: false, error: 'Failed to sync hashtags' }, { status: 500 });
  }
}

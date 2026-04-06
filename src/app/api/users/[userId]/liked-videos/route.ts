import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');

    const likedVideos = await db.like.findMany({
      where: { userId },
      include: {
        video: {
          include: {
            creator: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
            _count: { select: { likes: true, comments: true, polls: true, responses: true } },
            videoHashtags: { include: { hashtag: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const videos = likedVideos.map((l) => ({
      ...l.video,
      tags: l.video.videoHashtags?.map((vh) => vh.hashtag.tag) || [],
      videoHashtags: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: videos,
      pagination: { page, limit, total: likedVideos.length },
    });
  } catch (error) {
    console.error('GET liked videos error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch liked videos' }, { status: 500 });
  }
}

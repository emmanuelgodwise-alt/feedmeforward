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

    const savedVideos = await db.savedVideo.findMany({
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

    const videos = savedVideos.map((s) => ({
      ...s.video,
      tags: s.video.videoHashtags?.map((vh) => vh.hashtag.tag) || [],
      videoHashtags: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: videos,
      pagination: { page, limit, total: savedVideos.length },
    });
  } catch (error) {
    console.error('GET saved videos error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch saved videos' }, { status: 500 });
  }
}

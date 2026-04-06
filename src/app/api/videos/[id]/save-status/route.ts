import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const userId = request.headers.get('X-User-Id');
    if (!userId) return NextResponse.json({ success: true, saved: false });

    const saved = await db.savedVideo.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });

    return NextResponse.json({ success: true, saved: !!saved });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to check save status' }, { status: 500 });
  }
}

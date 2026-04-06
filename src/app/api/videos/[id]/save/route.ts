import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });

    const existing = await db.savedVideo.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });

    if (existing) {
      await db.savedVideo.delete({ where: { id: existing.id } });
      return NextResponse.json({ success: true, saved: false });
    } else {
      await db.savedVideo.create({ data: { userId, videoId } });
      return NextResponse.json({ success: true, saved: true });
    }
  } catch (error) {
    console.error('POST save toggle error:', error);
    return NextResponse.json({ success: false, error: 'Failed to toggle save' }, { status: 500 });
  }
}

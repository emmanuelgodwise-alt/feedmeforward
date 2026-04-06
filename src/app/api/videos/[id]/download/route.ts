import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('X-User-Id');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const video = await db.video.findUnique({
      where: { id },
      select: { id: true, title: true, videoUrl: true, creatorId: true },
    });

    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    // Only allow download of uploaded videos (local files)
    if (!video.videoUrl.startsWith('/uploads/')) {
      return NextResponse.json({
        success: false,
        error: 'This video cannot be downloaded (external URL)'
      }, { status: 400 });
    }

    const filepath = join(process.cwd(), 'public', video.videoUrl);

    if (!existsSync(filepath)) {
      return NextResponse.json({ success: false, error: 'Video file not found' }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(filepath);

    // Determine content type from extension
    const ext = video.videoUrl.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
    };
    const contentType = contentTypes[ext || ''] || 'video/mp4';

    const safeTitle = video.title.replace(/[^a-zA-Z0-9]/g, '_') || 'video';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeTitle}.${ext}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Video download error:', error);
    return NextResponse.json({ success: false, error: 'Download failed' }, { status: 500 });
  }
}

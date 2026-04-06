import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readdir } from 'fs/promises';
import path from 'path';

// GET /api/live/sessions/[id]/stream — Get latest stream data for viewers
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await db.liveSession.findUnique({
      where: { id },
      select: { id: true, status: true, viewerCount: true, title: true, creatorId: true },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    let latestChunkUrl: string | null = null;

    if (session.status === 'live') {
      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'live', id);
        const files = await readdir(uploadDir);
        const webmFiles = files.filter(f => f.endsWith('.webm')).sort();
        if (webmFiles.length > 0) {
          latestChunkUrl = `/uploads/live/${id}/${webmFiles[webmFiles.length - 1]}`;
        }
      } catch {
        // Directory doesn't exist yet — no chunks uploaded
      }
    }

    // Update total view count
    if (session.status === 'live' || session.status === 'ended') {
      // Return poll data too
      const polls = await db.livePoll.findMany({
        where: { sessionId: id, status: 'active' },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        success: true,
        latestChunkUrl,
        viewerCount: session.viewerCount,
        status: session.status,
        activePolls: polls,
      });
    }

    return NextResponse.json({
      success: true,
      latestChunkUrl,
      viewerCount: session.viewerCount,
      status: session.status,
      activePolls: [],
    });
  } catch (error) {
    console.error('Get stream data error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get stream data' }, { status: 500 });
  }
}

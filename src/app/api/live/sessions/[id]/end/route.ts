import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// POST /api/live/sessions/[id]/end — End stream
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const session = await db.liveSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    if (session.creatorId !== userId) {
      return NextResponse.json({ success: false, error: 'Only the creator can end the stream' }, { status: 403 });
    }

    const now = new Date();
    let duration: number | null = null;
    if (session.startedAt) {
      duration = Math.round((now.getTime() - session.startedAt.getTime()) / 1000);
    }

    const updated = await db.liveSession.update({
      where: { id },
      data: {
        status: 'ended',
        endedAt: now,
        duration,
      },
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
      },
    });

    // If isRecorded, create a placeholder Video record
    if (session.isRecorded) {
      try {
        const video = await db.video.create({
          data: {
            creatorId: userId,
            type: 'lead',
            title: session.title,
            description: session.description || null,
            videoUrl: `/uploads/live/${id}/recording.webm`,
            thumbnailUrl: session.thumbnailUrl || null,
            category: session.category || null,
            tags: session.tags || null,
            status: 'active',
            duration: duration || 0,
            isPublic: true,
          },
        });

        await db.liveSession.update({
          where: { id },
          data: { recordedVideoId: video.id },
        });
      } catch {
        // Non-critical: video creation is best-effort
      }
    }

    return NextResponse.json({ success: true, session: updated });
  } catch (error) {
    console.error('End live session error:', error);
    return NextResponse.json({ success: false, error: 'Failed to end session' }, { status: 500 });
  }
}

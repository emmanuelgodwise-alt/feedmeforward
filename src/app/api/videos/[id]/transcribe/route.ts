import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/videos/[id]/transcribe — Transcribe audio from video
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const video = await db.video.findUnique({
      where: { id },
      select: { id: true, title: true, videoUrl: true, isTextOnly: true, type: true },
    });

    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    if (video.isTextOnly) {
      return NextResponse.json({ success: false, error: 'This is a text-only response with no audio to transcribe' }, { status: 400 });
    }

    // For uploaded local videos, read the file and transcribe
    if (video.videoUrl.startsWith('/uploads/')) {
      const filepath = join(process.cwd(), 'public', video.videoUrl);

      if (!existsSync(filepath)) {
        return NextResponse.json({ success: false, error: 'Video file not found on disk' }, { status: 404 });
      }

      const fileBuffer = await fs.readFile(filepath);
      const base64Audio = fileBuffer.toString('base64');

      // Check file size (limit to 100MB for ASR)
      const fileSizeMB = fileBuffer.length / (1024 * 1024);
      if (fileSizeMB > 100) {
        return NextResponse.json(
          { success: false, error: `Video file is too large (${fileSizeMB.toFixed(1)}MB). Maximum supported size is 100MB.` },
          { status: 400 }
        );
      }

      const zai = await ZAI.create();
      const response = await zai.audio.asr.create({
        file_base64: base64Audio,
      });

      const transcription = response.text || '';

      if (!transcription.trim()) {
        return NextResponse.json({
          success: false,
          error: 'No speech could be detected in the video. The audio may be silent, unclear, or in an unsupported language.',
        }, { status: 200 });
      }

      // Clean up the transcription
      const cleaned = transcription
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/(^\w|[.!?]\s+\w)/g, (match) => match.toUpperCase());

      return NextResponse.json({
        success: true,
        data: {
          transcription: cleaned,
          rawTranscription: transcription,
          wordCount: cleaned.split(/\s+/).filter(Boolean).length,
          characterCount: cleaned.length,
          estimatedReadingTime: Math.ceil(cleaned.split(/\s+/).filter(Boolean).length / 200),
        },
      });
    }

    // For external videos (YouTube, Vimeo etc.), inform the user
    return NextResponse.json({
      success: false,
      error: 'Transcription is currently available only for directly uploaded videos. External video links (YouTube, Vimeo) cannot be transcribed at this time.',
    }, { status: 400 });
  } catch (error: unknown) {
    console.error('POST /api/videos/[id]/transcribe error:', error);
    const message = error instanceof Error ? error.message : 'Transcription failed. Please try again.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
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
    const body = await request.json().catch(() => ({}));
    const language = typeof body?.language === 'string' && body.language.length <= 10 ? body.language : undefined;

    if (video.videoUrl.startsWith('/uploads/')) {
      const filepath = join(process.cwd(), 'public', video.videoUrl);

      if (!existsSync(filepath)) {
        return NextResponse.json({ success: false, error: 'Video file not found on disk' }, { status: 404 });
      }

      // Check file size (limit to 500MB)
      const fileBuffer = await fs.readFile(filepath);
      const fileSizeMB = fileBuffer.length / (1024 * 1024);
      if (fileSizeMB > 500) {
        return NextResponse.json(
          { success: false, error: `Video file is too large (${fileSizeMB.toFixed(1)}MB). Maximum supported size is 500MB.` },
          { status: 400 }
        );
      }

      // Extract audio using ffmpeg before sending to ASR
      let base64Audio: string;
      const tempAudioPath = join(process.cwd(), 'public', 'uploads', `temp_audio_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);

      try {
        // Convert to mp3, mono, 16kHz — optimal for ASR
        execSync(
          `ffmpeg -i "${filepath}" -vn -acodec libmp3lame -ab 16k -ac 1 -ar 16000 -y "${tempAudioPath}" 2>/dev/null`,
          { timeout: 60000 } // 60s timeout for extraction
        );

        if (existsSync(tempAudioPath)) {
          const audioBuffer = await fs.readFile(tempAudioPath);
          base64Audio = audioBuffer.toString('base64');
        } else {
          throw new Error('ffmpeg produced no output file');
        }
      } catch (ffmpegError) {
        console.warn('ffmpeg audio extraction failed, falling back to original file:', ffmpegError);
        // Fallback: try sending the original file directly (may work if it's already audio-only)
        base64Audio = fileBuffer.toString('base64');
      } finally {
        // Clean up temp file
        try {
          await fs.unlink(tempAudioPath);
        } catch {
          // Ignore cleanup errors
        }
      }

      // Check extracted audio size (should be much smaller than video)
      const audioSizeMB = Buffer.byteLength(base64Audio, 'base64') / (1024 * 1024);
      if (audioSizeMB > 50) {
        return NextResponse.json(
          { success: false, error: `Extracted audio is too large (${audioSizeMB.toFixed(1)}MB). The video may be very long. Try a shorter clip.` },
          { status: 400 }
        );
      }

      const zai = await ZAI.create();
      const asrParams: Record<string, unknown> = { file_base64: base64Audio };
      if (language) asrParams.language = language;
      const response = await zai.audio.asr.create(asrParams);

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

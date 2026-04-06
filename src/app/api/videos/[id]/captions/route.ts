import { NextRequest, NextResponse } from 'next/server';
import { readFile, existsSync } from 'fs';
import { join } from 'path';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  hi: 'Hindi',
  de: 'German',
  pt: 'Portuguese',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  ar: 'Arabic',
  ru: 'Russian',
  tr: 'Turkish',
  nl: 'Dutch',
};

// GET /api/videos/[id]/captions?targetLanguage=en
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const targetLanguage = searchParams.get('targetLanguage') || 'en';

    // 1. Fetch video from DB
    const video = await db.video.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        videoUrl: true,
        isTextOnly: true,
        type: true,
      },
    });

    if (!video) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    if (video.isTextOnly) {
      return NextResponse.json({
        success: true,
        captions: null,
        message: 'Captions not available for text-only responses',
      });
    }

    let sourceText = '';

    // 2. Determine source text
    if (video.videoUrl.startsWith('/uploads/')) {
      // Local upload — use ASR to transcribe
      const filepath = join(process.cwd(), 'public', video.videoUrl);

      if (!existsSync(filepath)) {
        // Fallback to description
        sourceText = video.description || video.title;
      } else {
        const fileBuffer = await readFile(filepath);
        const base64Audio = fileBuffer.toString('base64');

        // Check file size (limit to 100MB for ASR)
        const fileSizeMB = fileBuffer.length / (1024 * 1024);
        if (fileSizeMB > 100) {
          sourceText = video.description || video.title;
        } else {
          try {
            const zai = await ZAI.create();
            const response = await zai.audio.asr.create({
              file_base64: base64Audio,
            });

            const transcription = response.text || '';
            if (transcription.trim()) {
              sourceText = transcription.trim();
            } else {
              // ASR returned empty — fallback to description
              sourceText = video.description || video.title;
            }
          } catch {
            // ASR failed — fallback to description
            sourceText = video.description || video.title;
          }
        }
      }
    } else {
      // External video (YouTube, Vimeo, etc.) — use description as source
      sourceText = video.description || video.title;
    }

    if (!sourceText.trim()) {
      return NextResponse.json({
        success: true,
        captions: null,
        message: 'Captions not available for this video',
      });
    }

    // 3. Translate if needed
    let finalText = sourceText;

    if (targetLanguage !== 'en') {
      try {
        const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `Translate the following text to ${languageName}. Return ONLY the translated text, preserving paragraph breaks.`,
            },
            {
              role: 'user',
              content: sourceText,
            },
          ],
          temperature: 0.3,
        });

        const translated = completion.choices?.[0]?.message?.content?.trim();
        if (translated) {
          finalText = translated;
        }
      } catch {
        // Translation failed — return source text
        finalText = sourceText;
      }
    }

    // 4. Split into segments
    const segments = finalText
      .split(/(?<=[.!?])\s+|\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return NextResponse.json({
      success: true,
      captions: {
        source: sourceText,
        target: finalText,
        segments,
        language: targetLanguage,
      },
    });
  } catch (error: unknown) {
    console.error('GET /api/videos/[id]/captions error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate captions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

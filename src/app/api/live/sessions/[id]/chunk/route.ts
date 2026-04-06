import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir, readdir } from 'fs/promises';
import path from 'path';

// Track chunk indices per session in memory
const chunkCounters: Record<string, number> = {};

// POST /api/live/sessions/[id]/chunk — Upload stream chunk
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
      return NextResponse.json({ success: false, error: 'Only the creator can upload chunks' }, { status: 403 });
    }

    if (session.status !== 'live') {
      return NextResponse.json({ success: false, error: 'Session is not live' }, { status: 400 });
    }

    const formData = await req.formData();
    const chunk = formData.get('chunk') as Blob | null;
    if (!chunk) {
      return NextResponse.json({ success: false, error: 'No chunk data provided' }, { status: 400 });
    }

    // Initialize counter if needed
    if (!chunkCounters[id]) {
      chunkCounters[id] = 0;
    }
    const chunkIndex = chunkCounters[id]++;

    // Ensure directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'live', id);
    await mkdir(uploadDir, { recursive: true });

    // Write chunk file
    const fileName = `chunk_${chunkIndex.toString().padStart(5, '0')}.webm`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await chunk.arrayBuffer());
    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      chunkIndex,
      url: `/uploads/live/${id}/${fileName}`,
    });
  } catch (error) {
    console.error('Upload chunk error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload chunk' }, { status: 500 });
  }
}

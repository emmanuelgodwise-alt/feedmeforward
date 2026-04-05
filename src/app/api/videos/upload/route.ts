import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('video') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No video file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Accepted: MP4, WebM, MOV, AVI'
      }, { status: 400 });
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File too large. Maximum size: 100MB'
      }, { status: 400 });
    }

    // Create uploads directory
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'videos');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'mp4';
    const filename = `${userId}_${Date.now()}_${uuidv4().slice(0, 8)}.${ext}`;
    const filepath = join(uploadsDir, filename);

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    const videoUrl = `/uploads/videos/${filename}`;

    return NextResponse.json({
      success: true,
      data: {
        videoUrl,
        filename,
        size: file.size,
        type: file.type,
      }
    });
  } catch (error) {
    console.error('Video upload error:', error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}

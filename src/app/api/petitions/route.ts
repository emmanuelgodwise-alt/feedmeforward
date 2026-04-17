import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/petitions — List petitions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creator = searchParams.get('creator');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};

    if (creator) {
      where.creatorId = creator;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    const petitions = await db.petition.findMany({
      where,
      include: {
        creator: {
          select: {
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { currentSignatures: 'desc' },
    });

    return NextResponse.json({ success: true, data: petitions });
  } catch (error) {
    console.error('GET /api/petitions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to list petitions' }, { status: 500 });
  }
}

// POST /api/petitions — Create a petition
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      videoUrl,
      thumbnailUrl,
      targetName,
      targetTitle,
      goalSignatures,
      closesAt,
      targetingCriteria,
      tags,
    } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Description is required' }, { status: 400 });
    }

    const petition = await db.petition.create({
      data: {
        creatorId: userId,
        title: title.trim(),
        description: description.trim(),
        videoUrl: videoUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        targetName: targetName || null,
        targetTitle: targetTitle || null,
        goalSignatures: goalSignatures ? parseInt(String(goalSignatures), 10) : null,
        closesAt: closesAt ? new Date(closesAt) : null,
        targetingCriteria: targetingCriteria ? JSON.stringify(targetingCriteria) : null,
        tags: tags && Array.isArray(tags) ? JSON.stringify(tags) : null,
      },
    });

    return NextResponse.json({ success: true, data: petition }, { status: 201 });
  } catch (error) {
    console.error('POST /api/petitions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create petition' }, { status: 500 });
  }
}

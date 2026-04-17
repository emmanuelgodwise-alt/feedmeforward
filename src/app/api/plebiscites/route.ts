import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/plebiscites — List plebiscites
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creator = searchParams.get('creator');
    const status = searchParams.get('status');

    // Build where clause
    const where: Record<string, unknown> = {};

    if (creator) {
      where.creatorId = creator;
    }

    if (status) {
      if (status === 'all') {
        // No status filter
      } else if (status === 'active' || status === 'closed' || status === 'draft' || status === 'cancelled') {
        where.status = status;
      } else {
        return NextResponse.json({ success: false, error: 'Invalid status filter. Use "active", "closed", "draft", "cancelled", or "all".' }, { status: 400 });
      }
    } else {
      // Default: only active plebiscites
      where.status = 'active';
    }

    const plebiscites = await db.plebiscite.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
      orderBy: { opensAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: plebiscites,
    });
  } catch (error) {
    console.error('GET /api/plebiscites error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch plebiscites' }, { status: 500 });
  }
}

// POST /api/plebiscites — Create a plebiscite
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
      optionALabel,
      optionAVideoUrl,
      optionAThumbnail,
      optionBLabel,
      optionBVideoUrl,
      optionBThumbnail,
      verifiedOnly,
      closesAt,
      targetingCriteria,
    } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (!optionALabel || typeof optionALabel !== 'string' || optionALabel.trim().length < 1) {
      return NextResponse.json({ success: false, error: 'Option A label is required' }, { status: 400 });
    }
    if (!optionBLabel || typeof optionBLabel !== 'string' || optionBLabel.trim().length < 1) {
      return NextResponse.json({ success: false, error: 'Option B label is required' }, { status: 400 });
    }

    // Validate targeting criteria if provided
    let targetingCriteriaStr: string | null = null;
    if (targetingCriteria) {
      try {
        targetingCriteriaStr = JSON.stringify(targetingCriteria);
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid targeting criteria JSON' }, { status: 400 });
      }
    }

    const plebiscite = await db.plebiscite.create({
      data: {
        creatorId: userId,
        title: title.trim(),
        description: description ? description.trim() : null,
        optionALabel: optionALabel.trim(),
        optionAVideoUrl: optionAVideoUrl || null,
        optionAThumbnail: optionAThumbnail || null,
        optionBLabel: optionBLabel.trim(),
        optionBVideoUrl: optionBVideoUrl || null,
        optionBThumbnail: optionBThumbnail || null,
        verifiedOnly: !!verifiedOnly,
        closesAt: closesAt ? new Date(closesAt) : null,
        targetingCriteria: targetingCriteriaStr,
        status: 'active',
      },
    });

    return NextResponse.json({
      success: true,
      data: plebiscite,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/plebiscites error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create plebiscite' }, { status: 500 });
  }
}

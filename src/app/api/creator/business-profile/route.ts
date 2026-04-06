import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/creator/business-profile — get business profile
export async function GET(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        businessName: true,
        businessCategory: true,
        businessEmail: true,
        businessWebsite: true,
        businessBio: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        isVerified: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        businessName: user.businessName,
        businessCategory: user.businessCategory,
        businessEmail: user.businessEmail,
        businessWebsite: user.businessWebsite,
        businessBio: user.businessBio,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('GET /api/creator/business-profile error:', error);
    return NextResponse.json({ error: 'Failed to fetch business profile' }, { status: 500 });
  }
}

// PUT /api/creator/business-profile — update business profile
export async function PUT(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user is a creator
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'creator' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only creators can update business profiles' }, { status: 403 });
    }

    const body = await request.json();
    const {
      businessName,
      businessCategory,
      businessEmail,
      businessWebsite,
      businessBio,
    } = body as {
      businessName?: string;
      businessCategory?: string;
      businessEmail?: string;
      businessWebsite?: string;
      businessBio?: string;
    };

    // Validate email format if provided
    if (businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate website URL if provided
    if (businessWebsite && !/^https?:\/\/.+/.test(businessWebsite)) {
      return NextResponse.json({ error: 'Website must be a valid URL starting with http:// or https://' }, { status: 400 });
    }

    // Validate bio length
    if (businessBio && businessBio.length > 500) {
      return NextResponse.json({ error: 'Bio must be 500 characters or less' }, { status: 400 });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...(businessName !== undefined ? { businessName } : {}),
        ...(businessCategory !== undefined ? { businessCategory } : {}),
        ...(businessEmail !== undefined ? { businessEmail } : {}),
        ...(businessWebsite !== undefined ? { businessWebsite } : {}),
        ...(businessBio !== undefined ? { businessBio } : {}),
      },
      select: {
        businessName: true,
        businessCategory: true,
        businessEmail: true,
        businessWebsite: true,
        businessBio: true,
      },
    });

    return NextResponse.json({
      success: true,
      profile: updatedUser,
    });
  } catch (error) {
    console.error('PUT /api/creator/business-profile error:', error);
    return NextResponse.json({ error: 'Failed to update business profile' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      displayName,
      bio,
      avatarUrl,
      ageRange,
      location,
      gender,
      language,
      interests,
    } = body;

    // Validate interests is an array if provided
    if (interests !== undefined && !Array.isArray(interests)) {
      return NextResponse.json(
        { success: false, error: 'Interests must be an array' },
        { status: 400 }
      );
    }

    const validAgeRanges = ['18-24', '25-34', '35-44', '45-54', '55+'];
    if (ageRange !== undefined && !validAgeRanges.includes(ageRange)) {
      return NextResponse.json(
        { success: false, error: 'Invalid age range. Must be one of: ' + validAgeRanges.join(', ') },
        { status: 400 }
      );
    }

    const validGenders = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
    if (gender !== undefined && !validGenders.includes(gender)) {
      return NextResponse.json(
        { success: false, error: 'Invalid gender. Must be one of: ' + validGenders.join(', ') },
        { status: 400 }
      );
    }

    const user = await db.user.update({
      where: { id: userId },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(ageRange !== undefined && { ageRange }),
        ...(location !== undefined && { location }),
        ...(gender !== undefined && { gender }),
        ...(language !== undefined && { language }),
        ...(interests !== undefined && { interests: JSON.stringify(interests) }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        role: true,
        memberScore: true,
        walletBalance: true,
        isVerified: true,
        ageRange: true,
        location: true,
        gender: true,
        language: true,
        interests: true,
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

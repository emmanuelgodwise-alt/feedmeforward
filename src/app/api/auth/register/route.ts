import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    // Validate required fields
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate username
    if (typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Username must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (username.trim().length > 30) {
      return NextResponse.json(
        { success: false, error: 'Username must be at most 30 characters long' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Validate password
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { success: false, error: 'Password must be at most 128 characters long' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { username: trimmedUsername },
          { email: trimmedEmail },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.username === trimmedUsername) {
        return NextResponse.json(
          { success: false, error: 'Username is already taken' },
          { status: 409 }
        );
      }
      if (existingUser.email === trimmedEmail) {
        return NextResponse.json(
          { success: false, error: 'Email is already registered' },
          { status: 409 }
        );
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await db.user.create({
      data: {
        username: trimmedUsername,
        email: trimmedEmail,
        passwordHash,
      },
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role || 'member',
          memberScore: user.memberScore ?? 0,
          walletBalance: user.walletBalance ?? 0,
          isVerified: user.isVerified ?? false,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred during registration' },
      { status: 500 }
    );
  }
}

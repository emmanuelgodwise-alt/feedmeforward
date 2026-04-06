import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── POST /api/invitations/check-existing ──────────────────────────
// Check which emails are already registered on the platform
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { emails } = body as { emails?: string[] };

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ success: false, error: 'emails array is required' }, { status: 400 });
    }

    if (emails.length > 200) {
      return NextResponse.json({ success: false, error: 'Maximum 200 emails per request' }, { status: 400 });
    }

    // Normalize emails
    const normalizedEmails = [...new Set(
      emails
        .filter((e): e is string => typeof e === 'string')
        .map((e) => e.trim().toLowerCase())
    )];

    // Find users matching these emails
    const existingUsers = await db.user.findMany({
      where: { email: { in: normalizedEmails } },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isVerified: true,
      },
    });

    const onPlatformEmails = new Set(existingUsers.map((u) => u.email));
    const notOnPlatform = normalizedEmails.filter((e) => !onPlatformEmails.has(e));

    return NextResponse.json({
      success: true,
      data: {
        onPlatform: existingUsers.map((u) => ({
          email: u.email,
          userId: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          isVerified: u.isVerified,
        })),
        notOnPlatform,
      },
    });
  } catch (error) {
    console.error('POST /api/invitations/check-existing error:', error);
    return NextResponse.json({ success: false, error: 'Failed to check existing users' }, { status: 500 });
  }
}

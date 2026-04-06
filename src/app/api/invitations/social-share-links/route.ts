import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://feedmeforward.com';

const INVITATION_MESSAGE = 'Join me on FeedMeForward — a video opinion platform where you can earn money by sharing your opinions! 🎥';

// ─── GET /api/invitations/social-share-links ───────────────────────
// Get pre-configured social share URLs for the authenticated user
export async function GET(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Get user's username for referral code
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const referralCode = user.username;
    const referralUrl = `${BASE_URL}/?ref=${encodeURIComponent(referralCode)}`;
    const encodedMessage = encodeURIComponent(INVITATION_MESSAGE);
    const encodedUrl = encodeURIComponent(referralUrl);
    const fullMessage = encodeURIComponent(`${INVITATION_MESSAGE}\n\n${referralUrl}`);

    return NextResponse.json({
      success: true,
      data: {
        referralCode,
        referralUrl,
        invitationMessage: INVITATION_MESSAGE,
        shareLinks: {
          whatsapp: `https://wa.me/?text=${fullMessage}`,
          twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
          telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`,
          email: `mailto:?subject=${encodeURIComponent('Join me on FeedMeForward!')}&body=${fullMessage}`,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/invitations/social-share-links error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate share links' }, { status: 500 });
  }
}

import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Check online presence for given user IDs.
 * Returns a map of userId -> boolean.
 * In a production app, this would check a real-time presence store (Redis, etc.).
 * For now, returns all users as "recently active" to demonstrate the UI.
 */
export async function GET(request: NextRequest) {
  const userIdsParam = request.nextUrl.searchParams.get('userIds');

  if (!userIdsParam) {
    return Response.json({ online: {} });
  }

  const userIds = userIdsParam.split(',').filter(Boolean);
  const online: Record<string, boolean> = {};

  // In production, check actual presence (e.g., Redis key TTL).
  // For demo purposes, mark users as online probabilistically to show the feature.
  for (const id of userIds) {
    // Use a simple hash to deterministically show ~60% of users as online
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (id.charCodeAt(i) + ((hash << 5) - hash)) | 0;
    }
    // Deterministic based on current minute so it doesn't flicker every request
    const minute = Math.floor(Date.now() / 60000);
    online[id] = ((Math.abs(hash) + minute) % 5) < 3;
  }

  return Response.json({ online });
}

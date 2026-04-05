import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SSE endpoint for real-time updates.
 * Maintains a connection and sends keep-alive pings every 15 seconds.
 * In a production app, this would integrate with a pub/sub system (Redis, etc.)
 * to push actual events. For now, it serves as the connection backbone.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return new Response('Missing userId', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: string, data?: string) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${data || ''}\n\n`)
        );
      };

      // Send initial connected event
      sendEvent('connected', JSON.stringify({ userId, timestamp: Date.now() }));

      // Keep-alive ping every 15 seconds
      const pingInterval = setInterval(() => {
        try {
          sendEvent('ping', JSON.stringify({ timestamp: Date.now() }));
        } catch {
          clearInterval(pingInterval);
        }
      }, 15000);

      // Clean up on close (detected via request signal)
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// In-memory store for SSE events (per session)
interface SSEClient {
  userId: string;
  controller: ReadableStreamDefaultController;
}

const sseClients: Record<string, SSEClient[]> = {};

export function addSSEClient(sessionId: string, userId: string, controller: ReadableStreamDefaultController) {
  if (!sseClients[sessionId]) {
    sseClients[sessionId] = [];
  }
  sseClients[sessionId].push({ userId, controller });
}

export function removeSSEClient(sessionId: string, userId: string) {
  if (!sseClients[sessionId]) return;
  sseClients[sessionId] = sseClients[sessionId].filter(c => c.userId !== userId);
  if (sseClients[sessionId].length === 0) {
    delete sseClients[sessionId];
  }
}

export function broadcastToSession(sessionId: string, event: string, data: unknown) {
  if (!sseClients[sessionId]) return;
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients[sessionId]) {
    try {
      client.controller.enqueue(new TextEncoder().encode(message));
    } catch {
      // Client disconnected
    }
  }
}

// Helper to be called from other API routes to broadcast events
export { broadcastToSession };

// GET /api/live/sessions/[id]/sse — SSE endpoint for real-time updates
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response('Missing userId', { status: 400 });
  }

  // Verify session exists and is live
  const session = await db.liveSession.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!session) {
    return new Response('Session not found', { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(id, userId, controller);

      // Send initial connection event
      const connectMsg = `event: connected\ndata: ${JSON.stringify({ sessionId: id, userId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectMsg));

      // Send periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`));
        } catch {
          clearInterval(heartbeat);
          removeSSEClient(id, userId);
        }
      }, 30000);

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        removeSSEClient(id, userId);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

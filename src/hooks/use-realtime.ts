'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useRealtimeStore } from '@/stores/realtime-store';

/**
 * Establishes a Server-Sent Events (SSE) connection for real-time updates.
 * Should be called once at the top of the app component to maintain a global connection.
 */
export function useRealtime() {
  const { currentUser, isAuthenticated } = useAuthStore();
  const { setConnected, addPendingNotification, addPendingMessage, setLastEventAt } =
    useRealtimeStore();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      // Clean up if not authenticated
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnected(false);
      return;
    }

    // Close any existing connection before opening a new one
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/realtime?userId=${encodeURIComponent(currentUser.id)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    // Listen for new notification events
    eventSource.addEventListener('notification', () => {
      addPendingNotification();
    });

    // Listen for new message events
    eventSource.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        // The sender is the other user, so we key by senderId
        const conversationId = data.senderId || data.otherUserId;
        if (conversationId && conversationId !== currentUser.id) {
          addPendingMessage(conversationId);
        }
      } catch {
        // If no data, just increment for the current view
        addPendingMessage('unknown');
      }
    });

    // Listen for generic feed update events
    eventSource.addEventListener('feed_update', () => {
      setLastEventAt(Date.now());
    });

    // Listen for poll vote events
    eventSource.addEventListener('poll_vote', () => {
      setLastEventAt(Date.now());
    });

    // Keep-alive / ping
    eventSource.addEventListener('ping', () => {
      setConnected(true);
    });

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, currentUser, setConnected, addPendingNotification, addPendingMessage, setLastEventAt]);

  // Return nothing; consumers use the store directly
}

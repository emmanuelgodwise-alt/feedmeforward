'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useRealtimeStore } from '@/stores/realtime-store';
import type { PollOption } from '@/types';

export function useLivePoll(pollId: string | null, options: PollOption[] | null) {
  const { currentUser } = useAuthStore();
  const { livePollVotes } = useRealtimeStore();
  const [localOptions, setLocalOptions] = useState<PollOption[] | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Merge live vote updates from SSE with base options.
  // Only use localOptions when they belong to the current pollId.
  const mergedOptions = pollId && livePollVotes[pollId]
    ? (options || []).map((opt) => {
        const liveVote = livePollVotes[pollId].find((v) => v.optionId === opt.id);
        return liveVote
          ? { ...opt, voteCount: liveVote.count }
          : opt;
      })
    : localOptions || options;

  const fetchVotes = useCallback(async () => {
    if (!pollId || !currentUser?.id) return;
    try {
      const res = await fetch(`/api/polls/${encodeURIComponent(pollId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.options) {
          setLocalOptions(data.options);
        }
      }
    } catch {
      // Silently fail — live poll is non-critical
    }
  }, [pollId, currentUser?.id]);

  // Poll every 10 seconds when a poll is active
  useEffect(() => {
    if (!pollId) return;

    // Initial fetch via setTimeout to avoid synchronous setState in effect
    const initialTimer = setTimeout(fetchVotes, 50);
    intervalRef.current = setInterval(fetchVotes, 10000);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pollId, fetchVotes]);

  return { liveOptions: mergedOptions };
}

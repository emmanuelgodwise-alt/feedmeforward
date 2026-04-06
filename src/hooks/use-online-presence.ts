'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

interface OnlineUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
}

export function useOnlinePresence(userIds: string[]) {
  const { currentUser } = useAuthStore();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser?.id || userIds.length === 0) return;

    const checkPresence = async () => {
      try {
        const res = await fetch('/api/realtime/online', {
          headers: { 'X-User-Id': currentUser.id },
        });
        if (res.ok) {
          const data = await res.json();
          const onlineSet = new Set<string>(
            (data.users as OnlineUser[])
              .filter((u) => u.isOnline)
              .map((u) => u.id)
          );
          setOnlineUsers(onlineSet);
        }
      } catch {
        // Silently fail — online status is non-critical
      }
    };

    // Use a short timeout for the initial check to avoid synchronous setState in effect
    const initialTimer = setTimeout(checkPresence, 50);
    const interval = setInterval(checkPresence, 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [currentUser, userIds]);

  return {
    onlineUsers,
    isUserOnline: (id: string) => onlineUsers.has(id),
  };
}

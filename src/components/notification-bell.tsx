'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { useRealtimeStore } from '@/stores/realtime-store';

interface NotificationBellProps {
  onNavigate: (view: string) => void;
}

export function NotificationBell({ onNavigate }: NotificationBellProps) {
  const { currentUser } = useAuthStore();
  const { pendingNotifications, clearPendingNotifications } = useRealtimeStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Polling every 30 seconds (also fires immediately on mount via setTimeout)
  useEffect(() => {
    const poll = async () => {
      if (!currentUser) {
        setUnreadCount(0);
        return;
      }
      try {
        const res = await fetch(
          '/api/notifications?unreadOnly=true&limit=0',
          { headers: { 'X-User-Id': currentUser.id } }
        );
        const data = await res.json();
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      } catch {
        // Silently fail — keep previous count
      }
    };

    // Initial fetch after mount
    const timeoutId = setTimeout(poll, 0);
    intervalRef.current = setInterval(poll, 30000);

    return () => {
      clearTimeout(timeoutId);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentUser]);

  const handleClick = () => {
    clearPendingNotifications();
    onNavigate('notifications');
  };

  const totalCount = unreadCount + pendingNotifications;
  const displayCount = totalCount > 9 ? '9+' : totalCount;

  return (
    <button
      onClick={handleClick}
      className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
      title="Notifications"
    >
      <AnimatePresence>
        {totalCount > 0 && (
          <motion.div
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Bell className="w-[18px] h-[18px] text-orange-500" />
          </motion.div>
        )}
      </AnimatePresence>

      {totalCount === 0 && (
        <Bell className="w-[18px] h-[18px] text-muted-foreground group-hover:text-orange-500" />
      )}

      {/* Pulse ring when unread */}
      {totalCount > 0 && (
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-orange-400"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0, 0.4],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Red badge */}
      <AnimatePresence>
        {totalCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none"
          >
            {displayCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

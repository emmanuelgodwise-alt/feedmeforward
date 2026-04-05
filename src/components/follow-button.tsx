'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface FollowButtonProps {
  targetUserId: string;
  initialFollowing?: boolean;
  variant?: 'default' | 'compact';
  size?: 'sm' | 'default';
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({
  targetUserId,
  initialFollowing = false,
  variant = 'default',
  size = 'default',
  onFollowChange,
}: FollowButtonProps) {
  const { currentUser } = useAuthStore();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const isCompact = variant === 'compact';
  const isSmall = size === 'sm';

  // Don't render if viewing own profile or not authenticated
  if (!currentUser || currentUser.id === targetUserId) {
    return null;
  }

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${targetUserId}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'X-User-Id': currentUser.id },
      });
      const json = await res.json();

      if (json.success) {
        setIsFollowing((prev) => {
          const next = !prev;
          onFollowChange?.(next);
          return next;
        });
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size={isSmall ? 'sm' : 'default'}
      variant={isFollowing ? 'outline' : 'default'}
      onClick={handleToggleFollow}
      disabled={loading}
      className={
        isCompact
          ? `h-7 px-2.5 text-xs gap-1 ${
              isFollowing
                ? 'border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-800/60 dark:text-orange-400 dark:hover:bg-orange-950/30'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
            }`
          : isFollowing
            ? 'border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-800/60 dark:text-orange-400 dark:hover:bg-orange-950/30'
            : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            {!isCompact && <span className="text-xs">{isFollowing ? 'Unfollowing...' : 'Following...'}</span>}
          </motion.span>
        ) : isFollowing ? (
          <motion.span
            key="following"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1"
          >
            <UserCheck className="w-3 h-3" />
            {!isCompact && <span className="text-xs">Following</span>}
          </motion.span>
        ) : (
          <motion.span
            key="follow"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1"
          >
            <UserPlus className="w-3 h-3" />
            {!isCompact && <span className="text-xs">Follow</span>}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}

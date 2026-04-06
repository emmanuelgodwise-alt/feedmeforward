'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, UserCheck, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useFollowStore } from '@/stores/follow-store';

interface FollowButtonProps {
  targetUserId: string;
  targetUsername?: string;
  initialFollowing?: boolean;
  variant?: 'default' | 'compact' | 'full';
  size?: 'sm' | 'default';
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
}

export function FollowButton({
  targetUserId,
  targetUsername,
  initialFollowing,
  variant = 'default',
  size = 'default',
  onFollowChange,
  className,
}: FollowButtonProps) {
  const { currentUser } = useAuthStore();
  const { fetchFollowStatus, toggleFollow, isUserFollowedBy } = useFollowStore();
  const [isFollowing, setIsFollowing] = useState<boolean | undefined>(initialFollowing);
  const [isFollowedBy, setIsFollowedBy] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Auto-fetch follow status if initialFollowing is undefined
  useEffect(() => {
    if (!currentUser || currentUser.id === targetUserId) return;
    if (initialFollowing !== undefined) {
      setIsFollowing(initialFollowing);
    } else {
      fetchFollowStatus(targetUserId).then((status) => {
        if (status) {
          setIsFollowing(status.isFollowing);
          setIsFollowedBy(status.isFollowedBy);
        }
      });
    }
    setMounted(true);
  }, [currentUser, targetUserId, initialFollowing, fetchFollowStatus]);

  // Sync isFollowedBy from the store
  useEffect(() => {
    if (mounted) {
      const storeValue = isUserFollowedBy(targetUserId);
      if (storeValue !== undefined) {
        setIsFollowedBy(storeValue);
      }
    }
  }, [targetUserId, isUserFollowedBy, mounted]);

  const isCompact = variant === 'compact';
  const isFull = variant === 'full';
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
      const result = await toggleFollow(targetUserId, targetUsername);
      if (result !== null) {
        setIsFollowing(result);
        onFollowChange?.(result);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  // Full variant: large button + "Follows you" badge
  if (isFull) {
    return (
      <div className="flex flex-col items-center gap-1.5 w-full">
        <Button
          size="lg"
          variant={isFollowing ? 'outline' : 'default'}
          onClick={handleToggleFollow}
          disabled={loading}
          className={`w-full h-11 text-sm font-semibold gap-2 ${
            isFollowing
              ? 'border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-800/60 dark:text-orange-400 dark:hover:bg-orange-950/30'
              : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20'
          } ${className || ''}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                {isFollowing ? 'Unfollowing...' : 'Following...'}
              </motion.span>
            ) : isFollowing ? (
              <motion.span
                key="following"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Following
              </motion.span>
            ) : (
              <motion.span
                key="follow"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Follow
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
        {isFollowedBy && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Badge
              variant="secondary"
              className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/30"
            >
              Follows you
            </Badge>
          </motion.div>
        )}
      </div>
    );
  }

  // Default and Compact variants
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
            } ${className || ''}`
          : isFollowing
            ? `border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-800/60 dark:text-orange-400 dark:hover:bg-orange-950/30 ${className || ''}`
            : `bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white ${className || ''}`
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

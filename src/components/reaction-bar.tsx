'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/auth-store';

interface ReactionBarProps {
  videoId: string;
  reactionCounts?: Record<string, number>;
  userReactions?: string[];
  onReact?: (type: string) => void;
  compact?: boolean;
}

const EMOJI_CONFIG: Array<{ type: string; emoji: string; label: string }> = [
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'heart', emoji: '❤️', label: 'Heart' },
  { type: 'laugh', emoji: '😂', label: 'Laugh' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'angry', emoji: '😡', label: 'Angry' },
  { type: 'clap', emoji: '👏', label: 'Clap' },
  { type: 'thinking', emoji: '🤔', label: 'Thinking' },
];

// Helper to get top N reaction emojis with counts for summary display
export function getReactionSummary(reactionCounts: Record<string, number>, max: number = 3): string {
  const entries = Object.entries(reactionCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, max);

  return entries
    .map(([type, count]) => {
      const config = EMOJI_CONFIG.find((e) => e.type === type);
      return config ? `${config.emoji} ${count}` : '';
    })
    .filter(Boolean)
    .join('  ');
}

export function ReactionBar({
  videoId,
  reactionCounts: externalCounts,
  userReactions: externalReactions,
  onReact,
  compact = false,
}: ReactionBarProps) {
  const { currentUser } = useAuthStore();
  const [animatingEmoji, setAnimatingEmoji] = useState<string | null>(null);

  // Internal state for self-fetching mode
  const [internalCounts, setInternalCounts] = useState<Record<string, number>>({});
  const [internalReactions, setInternalReactions] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(!!externalCounts);

  // Use external props if provided, otherwise use internal state
  const reactionCounts = externalCounts ?? internalCounts;
  const userReactions = externalReactions ?? internalReactions;

  // Self-fetch if no external props provided
  useEffect(() => {
    if (externalCounts !== undefined || !currentUser || !videoId) return;

    const fetchReactions = async () => {
      try {
        const res = await fetch(`/api/videos/${videoId}/reactions`, {
          headers: { 'X-User-Id': currentUser.id },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.reactions) setInternalCounts(data.reactions);
          if (data.userReactions) setInternalReactions(data.userReactions);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoaded(true);
      }
    };

    fetchReactions();
  }, [videoId, currentUser, externalCounts]);

  const handleReact = useCallback(
    (type: string) => {
      if (!currentUser) return;
      setAnimatingEmoji(type);
      setTimeout(() => setAnimatingEmoji(null), 600);

      if (onReact) {
        onReact(type);
      } else {
        // Self-contained: call API and update internal state
        fetch(`/api/videos/${videoId}/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, type }),
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.success) {
              if (json.reactionCounts) setInternalCounts(json.reactionCounts);
              setInternalReactions((prev) =>
                json.reacted
                  ? prev.includes(type)
                    ? prev.filter((r) => r !== type)
                    : [...prev, type]
                  : prev.filter((r) => r !== type)
              );
            }
          })
          .catch(() => {});
      }
    },
    [currentUser, onReact, videoId]
  );

  if (compact) {
    const activeReactions = EMOJI_CONFIG.filter(
      (e) => (reactionCounts[e.type] || 0) > 0
    );

    if (activeReactions.length === 0) return null;

    return (
      <div className="flex items-center gap-1 flex-wrap">
        {activeReactions.map((e) => {
          const isActive = userReactions.includes(e.type);
          const count = reactionCounts[e.type] || 0;
          return (
            <motion.button
              key={e.type}
              whileTap={{ scale: 1.3 }}
              onClick={() => handleReact(e.type)}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
                isActive
                  ? 'bg-orange-100 dark:bg-orange-900/40 ring-2 ring-orange-400 dark:ring-orange-600'
                  : 'bg-muted/60 hover:bg-muted'
              }`}
              title={e.label}
            >
              <span className="text-sm leading-none">{e.emoji}</span>
              {count > 0 && (
                <span className="text-[10px] font-medium text-muted-foreground">
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  }

  // Expanded mode: full picker with all emojis and tooltips
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 flex-wrap">
        {EMOJI_CONFIG.map((e) => {
          const isActive = userReactions.includes(e.type);
          const count = reactionCounts[e.type] || 0;
          return (
            <Tooltip key={e.type}>
              <TooltipTrigger asChild>
                <motion.button
                  whileTap={{ scale: 1.3 }}
                  whileHover={{ scale: 1.15 }}
                  onClick={() => handleReact(e.type)}
                  className={`relative inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-full text-sm transition-all cursor-pointer ${
                    isActive
                      ? 'bg-orange-100 dark:bg-orange-900/40 ring-2 ring-orange-400 dark:ring-orange-600 shadow-sm scale-105'
                      : 'bg-muted/60 hover:bg-muted'
                  }`}
                >
                  <span className="text-2xl leading-none">{e.emoji}</span>
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white px-1 shadow-sm">
                      {count}
                    </span>
                  )}
                  {/* Animated pop */}
                  <AnimatePresence>
                    {animatingEmoji === e.type && (
                      <motion.span
                        initial={{ scale: 0, y: 0, opacity: 1 }}
                        animate={{ scale: 2.5, y: -30, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl pointer-events-none z-10"
                      >
                        {e.emoji}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>{e.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

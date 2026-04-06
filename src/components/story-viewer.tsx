'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface StoryItem {
  id: string;
  type: string;
  text?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  viewCount: number;
  createdAt: string;
  expiresAt: string;
  isViewed: boolean;
}

interface StoryGroup {
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  stories: StoryItem[];
  hasUnviewed: boolean;
}

interface StoryViewerProps {
  storyGroups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
}

const GRADIENT_BACKGROUNDS = [
  'bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600',
  'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500',
  'bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600',
  'bg-gradient-to-br from-rose-500 via-orange-500 to-amber-600',
  'bg-gradient-to-br from-orange-400 via-red-500 to-rose-600',
  'bg-gradient-to-br from-amber-600 via-orange-500 to-yellow-500',
];

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function StoryViewer({ storyGroups, initialGroupIndex, onClose }: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { currentUser } = useAuthStore();

  const currentGroup = storyGroups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  const totalStories = currentGroup?.stories.length || 0;

  // Prevent body scroll when open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Mark story as viewed
  useEffect(() => {
    if (!currentUser || !currentStory || currentStory.isViewed) return;

    const markViewed = async () => {
      try {
        await fetch(`/api/stories/${currentStory.id}`, {
          headers: { 'X-User-Id': currentUser.id },
        });
      } catch {
        // Silently fail
      }
    };

    markViewed();
  }, [currentUser, currentStory]);

  const advanceStory = useCallback(() => {
    if (storyIndex + 1 < totalStories) {
      setStoryIndex((i) => i + 1);
    } else if (groupIndex + 1 < storyGroups.length) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [storyIndex, totalStories, groupIndex, storyGroups.length, onClose]);

  const goBack = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      setGroupIndex((i) => i - 1);
      const prevGroup = storyGroups[groupIndex - 1];
      setStoryIndex(prevGroup ? prevGroup.stories.length - 1 : 0);
    }
  }, [storyIndex, groupIndex, storyGroups]);

  // Auto-advance timer (5 seconds)
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 0;
        }
        return prev + 2; // 5 seconds = 50 steps at 100ms each
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [storyIndex, groupIndex]);

  // Handle progress reaching 100 — advance to next story
  useEffect(() => {
    if (progress < 100) return;

    const timeout = setTimeout(() => {
      setGroupIndex((prevGroup) => {
        const prevStories = storyGroups[prevGroup]?.stories.length || 0;
        setStoryIndex((prevStory) => {
          if (prevStory + 1 < prevStories) {
            return prevStory + 1;
          } else if (prevGroup + 1 < storyGroups.length) {
            return 0;
          } else {
            onClose();
            return 0;
          }
        });
        return prevGroup;
      });
      setProgress(0);
    }, 0);
    return () => clearTimeout(timeout);
  }, [progress, storyGroups.length, totalStories, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') advanceStory();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goBack();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advanceStory, goBack, onClose]);

  if (!currentGroup || !currentStory) return null;

  const gradientBg = GRADIENT_BACKGROUNDS[
    (currentGroup.creator.username.length + storyIndex) % GRADIENT_BACKGROUNDS.length
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        style={{ overflow: 'hidden' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Story content container */}
        <div className="relative w-full h-full max-w-lg mx-auto">
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-3 pt-4">
            {currentGroup.stories.map((_, i) => (
              <div key={i} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full transition-[width] duration-100 ${
                    i < storyIndex
                      ? 'bg-white'
                      : i === storyIndex
                      ? 'bg-gradient-to-r from-orange-400 to-amber-400'
                      : 'bg-transparent'
                  }`}
                  style={i === storyIndex ? { width: `${progress}%` } : i < storyIndex ? { width: '100%' } : { width: '0%' }}
                />
              </div>
            ))}
          </div>

          {/* Creator info bar */}
          <div className="absolute top-7 left-3 right-3 z-30 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
              {currentGroup.creator.avatarUrl ? (
                <img
                  src={currentGroup.creator.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                currentGroup.creator.username.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-white text-sm font-medium truncate">
                {currentGroup.creator.displayName || currentGroup.creator.username}
              </span>
              {currentGroup.creator.isVerified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-orange-400 fill-orange-400 shrink-0" />
              )}
            </div>
            <span className="text-white/50 text-xs ml-auto shrink-0">{timeAgo(currentStory.createdAt)}</span>
          </div>

          {/* Navigation zones — left 1/3 and right 2/3 */}
          <div className="absolute inset-0 flex z-20">
            <div className="w-1/3 h-full cursor-pointer" onClick={goBack} />
            <div className="w-2/3 h-full cursor-pointer" onClick={advanceStory} />
          </div>

          {/* Arrow buttons (desktop) */}
          {storyIndex > 0 && (
            <button
              onClick={goBack}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/50 transition-colors hidden sm:flex"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {(storyIndex + 1 < totalStories || groupIndex + 1 < storyGroups.length) && (
            <button
              onClick={advanceStory}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/50 transition-colors hidden sm:flex"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Story content area */}
          <div className="w-full h-full flex items-center justify-center">
            {currentStory.type === 'image' && currentStory.imageUrl ? (
              <div className="relative w-full h-full">
                <img
                  src={currentStory.imageUrl}
                  alt="Story"
                  className="w-full h-full object-cover"
                />
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
              </div>
            ) : currentStory.type === 'video' && currentStory.videoUrl ? (
              <video
                src={currentStory.videoUrl}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${gradientBg}`}>
                <div className="p-8 sm:p-12 text-center max-w-sm mx-auto">
                  <p className="text-white text-xl sm:text-2xl font-medium leading-relaxed break-words drop-shadow-lg">
                    {currentStory.text || 'No content'}
                  </p>
                </div>
              </div>
            )}

            {/* View count indicator */}
            <div className="absolute bottom-6 left-4 z-30 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1">
              <Eye className="w-3.5 h-3.5 text-white/70" />
              <span className="text-white/70 text-xs font-medium">{currentStory.viewCount}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';

interface StoryGroup {
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  stories: Array<{
    id: string;
    type: string;
    text?: string | null;
    imageUrl?: string | null;
    videoUrl?: string | null;
    viewCount: number;
    createdAt: string;
    isViewed: boolean;
  }>;
  hasUnviewed: boolean;
}

interface StoriesBarProps {
  onStoryClick: (groupId: number) => void;
  onCreateStory?: () => void;
  onStoriesFetched?: (groups: StoryGroup[]) => void;
}

export function StoriesBar({ onStoryClick, onCreateStory, onStoriesFetched }: StoriesBarProps) {
  const { currentUser } = useAuthStore();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showViewAll, setShowViewAll] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const fetchStories = async () => {
      try {
        const res = await fetch('/api/stories', {
          headers: { 'X-User-Id': currentUser.id },
        });
        if (res.ok) {
          const data = await res.json();
          const groups = data.storyGroups || [];
          setStoryGroups(groups);
          setShowViewAll(groups.length > 8);
          onStoriesFetched?.(groups);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    };

    fetchStories();
    // Refresh every 60 seconds
    const interval = setInterval(fetchStories, 60000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const visibleGroups = showViewAll ? storyGroups.slice(0, 8) : storyGroups;

  const scrollLeft = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  }, []);

  if (!currentUser) return null;

  return (
    <div className="relative">
      {/* Stories scroll */}
      <div
        ref={scrollRef}
        className="flex items-end gap-3 sm:gap-4 overflow-x-auto pb-2 px-1 scroll-smooth"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Your Story */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCreateStory}
          className="shrink-0 flex flex-col items-center gap-1.5 w-[68px] sm:w-[72px] snap-start"
        >
          <div className="relative">
            <div className="w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <div className="w-10 h-10 sm:w-[44px] sm:h-[44px] rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt="You"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : (
                  currentUser.username.charAt(0).toUpperCase()
                )}
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-orange-500 border-2 border-background flex items-center justify-center shadow-sm">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground truncate max-w-full leading-tight">Your Story</span>
        </motion.button>

        {/* Loading skeletons */}
        {isLoading &&
          [...Array(5)].map((_, i) => (
            <div key={i} className="shrink-0 flex flex-col items-center gap-1.5 w-[68px] sm:w-[72px] snap-start">
              <Skeleton className="w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}

        {/* Story groups */}
        {!isLoading &&
          visibleGroups.map((group, index) => (
            <motion.button
              key={group.creator.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onStoryClick(index)}
              className="shrink-0 flex flex-col items-center gap-1.5 w-[68px] sm:w-[72px] snap-start"
            >
              <div className="relative">
                <div
                  className={`rounded-full p-[3px] ${
                    group.hasUnviewed
                      ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 shadow-lg shadow-orange-500/20'
                      : 'bg-muted-foreground/20'
                  }`}
                  style={group.hasUnviewed ? {} : { padding: '1.5px' }}
                >
                  <div className="w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] rounded-full bg-background p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                      {group.creator.avatarUrl ? (
                        <img
                          src={group.creator.avatarUrl}
                          alt={group.creator.username}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-full h-full rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm ${
                          group.creator.avatarUrl ? 'hidden' : ''
                        }`}
                      >
                        {group.creator.username.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  </div>
                  {group.hasUnviewed && (
                    <div className="absolute inset-0 rounded-full animate-pulse bg-gradient-to-br from-amber-400/20 to-orange-500/20 pointer-events-none" />
                  )}
                </div>
                {/* Verified badge */}
                {group.creator.isVerified && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-orange-500 fill-orange-500" />
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground truncate max-w-full leading-tight">
                {group.creator.username}
              </span>
            </motion.button>
          ))}

        {/* View All button */}
        {showViewAll && !isLoading && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              // Scroll to show more or open a view
              if (scrollRef.current) {
                setShowViewAll(false);
              }
            }}
            className="shrink-0 flex flex-col items-center gap-1.5 w-[68px] sm:w-[72px] snap-start"
          >
            <div className="w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full bg-muted/60 border-2 border-muted flex items-center justify-center">
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground truncate max-w-full leading-tight">View All</span>
          </motion.button>
        )}
      </div>

      {/* Left scroll arrow */}
      {storyGroups.length > 0 && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:block">
          <button
            onClick={scrollLeft}
            className="w-7 h-7 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            ‹
          </button>
        </div>
      )}

      {/* Right scroll arrow */}
      {storyGroups.length > 0 && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden sm:block">
          <button
            onClick={scrollRight}
            className="w-7 h-7 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

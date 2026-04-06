'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, ChevronLeft, ChevronRight, Flame, Search } from 'lucide-react';
import { TrendingVideoCard, type TrendingVideoData } from '@/components/trending-video-card';

type Period = '24h' | '7d' | '30d';

interface TrendingVideosProps {
  onVideoClick: (videoId: string) => void;
  onSeeAll?: () => void;
  variant?: 'full' | 'compact';
}

const PERIOD_TABS: { value: Period; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

export function TrendingVideos({ onVideoClick, onSeeAll, variant = 'full' }: TrendingVideosProps) {
  const [period, setPeriod] = useState<Period>('24h');
  const [videos, setVideos] = useState<TrendingVideoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const fetchTrending = useCallback(async (currentPeriod: Period) => {
    setIsLoading(true);
    setError(null);
    try {
      const limit = variant === 'compact' ? 4 : 10;
      const res = await fetch(`/api/videos/trending?period=${currentPeriod}&limit=${limit}`);
      const json = await res.json();
      if (json.success) {
        setVideos(json.data);
      } else {
        setError(json.error || 'Failed to load trending videos');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, [variant]);

  useEffect(() => {
    fetchTrending(period);
  }, [period, fetchTrending]);

  const checkScrollability = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  }, []);

  useEffect(() => {
    checkScrollability();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollability, { passive: true });
      window.addEventListener('resize', checkScrollability);
      return () => {
        el.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [videos, checkScrollability]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
  };

  // Compact variant: show up to 4 cards in a static row
  if (variant === 'compact') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-sm">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold">What&apos;s Trending</h2>
          </div>
          {onSeeAll && (
            <Button
              variant="ghost"
              size="sm"
              className="text-orange-500 hover:text-orange-600 text-xs gap-1"
              onClick={onSeeAll}
            >
              Explore Trending
              <ChevronRight className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-video rounded-xl" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            ))}
          </div>
        ) : error || videos.length === 0 ? (
          <div className="text-center py-6 bg-muted/30 rounded-xl">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No trending videos right now</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {videos.slice(0, 4).map((video, index) => (
              <TrendingVideoCard
                key={video.id}
                video={video}
                onClick={onVideoClick}
                index={index}
                compact
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full variant: horizontal scrollable row
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-md shadow-orange-500/20">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Trending Now
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Flame className="w-5 h-5 text-orange-500" />
              </motion.span>
            </h2>
            <p className="text-xs text-muted-foreground -mt-0.5">Most engaging videos right now</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Tabs */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handlePeriodChange(tab.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === tab.value
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* See All */}
          {onSeeAll && (
            <Button
              variant="ghost"
              size="sm"
              className="text-orange-500 hover:text-orange-600 text-xs gap-1 shrink-0"
              onClick={onSeeAll}
            >
              See All
              <ChevronRight className="w-3 h-3" />
            </Button>
          )}

          {/* Scroll Buttons */}
          {canScrollLeft && (
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 rounded-full shrink-0 shadow-sm"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          {canScrollRight && (
            <Button
              variant="outline"
              size="icon"
              className="w-8 h-8 rounded-full shrink-0 shadow-sm"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Cards */}
      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="min-w-[280px] sm:min-w-[300px] space-y-2.5">
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-3">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8 bg-muted/30 rounded-xl">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-8 bg-muted/30 rounded-xl">
          <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No trending videos in this period</p>
          <p className="text-xs text-muted-foreground mt-1">Check back later for trending content</p>
        </div>
      ) : (
        <div className="relative group">
          {/* Left fade */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          )}
          {/* Right fade */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          )}

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <AnimatePresence mode="popLayout">
              {videos.map((video, index) => (
                <div key={`${video.id}-${period}`} className="snap-start shrink-0">
                  <TrendingVideoCard
                    video={video}
                    onClick={onVideoClick}
                    index={index}
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

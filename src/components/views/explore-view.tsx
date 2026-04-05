'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Video, RefreshCw, Search } from 'lucide-react';
import { useVideoStore } from '@/stores/video-store';
import { useAuthStore } from '@/stores/auth-store';
import { VideoCard } from '@/components/video-card';
import { FilterBar } from '@/components/filter-bar';
import { QuickNav } from '@/components/quick-nav';

interface ExploreViewProps {
  onNavigate: (view: string) => void;
  setVideoId: (id: string) => void;
}

export function ExploreView({ onNavigate, setVideoId }: ExploreViewProps) {
  const { videos, isLoading, filters, setFilters, fetchVideos } = useVideoStore();
  const { currentUser } = useAuthStore();

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Re-fetch when filters change
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchVideos();
    }, 300);
    return () => clearTimeout(debounce);
  }, [filters, fetchVideos]);

  const handleVideoClick = (videoId: string) => {
    setVideoId(videoId);
    onNavigate('video-detail');
  };

  return (
    <div className="min-h-screen px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="shrink-0">
            <span className="text-sm">Back to Dashboard</span>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Video className="w-6 h-6 text-orange-500" />
              <h1 className="text-2xl font-bold">Explore</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Discover and engage with video polls</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchVideos} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {currentUser && (
            <Button
              size="sm"
              className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              onClick={() => onNavigate('create-lead')}
            >
              <Plus className="w-4 h-4" />
              Create Lead Clip
            </Button>
          )}
        </div>
      </motion.div>

      {/* Quick Nav */}
      <QuickNav onNavigate={onNavigate} activeView="explore" />

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6"
      >
        <FilterBar filters={filters} onFilterChange={setFilters} />
      </motion.div>

      {/* Video Grid */}
      {isLoading && videos.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/50 dark:to-amber-950/30 flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No videos found</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            {filters.search || filters.status || filters.category
              ? 'Try adjusting your filters to find more content'
              : 'Be the first to create a Lead Clip and start the conversation!'}
          </p>
          {currentUser && !filters.search && !filters.status && !filters.category && (
            <Button
              className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              onClick={() => onNavigate('create-lead')}
            >
              <Plus className="w-4 h-4" />
              Create the First Lead Clip
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.3 }}
            >
              <VideoCard video={video} onClick={handleVideoClick} />
            </motion.div>
          ))}
        </div>
      )}

      {/* FAB for create lead */}
      {currentUser && (
        <motion.div
          className="fixed bottom-6 right-6 z-50"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button
            size="lg"
            className="w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/30"
            onClick={() => onNavigate('create-lead')}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}

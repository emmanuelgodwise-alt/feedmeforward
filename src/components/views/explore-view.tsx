'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, Video, RefreshCw, Search, Target, Loader2 } from 'lucide-react';
import { useVideoStore } from '@/stores/video-store';
import { useAuthStore } from '@/stores/auth-store';
import { VideoCard } from '@/components/video-card';
import { FilterBar } from '@/components/filter-bar';
import { QuickNav } from '@/components/quick-nav';
import { TrendingHashtags } from '@/components/trending-hashtags';
import { TrendingVideos } from '@/components/trending-videos';
import { getGradient, timeAgo } from '@/components/video-card';

interface ExploreViewProps {
  onNavigate: (view: string) => void;
  setVideoId: (id: string) => void;
}

interface TargetedPoll {
  id: string;
  question: string;
  isPaid: boolean;
  rewardPerResponse: number | null;
  totalRewardPool: number | null;
  responseCount: number;
  maxResponses: number | null;
  closesAt: string | null;
  createdAt: string;
  video: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    creator: { id: string; username: string; isVerified: boolean };
  };
}

export function ExploreView({ onNavigate, setVideoId }: ExploreViewProps) {
  const { videos, isLoading, filters, setFilters, fetchVideos } = useVideoStore();
  const { currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'all' | 'targeted'>('all');
  const [targetedPolls, setTargetedPolls] = useState<TargetedPoll[]>([]);
  const [loadingTargeted, setLoadingTargeted] = useState(false);

  const fetchTargetedPolls = useCallback(() => {
    if (!currentUser) return;
    fetch('/api/polls/targeted', {
      headers: { 'X-User-Id': currentUser.id },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) setTargetedPolls(json.data);
        else setTargetedPolls([]);
      })
      .catch(() => setTargetedPolls([]))
      .finally(() => setLoadingTargeted(false));
  }, [currentUser]);

  const handleTabChange = (tab: 'all' | 'targeted') => {
    setActiveTab(tab);
    if (tab === 'targeted') {
      setLoadingTargeted(true);
      fetchTargetedPolls();
    } else {
      fetchVideos();
    }
  };

  useEffect(() => {
    if (activeTab === 'all') {
      fetchVideos();
    }
  }, [activeTab, fetchVideos]);

  // Re-fetch when filters change (only for 'all' tab)
  useEffect(() => {
    if (activeTab === 'all') {
      const debounce = setTimeout(() => {
        fetchVideos();
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [filters, fetchVideos, activeTab]);

  const handleVideoClick = (videoId: string) => {
    setVideoId(videoId);
    onNavigate('video-detail');
  };

  const handleHashtagClick = (tag: string) => {
    window.dispatchEvent(new CustomEvent('navigate-hashtag', { detail: { tag } }));
  };

  return (
    <div className="min-h-screen px-4 py-6 max-w-6xl mx-auto">
      {/* Header — Video Polls IS the home */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Video Polls</span>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Create, share and respond to video opinion polls — the heartbeat of FeedMeForward</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={activeTab === 'all' ? fetchVideos : () => handleTabChange('targeted')} disabled={activeTab === 'all' ? isLoading : loadingTargeted} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${activeTab === 'all' ? (isLoading ? 'animate-spin' : '') : (loadingTargeted ? 'animate-spin' : '')}`} />
            Refresh
          </Button>
          {currentUser && (
            <Button
              size="sm"
              className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm"
              onClick={() => onNavigate('create-lead')}
            >
              <Plus className="w-4 h-4" />
              Create Lead Clip
            </Button>
          )}
        </div>
      </motion.div>

      {/* Trending Videos Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <TrendingVideos
          onVideoClick={handleVideoClick}
        />
      </motion.div>

      {/* Divider */}
      <div className="border-b mb-6" />

      {/* Quick Nav */}
      <QuickNav onNavigate={onNavigate} activeView="explore" />

      {/* Tabs: All Videos / Targeted Polls */}
      <div className="flex gap-2 mb-4">
        <Badge
          variant={activeTab === 'all' ? 'default' : 'outline'}
          className={`cursor-pointer px-3 py-1 text-sm transition-colors ${
            activeTab === 'all'
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0'
              : 'hover:bg-orange-50 dark:hover:bg-orange-950/30'
          }`}
          onClick={() => handleTabChange('all')}
        >
          All Videos
        </Badge>
        {currentUser && (
          <Badge
            variant={activeTab === 'targeted' ? 'default' : 'outline'}
            className={`cursor-pointer px-3 py-1 text-sm transition-colors gap-1 ${
              activeTab === 'targeted'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0'
                : 'hover:bg-orange-50 dark:hover:bg-orange-950/30'
            }`}
            onClick={() => handleTabChange('targeted')}
          >
            <Target className="w-3 h-3" />
            Targeted Polls
          </Badge>
        )}
      </div>

      {/* Filter Bar (only for all tab) */}
      {activeTab === 'all' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <FilterBar filters={filters} onFilterChange={setFilters} />
        </motion.div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'all' && (
            <>
              {isLoading && videos.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
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
            </>
          )}

          {activeTab === 'targeted' && (
            <>
              {loadingTargeted ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  <span className="ml-2 text-sm text-muted-foreground">Finding targeted polls...</span>
                </div>
              ) : targetedPolls.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/50 dark:to-amber-950/30 flex items-center justify-center mx-auto mb-4">
                    <Target className="w-10 h-10 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No targeted polls for you</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    When creators post paid polls targeting your profile, they&apos;ll appear here.
                  </p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                  {targetedPolls.map((tp, index) => {
                    const gradient = getGradient(tp.video.id);
                    return (
                      <motion.div
                        key={tp.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.3 }}
                        className="cursor-pointer"
                        onClick={() => handleVideoClick(tp.video.id)}
                      >
                        <div className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
                          <div className={`aspect-video bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
                            <Video className="w-10 h-10 text-white/80" />
                            <Badge className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 gap-1">
                              <Target className="w-3 h-3" />
                              Targeted for You
                            </Badge>
                            {tp.rewardPerResponse && tp.rewardPerResponse > 0 && (
                              <Badge className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                ${tp.rewardPerResponse.toFixed(2)}
                              </Badge>
                            )}
                          </div>
                          <div className="p-3 space-y-1.5">
                            <p className="text-sm font-semibold line-clamp-1">{tp.video.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{tp.question}</p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>@{tp.video.creator.username}</span>
                              <span className="flex items-center gap-1">
                                <Video className="w-3 h-3" />
                                {tp.responseCount}{tp.maxResponses ? `/${tp.maxResponses}` : ''}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{timeAgo(tp.createdAt)}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Trending Hashtags Sidebar */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="lg:sticky lg:top-6">
            <TrendingHashtags onHashtagClick={handleHashtagClick} limit={10} />
          </div>
        </div>
      </div>

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

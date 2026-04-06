'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Hash, ArrowLeft, Clock, Flame, Search } from 'lucide-react';
import { VideoCard } from '@/components/video-card';
import { TrendingHashtags } from '@/components/trending-hashtags';
import type { Video } from '@/types';
import type { View } from '@/app/page';

interface HashtagFeedViewProps {
  onNavigate: (view: View) => void;
  hashtag: string;
  setVideoId: (id: string) => void;
  onHashtagClick?: (tag: string) => void;
}

export function HashtagFeedView({ onNavigate, hashtag, setVideoId, onHashtagClick }: HashtagFeedViewProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
  const [hashtagInfo, setHashtagInfo] = useState<{ tag: string; useCount: number } | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        sort,
        page: page.toString(),
        limit: '20',
      });
      const res = await fetch(`/api/hashtags/${encodeURIComponent(hashtag)}?${params}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to load videos');
        return;
      }

      setHashtagInfo(data.hashtag);
      if (page === 1) {
        setVideos(data.videos);
      } else {
        setVideos((prev) => [...prev, ...data.videos]);
      }
      setTotal(data.pagination.total);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [hashtag, sort, page]);

  useEffect(() => {
    setPage(1);
  }, [hashtag, sort]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleVideoClick = (videoId: string) => {
    setVideoId(videoId);
    onNavigate('video-detail');
  };

  const handleHashtagClick = (tag: string) => {
    onHashtagClick?.(tag);
  };

  const displayTag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;

  return (
    <div className="min-h-screen px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <Button variant="ghost" onClick={() => onNavigate('explore')} className="shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Hashtag Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20">
                <Hash className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                    {displayTag}
                  </span>
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {hashtagInfo && (
                    <>
                      <span>{total} {total === 1 ? 'video' : 'videos'}</span>
                      <span>·</span>
                      <span>{hashtagInfo.useCount} {hashtagInfo.useCount === 1 ? 'use' : 'uses'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Sort buttons */}
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant={sort === 'latest' ? 'default' : 'outline'}
                size="sm"
                className={`gap-1.5 text-xs ${
                  sort === 'latest'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                    : ''
                }`}
                onClick={() => setSort('latest')}
              >
                <Clock className="w-3.5 h-3.5" />
                Latest
              </Button>
              <Button
                variant={sort === 'popular' ? 'default' : 'outline'}
                size="sm"
                className={`gap-1.5 text-xs ${
                  sort === 'popular'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                    : ''
                }`}
                onClick={() => setSort('popular')}
              >
                <Flame className="w-3.5 h-3.5" />
                Most Popular
              </Button>
            </div>
          </motion.div>

          {/* Video Grid */}
          {loading && videos.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-video rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{error}</h3>
              <Button variant="outline" onClick={fetchVideos} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-20">
              <Hash className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
              <p className="text-muted-foreground text-sm">
                Be the first to use {displayTag} in a video!
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
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
                </AnimatePresence>
              </div>

              {/* Load More */}
              {videos.length < total && (
                <div className="text-center mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loading}
                    className="gap-2"
                  >
                    {loading ? (
                      <>
                        <Skeleton className="w-4 h-4 rounded-full" />
                        Loading...
                      </>
                    ) : (
                      `Load More (${total - videos.length} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar — Trending Hashtags */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="lg:sticky lg:top-6">
            <TrendingHashtags onHashtagClick={handleHashtagClick} limit={10} />
          </div>
        </div>
      </div>
    </div>
  );
}

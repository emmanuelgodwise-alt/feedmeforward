'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Rss,
  TrendingUp,
  RefreshCw,
  Video,
  Users,
  Search,
  Loader2,
  Sparkles,
  UserPlus,
  UserMinus,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useRealtimeStore } from '@/stores/realtime-store';
import { useToast } from '@/hooks/use-toast';
import { VideoCard } from '@/components/video-card';
import { QuickNav } from '@/components/quick-nav';
import { StoriesBar } from '@/components/stories-bar';
import { StoryViewer } from '@/components/story-viewer';
import { CreateStoryDialog } from '@/components/create-story-dialog';
import type { Video } from '@/types';

interface SocialFeedViewProps {
  onNavigate: (view: string) => void;
  setVideoId: (id: string) => void;
  setProfileUserId: (id: string) => void;
}

// ─── Types ─────────────────────────────────────────────────────────

interface FeedItem {
  id: string;
  type: 'lead' | 'response';
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  category: string | null;
  tags: string[] | null;
  status: 'active' | 'expired' | 'answered';
  duration: number | null;
  viewCount: number;
  createdAt: string;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  poll: unknown | null;
  stats: {
    likeCount: number;
    commentCount: number;
    responseCount: number;
    repostCount?: number;
  };
  reactionCounts?: Record<string, number>;
  userReactions?: string[];
}

interface RepostItem {
  id: string;
  type: 'repost';
  quote: string | null;
  createdAt: string;
  reposter: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  video: {
    id: string;
    title: string;
    description: string | null;
    videoUrl: string;
    thumbnailUrl: string | null;
    category: string | null;
    status: string;
    viewCount: number;
    createdAt: string;
    creator: {
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      isVerified: boolean;
    };
    stats: {
      likes: number;
      comments: number;
      responses: number;
      reposts: number;
    };
  };
}

interface SuggestedUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  isVerified: boolean;
  memberScore: number;
  isFollowing: boolean;
}

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
    expiresAt: string;
    isViewed: boolean;
  }>;
  hasUnviewed: boolean;
}

// ─── Animation Variants ────────────────────────────────────────────

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// ─── Component ─────────────────────────────────────────────────────

export function SocialFeedView({
  onNavigate,
  setVideoId,
  setProfileUserId,
}: SocialFeedViewProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();

  // Feed state
  const [feedItems, setFeedItems] = useState<Video[]>([]);
  const [feedReactionData, setFeedReactionData] = useState<Record<string, { reactionCounts: Record<string, number>; userReactions: string[]; repostCount: number }>>({});
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotalPages, setFeedTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(Date.now());
  const { lastEventAt } = useRealtimeStore();
  const [activeTab, setActiveTab] = useState('following');

  // Reposts
  const [repostItems, setRepostItems] = useState<RepostItem[]>([]);

  // Suggested users state
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Stories state
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);
  const [showCreateStory, setShowCreateStory] = useState(false);

  // ─── Fetch Feed ──────────────────────────────────────────────────

  const fetchFeed = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!currentUser) return;

      if (page === 1 && !append) {
        setIsLoadingFeed(true);
      } else {
        setIsLoadingMore(true);
      }
      setFeedError(null);
      setLastFetchTime(Date.now());

      try {
        const feedType = activeTab === 'discover' ? 'discover' : 'following';
        const res = await fetch(
          `/api/feed?page=${page}&limit=12&type=${feedType}`,
          {
            headers: { 'X-User-Id': currentUser.id },
          }
        );

        if (!res.ok) {
          throw new Error('Failed to fetch feed');
        }

        const json = await res.json();

        // Adapt feed items to Video type for VideoCard compatibility
        const adaptedVideos: Video[] = (json.feed || []).map(
          (item: FeedItem) => ({
            id: item.id,
            creatorId: item.creator.id,
            type: item.type,
            title: item.title,
            description: item.description,
            videoUrl: item.videoUrl,
            thumbnailUrl: item.thumbnailUrl,
            category: item.category,
            tags: item.tags,
            status: item.status,
            duration: item.duration,
            viewCount: item.viewCount,
            isPublic: true,
            createdAt: item.createdAt,
            creator: {
              id: item.creator.id,
              username: item.creator.username,
              isVerified: item.creator.isVerified,
            },
            _count: {
              polls: item.poll ? 1 : 0,
              likes: item.stats?.likeCount || 0,
              comments: item.stats?.commentCount || 0,
              responses: item.stats?.responseCount || 0,
            },
          })
        );

        if (append) {
          setFeedItems((prev) => [...prev, ...adaptedVideos]);
        } else {
          setFeedItems(adaptedVideos);
        }

        // Store reaction data per video
        const reactionDataMap: Record<string, { reactionCounts: Record<string, number>; userReactions: string[]; repostCount: number }> = {};
        (json.feed || []).forEach((item: FeedItem) => {
          if (item.reactionCounts && Object.keys(item.reactionCounts).length > 0) {
            reactionDataMap[item.id] = {
              reactionCounts: item.reactionCounts,
              userReactions: item.userReactions || [],
              repostCount: item.stats?.repostCount || 0,
            };
          } else if (item.stats?.repostCount) {
            reactionDataMap[item.id] = {
              reactionCounts: {},
              userReactions: [],
              repostCount: item.stats.repostCount,
            };
          }
        });
        if (append) {
          setFeedReactionData((prev) => ({ ...prev, ...reactionDataMap }));
        } else {
          setFeedReactionData(reactionDataMap);
        }

        // Process reposts
        const reposts = json.reposts || [];
        setRepostItems(reposts);

        setFeedPage(json.pagination?.page || page);
        setFeedTotalPages(json.pagination?.totalPages || 1);
      } catch (err) {
        setFeedError(
          err instanceof Error ? err.message : 'Failed to load feed'
        );
      } finally {
        setIsLoadingFeed(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [currentUser, activeTab]
  );

  // ─── Fetch Suggested Users ──────────────────────────────────────

  const fetchSuggestedUsers = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingSuggestions(true);

    try {
      const res = await fetch('/api/scores/leaderboard?limit=5');

      if (!res.ok) throw new Error('Failed to fetch suggestions');

      const json = await res.json();
      const leaderboard = json.leaderboard || [];

      const users: SuggestedUser[] = leaderboard
        .filter((entry: { userId: string }) => entry.userId !== currentUser.id)
        .slice(0, 5)
        .map((entry: { userId: string; username: string; avatarUrl: string | null; isVerified: boolean }) => ({
          id: entry.userId,
          username: entry.username,
          avatarUrl: entry.avatarUrl,
          isVerified: entry.isVerified,
          memberScore: 0,
          isFollowing: false,
        }));

      if (users.length > 0) {
        const statusChecks = await Promise.allSettled(
          users.map(async (user) => {
            const statusRes = await fetch(
              `/api/users/${user.id}/follow-status`,
              { headers: { 'X-User-Id': currentUser.id } }
            );
            if (statusRes.ok) {
              const statusJson = await statusRes.json();
              return { userId: user.id, isFollowing: statusJson.isFollowing || false };
            }
            return { userId: user.id, isFollowing: false };
          })
        );

        for (const result of statusChecks) {
          if (result.status === 'fulfilled') {
            const user = users.find((u) => u.id === result.value.userId);
            if (user) {
              user.isFollowing = result.value.isFollowing;
            }
          }
        }
      }

      setSuggestedUsers(users);
    } catch {
      // Silently fail
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [currentUser]);

  // ─── Auto-refresh when realtime event is newer than last fetch ───
  useEffect(() => {
    if (lastEventAt && lastFetchTime && lastEventAt > lastFetchTime) {
      // Don't auto-refresh, just let the banner show
    }
  }, [lastEventAt, lastFetchTime]);

  // ─── Initial Load ───────────────────────────────────────────────

  useEffect(() => {
    if (currentUser) {
      fetchFeed(1);
      fetchSuggestedUsers();
    }
  }, [currentUser, fetchFeed, fetchSuggestedUsers]);

  // ─── Refresh Handler ────────────────────────────────────────────

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setFeedPage(1);
    await fetchFeed(1);
    fetchSuggestedUsers();
  };

  // ─── Load More Handler ──────────────────────────────────────────

  const handleLoadMore = async () => {
    const nextPage = feedPage + 1;
    if (nextPage <= feedTotalPages) {
      await fetchFeed(nextPage, true);
    }
  };

  // ─── Follow / Unfollow Handler ──────────────────────────────────

  const handleFollowToggle = async (
    userId: string,
    currentlyFollowing: boolean
  ) => {
    if (!currentUser) return;

    setSuggestedUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, isFollowing: !currentlyFollowing } : u
      )
    );

    try {
      if (currentlyFollowing) {
        await fetch(`/api/users/${userId}/follow`, {
          method: 'DELETE',
          headers: { 'X-User-Id': currentUser.id },
        });
      } else {
        await fetch(`/api/users/${userId}/follow`, {
          method: 'POST',
          headers: { 'X-User-Id': currentUser.id },
        });
      }
      fetchFeed(1);
    } catch {
      setSuggestedUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isFollowing: currentlyFollowing } : u
        )
      );
    }
  };

  // ─── Video Click Handler ────────────────────────────────────────

  const handleVideoClick = (videoId: string) => {
    setVideoId(videoId);
    onNavigate('video-detail');
  };

  // ─── Creator Click Handler ──────────────────────────────────────

  const handleCreatorClick = (creatorId: string) => {
    setProfileUserId(creatorId);
    onNavigate('profile');
  };

  // ─── Story Handlers ─────────────────────────────────────────────

  const handleStoryClick = (groupIndex: number) => {
    setStoryViewerIndex(groupIndex);
    setShowStoryViewer(true);
  };

  const handleStoriesFetched = useCallback((groups: StoryGroup[]) => {
    setStoryGroups(groups);
  }, []);

  // ─── Not Authenticated Guard ────────────────────────────────────

  if (!currentUser) return null;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => onNavigate('dashboard')}
            className="shrink-0"
          >
            <span className="text-sm">Back to Dashboard</span>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
                <Rss className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold">
                <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                  Your Feed
                </span>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Videos from creators you follow
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </motion.div>

      {/* Quick Nav */}
      <QuickNav onNavigate={onNavigate} activeView="social-feed" />

      {/* New content available banner */}
      {lastEventAt && lastFetchTime && lastEventAt > lastFetchTime && !isLoadingFeed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border border-orange-200 dark:border-orange-800/40"
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">New content available</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 text-xs border-orange-300 hover:bg-orange-100 dark:hover:bg-orange-950/40 text-orange-600 dark:text-orange-400"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </motion.div>
      )}

      {/* Stories Bar */}
      <div className="mb-6">
        <StoriesBar
          onStoryClick={handleStoryClick}
          onCreateStory={() => setShowCreateStory(true)}
        />
      </div>

      {/* Story Viewer */}
      <AnimatePresence>
        {showStoryViewer && storyGroups.length > 0 && (
          <StoryViewer
            storyGroups={storyGroups}
            initialGroupIndex={storyViewerIndex}
            onClose={() => setShowStoryViewer(false)}
          />
        )}
      </AnimatePresence>

      {/* Create Story Dialog */}
      <CreateStoryDialog
        open={showCreateStory}
        onOpenChange={setShowCreateStory}
        onCreated={handleRefresh}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="mb-6 bg-muted/60">
          <TabsTrigger value="following" className="gap-1.5">
            <Rss className="w-3.5 h-3.5" />
            Following Feed
          </TabsTrigger>
          <TabsTrigger value="discover" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Discover
          </TabsTrigger>
        </TabsList>

        {/* ── Following Feed Tab ─────────────────────────────────── */}
        <TabsContent value="following">
          <div className="space-y-8">
            {/* Who to Follow Section */}
            {activeTab === 'following' && (
              <motion.section
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-500" />
                    Who to Follow
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-orange-500 hover:text-orange-600"
                    onClick={() => onNavigate('explore')}
                  >
                    See All
                  </Button>
                </div>

                {isLoadingSuggestions ? (
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="shrink-0 flex flex-col items-center gap-2 w-24">
                        <Skeleton className="w-14 h-14 rounded-full" />
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : suggestedUsers.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                    <AnimatePresence>
                      {suggestedUsers.map((user, index) => (
                        <motion.div
                          key={user.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="shrink-0"
                        >
                          <Card className="w-28 p-3 flex flex-col items-center gap-2 border border-border/50 hover:border-orange-200 dark:hover:border-orange-800/50 transition-colors">
                            <button onClick={() => handleCreatorClick(user.id)} className="relative">
                              {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.username} className="w-12 h-12 rounded-full object-cover ring-2 ring-orange-200 dark:ring-orange-800/50" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                              ) : null}
                              <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm ${user.avatarUrl ? 'hidden' : ''}`}>
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              {user.isVerified && (
                                <CheckCircle2 className="absolute -bottom-0.5 -right-0.5 w-4 h-4 text-orange-500 fill-orange-500 bg-background rounded-full" />
                              )}
                            </button>
                            <button onClick={() => handleCreatorClick(user.id)} className="text-xs font-medium text-center truncate max-w-full hover:text-orange-500 transition-colors">
                              @{user.username}
                            </button>
                            <Button
                              size="sm"
                              variant={user.isFollowing ? 'secondary' : 'default'}
                              className={`h-6 text-[10px] px-2.5 rounded-full gap-0.5 ${user.isFollowing ? 'text-muted-foreground' : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'}`}
                              onClick={() => handleFollowToggle(user.id, user.isFollowing)}
                            >
                              {user.isFollowing ? (<><UserMinus className="w-3 h-3" />Following</>) : (<><UserPlus className="w-3 h-3" />Follow</>)}
                            </Button>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : null}
              </motion.section>
            )}

            {/* Reposts section */}
            {repostItems.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {repostItems.slice(0, 3).map((repost) => (
                  <motion.div
                    key={repost.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card
                      className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm bg-card overflow-hidden"
                      onClick={() => handleVideoClick(repost.video.id)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">🔄</span>
                          <span className="text-xs text-muted-foreground">
                            Reposted by <button onClick={(e) => { e.stopPropagation(); handleCreatorClick(repost.reposter.id); }} className="font-medium text-foreground hover:text-orange-500 transition-colors">@{repost.reposter.username}</button>
                          </span>
                        </div>
                        {repost.quote && (
                          <p className="text-sm text-muted-foreground italic border-l-2 border-orange-300 pl-2">
                            &ldquo;{repost.quote}&rdquo;
                          </p>
                        )}
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-semibold line-clamp-1 flex-1">{repost.video.title}</p>
                          <span className="text-[10px] text-muted-foreground">@{repost.video.creator.username}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.section>
            )}

            {/* Feed Content */}
            {isLoadingFeed ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
            ) : feedError ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
                <p className="text-muted-foreground text-sm mb-6">{feedError}</p>
                <Button variant="outline" className="gap-2" onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
              </motion.div>
            ) : feedItems.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/50 dark:to-amber-950/30 flex items-center justify-center mx-auto mb-4">
                  <Rss className="w-10 h-10 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Your feed is empty</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                  Follow creators to see their videos here. The more creators you follow, the more personalized your feed becomes.
                </p>
                <Button className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white" onClick={() => onNavigate('explore')}>
                  <Sparkles className="w-4 h-4" />
                  Discover Creators
                </Button>
              </motion.div>
            ) : (
              <>
                <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {feedItems.map((video, index) => (
                    <motion.div key={video.id} variants={staggerItem} transition={{ delay: index * 0.04, duration: 0.3 }}>
                      <VideoCard
                        video={video}
                        onClick={handleVideoClick}
                        onCreatorClick={handleCreatorClick}
                        reactionCounts={feedReactionData[video.id]?.reactionCounts}
                        userReactions={feedReactionData[video.id]?.userReactions}
                        repostCount={feedReactionData[video.id]?.repostCount}
                      />
                    </motion.div>
                  ))}
                </motion.div>

                {feedPage < feedTotalPages && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center mt-8">
                    <Button variant="outline" size="lg" onClick={handleLoadMore} disabled={isLoadingMore} className="gap-2 min-w-[160px]">
                      {isLoadingMore ? (<><Loader2 className="w-4 h-4 animate-spin" />Loading...</>) : (<><Video className="w-4 h-4" />Load More Videos</>)}
                    </Button>
                  </motion.div>
                )}

                {feedPage >= feedTotalPages && feedItems.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-8 mb-4">
                    <Badge variant="secondary" className="text-xs text-muted-foreground">You&apos;re all caught up!</Badge>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* ── Discover Tab ───────────────────────────────────────── */}
        <TabsContent value="discover">
          {isLoadingFeed ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-video rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : feedItems.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
              <motion.div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6" whileHover={{ scale: 1.05, rotate: 3 }} whileTap={{ scale: 0.95 }}>
                <TrendingUp className="w-12 h-12 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">Discover New Content</h2>
              <p className="text-muted-foreground text-sm max-w-md mb-8">Explore trending videos, top creators, and fresh content from the community.</p>
              <Button size="lg" className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 h-12 px-8" onClick={() => onNavigate('explore')}>
                <Sparkles className="w-5 h-5" />
                Go to Explore
              </Button>
            </motion.div>
          ) : (
            <>
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {feedItems.map((video, index) => (
                  <motion.div key={video.id} variants={staggerItem} transition={{ delay: index * 0.04, duration: 0.3 }}>
                    <VideoCard
                      video={video}
                      onClick={handleVideoClick}
                      onCreatorClick={handleCreatorClick}
                      reactionCounts={feedReactionData[video.id]?.reactionCounts}
                      userReactions={feedReactionData[video.id]?.userReactions}
                      repostCount={feedReactionData[video.id]?.repostCount}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {feedPage < feedTotalPages && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center mt-8">
                  <Button variant="outline" size="lg" onClick={handleLoadMore} disabled={isLoadingMore} className="gap-2 min-w-[160px]">
                    {isLoadingMore ? (<><Loader2 className="w-4 h-4 animate-spin" />Loading...</>) : (<><Video className="w-4 h-4" />Load More Videos</>)}
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Story FAB */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowCreateStory(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30 flex items-center justify-center text-white hover:shadow-xl transition-shadow"
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, UserPlus, Loader2, UserCheck, MapPin, UserRoundPlus } from 'lucide-react';
import { FollowButton } from '@/components/follow-button';
import { useAuthStore } from '@/stores/auth-store';
import { useFollowStore } from '@/stores/follow-store';
import { getScoreLevelBadge } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────

interface UsersListViewProps {
  onNavigate: (view: string) => void;
  setProfileUserId: (id: string) => void;
  targetUserId: string;
  targetUsername?: string;
  initialTab?: 'followers' | 'following';
}

interface UserItem {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  memberScore: number;
  isVerified: boolean;
  followedByYou: boolean;
  followedAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Avatar with Gradient Fallback ───────────────────────────────────

const AVATAR_GRADIENTS = [
  'from-orange-400 to-amber-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-orange-500 to-yellow-500',
  'from-amber-500 to-red-400',
  'from-red-400 to-orange-600',
  'from-yellow-400 to-amber-600',
  'from-pink-400 to-rose-500',
];

function getAvatarGradient(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function UserAvatar({ user, size = 40 }: { user: UserItem; size?: number }) {
  const gradient = getAvatarGradient(user.id);
  const initials = (user.displayName || user.username)
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.username}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div
          className={`w-full h-full rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold`}
          style={{ fontSize: size * 0.35 }}
        >
          {initials}
        </div>
      )}
      {user.isVerified && (
        <div
          className="absolute -bottom-0.5 -right-0.5 rounded-full bg-amber-500 flex items-center justify-center border-2 border-background"
          style={{ width: size * 0.28, height: size * 0.28 }}
        >
          <UserCheck className="text-white" style={{ width: size * 0.18, height: size * 0.18 }} />
        </div>
      )}
    </div>
  );
}

// ─── Animation Variants ─────────────────────────────────────────────

const listContainer = {
  animate: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const listItem = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.97 },
};

// ─── Loading Skeleton ───────────────────────────────────────────────

function UserSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-7 w-16 rounded-md" />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function UsersListView({
  onNavigate,
  setProfileUserId,
  targetUserId,
  targetUsername,
  initialTab = 'followers',
}: UsersListViewProps) {
  const { currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.id === targetUserId;

  // Fetch users
  const fetchUsers = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const endpoint =
          activeTab === 'followers'
            ? `/api/users/${targetUserId}/followers`
            : `/api/users/${targetUserId}/following`;

        const res = await fetch(`${endpoint}?page=${page}&limit=20`, {
          headers: { 'X-User-Id': currentUser?.id || '' },
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Failed to load users');
        }

        const json = await res.json();
        const list: UserItem[] = activeTab === 'followers' ? json.followers : json.following;
        const pag: PaginationData = json.pagination;

        if (append) {
          setUsers((prev) => [...prev, ...list]);
        } else {
          setUsers(list);
        }
        setPagination(pag);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTab, targetUserId, currentUser?.id]
  );

  // Load data when tab changes
  useEffect(() => {
    setUsers([]);
    setPagination(null);
    setSearchQuery('');
    fetchUsers(1);
  }, [activeTab, fetchUsers]);

  // Handle load more
  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.totalPages) {
      fetchUsers(pagination.page + 1, true);
    }
  };

  // Handle user row click
  const handleUserClick = (userId: string) => {
    setProfileUserId(userId);
    onNavigate('profile');
  };

  // Handle follow change — update local state and follow store
  const handleFollowChange = useCallback((userId: string, isNowFollowing: boolean) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, followedByYou: isNowFollowing } : u))
    );
    // Update follow store cache
    useFollowStore.getState().setFollowStatus(userId, {
      isFollowing: isNowFollowing,
      isFollowedBy: useFollowStore.getState().isUserFollowedBy(userId) ?? false,
    });
  }, []);

  // Client-side search filter
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.displayName && u.displayName.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  // Reset search when typing (to show all results)
  const hasMore = pagination ? pagination.page < pagination.totalPages : false;

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="shrink-0">
          <span className="text-sm">Back to Dashboard</span>
        </Button>
      </motion.div>


      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-4"
      >
        <h1 className="text-2xl font-bold flex items-center gap-3">
          {targetUsername ? (
            <>
              <span className="text-muted-foreground font-normal text-lg">
                @{targetUsername}
              </span>
              <span className="text-muted-foreground">—</span>
            </>
          ) : null}
          <span>
            {activeTab === 'followers' ? 'Followers' : 'Following'}
          </span>
          {pagination && !loading && (
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 text-sm font-medium"
            >
              {pagination.total}
            </Badge>
          )}
        </h1>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-4"
      >
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'followers' | 'following')}
        >
          <TabsList className="w-full">
            <TabsTrigger value="followers" className="flex-1 gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Followers
            </TabsTrigger>
            <TabsTrigger value="following" className="flex-1 gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              Following
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-4"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by username or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card>
              <CardContent className="p-2">
                {[...Array(8)].map((_, i) => (
                  <UserSkeleton key={i} />
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium mb-1">Failed to load</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button
                  variant="outline"
                  onClick={() => fetchUsers(1)}
                  className="gap-2"
                >
                  <Loader2 className="w-3.5 h-3.5" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : filteredUsers.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                {searchQuery ? (
                  <>
                    <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium mb-1">No results found</p>
                    <p className="text-sm text-muted-foreground">
                      No users matching &quot;{searchQuery}&quot;
                    </p>
                  </>
                ) : (
                  <>
                    {activeTab === 'followers' ? (
                      <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    ) : (
                      <UserPlus className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    )}
                    <p className="font-medium mb-1">
                      {activeTab === 'followers'
                        ? 'No followers yet'
                        : 'Not following anyone yet'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activeTab === 'followers'
                        ? 'When people follow this profile, they\'ll show up here.'
                        : 'Start following people to build your community.'}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key={`list-${activeTab}`}
            variants={listContainer}
            initial="initial"
            animate="animate"
          >
            <Card>
              <CardContent className="p-2">
                <AnimatePresence>
                  {filteredUsers.map((user) => {
                    const levelBadge = getScoreLevelBadge(
                      getScoreLevelSafe(user.memberScore)
                    );

                    return (
                      <motion.div
                        key={user.id}
                        variants={listItem}
                        layout
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50/80 dark:hover:bg-orange-950/20 cursor-pointer transition-colors group"
                        onClick={() => handleUserClick(user.id)}
                      >
                        {/* Avatar */}
                        <UserAvatar user={user} size={40} />

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                              {user.displayName || user.username}
                            </span>
                            {user.isVerified && (
                              <UserCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                            {/* Member Score Badge */}
                            {user.memberScore > 0 && (
                              <Badge
                                className={`text-[9px] px-1.5 py-0 h-4 leading-none shrink-0 ${levelBadge.className}`}
                              >
                                {levelBadge.label}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            @{user.username}
                          </p>
                          {/* Bio (truncated) */}
                          {user.bio && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5 truncate max-w-xs">
                              {user.bio}
                            </p>
                          )}
                          {/* Follows You badge (for followers tab on other profiles) */}
                          {!isOwnProfile && activeTab === 'followers' && user.followedByYou && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4 mt-1 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/30"
                            >
                              Follows you
                            </Badge>
                          )}
                        </div>

                        {/* Follow Button */}
                        {!isOwnProfile && currentUser && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <FollowButton
                              targetUserId={user.id}
                              initialFollowing={user.followedByYou}
                              variant="compact"
                              size="sm"
                              onFollowChange={(isNowFollowing) =>
                                handleFollowChange(user.id, isNowFollowing)
                              }
                            />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Load More */}
                {hasMore && !loadingMore && (
                  <div className="flex justify-center pt-2 pb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadMore}
                      className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 gap-1.5"
                    >
                      Load More
                      <span className="text-xs text-muted-foreground">
                        ({pagination ? pagination.total - users.length : 0} remaining)
                      </span>
                    </Button>
                  </div>
                )}

                {/* Loading More Indicator */}
                {loadingMore && (
                  <div className="flex justify-center py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results count with search */}
            {searchQuery && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                Showing {filteredUsers.length} of {users.length} users
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getScoreLevelSafe(score: number) {
  if (score >= 750) return 'diamond' as const;
  if (score >= 500) return 'gold' as const;
  if (score >= 200) return 'silver' as const;
  return 'bronze' as const;
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  Check,
  CheckCheck,
  Heart,
  MessageCircle,
  UserPlus,
  DollarSign,
  Video,
  Award,
  Loader2,
  Star,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { QuickNav } from '@/components/quick-nav';
import type { View } from '@/app/page';

// ─── Types ─────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
  fromUser?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  } | null;
  video?: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
  } | null;
}

interface NotificationsViewProps {
  onNavigate: (view: string) => void;
  setProfileUserId: (id: string) => void;
  setVideoId: (id: string) => void;
}

// ─── Type Config ───────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  {
    icon: typeof Bell;
    color: string;
    bgColor: string;
    ringColor: string;
    action: 'profile' | 'video';
  }
> = {
  follow: {
    icon: UserPlus,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/40',
    ringColor: 'ring-orange-200 dark:ring-orange-800/50',
    action: 'profile',
  },
  like: {
    icon: Heart,
    color: 'text-rose-500',
    bgColor: 'bg-rose-50 dark:bg-rose-950/40',
    ringColor: 'ring-rose-200 dark:ring-rose-800/50',
    action: 'video',
  },
  comment: {
    icon: MessageCircle,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    ringColor: 'ring-blue-200 dark:ring-blue-800/50',
    action: 'video',
  },
  response: {
    icon: Video,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    ringColor: 'ring-purple-200 dark:ring-purple-800/50',
    action: 'video',
  },
  poll_vote: {
    icon: Star,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    ringColor: 'ring-amber-200 dark:ring-amber-800/50',
    action: 'video',
  },
  mention: {
    icon: Bell,
    color: 'text-sky-500',
    bgColor: 'bg-sky-50 dark:bg-sky-950/40',
    ringColor: 'ring-sky-200 dark:ring-sky-800/50',
    action: 'video',
  },
  invitation_accepted: {
    icon: Award,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    ringColor: 'ring-emerald-200 dark:ring-emerald-800/50',
    action: 'profile',
  },
  tip: {
    icon: DollarSign,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    ringColor: 'ring-emerald-200 dark:ring-emerald-800/50',
    action: 'video',
  },
};

// ─── Helpers ───────────────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  // Full date for older notifications
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

const AVATAR_GRADIENTS = [
  'from-orange-400 to-amber-500',
  'from-rose-400 to-pink-500',
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-purple-500',
  'from-sky-400 to-blue-500',
  'from-amber-400 to-orange-500',
];

function getAvatarGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

// ─── Animation Variants ────────────────────────────────────────────

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
};

const headerVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Component ─────────────────────────────────────────────────────

export function NotificationsView({
  onNavigate,
  setProfileUserId,
  setVideoId,
}: NotificationsViewProps) {
  const { currentUser } = useAuthStore();

  // State
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadPage, setUnreadPage] = useState(1);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [unreadTotalPages, setUnreadTotalPages] = useState(1);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());

  // ─── Fetch notifications ─────────────────────────────────────────
  const fetchNotifications = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (!currentUser) return;
      try {
        const res = await fetch(
          `/api/notifications?page=${pageNum}&limit=20`,
          {
            headers: { 'X-User-Id': currentUser.id },
          }
        );
        const data = await res.json();

        if (res.ok) {
          setNotifications((prev) =>
            append ? [...prev, ...data.notifications] : data.notifications
          );
          setUnreadCount(data.unreadCount || 0);
          setTotal(data.pagination?.total || 0);
          setTotalPages(data.pagination?.totalPages || 1);
        }
      } catch {
        // Silently fail
      }
    },
    [currentUser]
  );

  const fetchUnreadNotifications = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (!currentUser) return;
      try {
        const res = await fetch(
          `/api/notifications?unreadOnly=true&page=${pageNum}&limit=20`,
          {
            headers: { 'X-User-Id': currentUser.id },
          }
        );
        const data = await res.json();

        if (res.ok) {
          setUnreadNotifications((prev) =>
            append ? [...prev, ...data.notifications] : data.notifications
          );
          setUnreadCount(data.unreadCount || 0);
          setUnreadTotal(data.pagination?.total || 0);
          setUnreadTotalPages(data.pagination?.totalPages || 1);
        }
      } catch {
        // Silently fail
      }
    },
    [currentUser]
  );

  // Initial fetch
  useEffect(() => {
    if (!currentUser) return;

    const loadInitial = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchNotifications(1),
        fetchUnreadNotifications(1),
      ]);
      setIsLoading(false);
    };

    loadInitial();
  }, [currentUser, fetchNotifications, fetchUnreadNotifications]);

  // ─── Mark as read ────────────────────────────────────────────────
  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      if (!currentUser || markingIds.has(notificationId)) return;

      setMarkingIds((prev) => new Set(prev).add(notificationId));

      try {
        const res = await fetch(`/api/notifications/${notificationId}`, {
          method: 'PATCH',
          headers: { 'X-User-Id': currentUser.id },
        });
        if (res.ok) {
          // Optimistically update local state
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notificationId ? { ...n, isRead: true } : n
            )
          );
          setUnreadNotifications((prev) =>
            prev.filter((n) => n.id !== notificationId)
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch {
        // Silently fail
      } finally {
        setMarkingIds((prev) => {
          const next = new Set(prev);
          next.delete(notificationId);
          return next;
        });
      }
    },
    [currentUser, markingIds]
  );

  // ─── Mark all as read ────────────────────────────────────────────
  const handleMarkAllRead = useCallback(async () => {
    if (!currentUser || unreadCount === 0) return;
    setIsMarkingAll(true);

    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'X-User-Id': currentUser.id },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setUnreadNotifications([]);
        setUnreadCount(0);
      }
    } catch {
      // Silently fail
    } finally {
      setIsMarkingAll(false);
    }
  }, [currentUser, unreadCount]);

  // ─── Handle notification click ───────────────────────────────────
  const handleNotificationClick = useCallback(
    (notification: NotificationItem) => {
      // Mark as read
      if (!notification.isRead) {
        handleMarkAsRead(notification.id);
      }

      // Navigate based on type
      const config = TYPE_CONFIG[notification.type];
      if (!config) return;

      if (config.action === 'profile' && notification.fromUser) {
        setProfileUserId(notification.fromUser.id);
        onNavigate('profile');
      } else if (config.action === 'video' && notification.video) {
        setVideoId(notification.video.id);
        onNavigate('video-detail');
      }
    },
    [handleMarkAsRead, onNavigate, setProfileUserId, setVideoId]
  );

  // ─── Handle avatar click ─────────────────────────────────────────
  const handleAvatarClick = useCallback(
    (e: React.MouseEvent, userId: string) => {
      e.stopPropagation();
      setProfileUserId(userId);
      onNavigate('profile');
    },
    [setProfileUserId, onNavigate]
  );

  // ─── Handle video thumbnail click ────────────────────────────────
  const handleVideoClick = useCallback(
    (e: React.MouseEvent, videoId: string) => {
      e.stopPropagation();
      setVideoId(videoId);
      onNavigate('video-detail');
    },
    [setVideoId, onNavigate]
  );

  // ─── Load more ───────────────────────────────────────────────────
  const handleLoadMoreAll = useCallback(async () => {
    const nextPage = page + 1;
    setIsLoadingMore(true);
    setPage(nextPage);
    await fetchNotifications(nextPage, true);
    setIsLoadingMore(false);
  }, [page, fetchNotifications]);

  const handleLoadMoreUnread = useCallback(async () => {
    const nextPage = unreadPage + 1;
    setIsLoadingMore(true);
    setUnreadPage(nextPage);
    await fetchUnreadNotifications(nextPage, true);
    setIsLoadingMore(false);
  }, [unreadPage, fetchUnreadNotifications]);

  if (!currentUser) return null;

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        variants={headerVariants}
        initial="initial"
        animate="animate"
        className="flex items-center justify-between mb-6"
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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-orange-500" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 text-xs px-2 py-0.5">
                  {unreadCount}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              Stay up to date with your activity
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            className="gap-1.5 shrink-0"
          >
            {isMarkingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Marking...</span>
              </>
            ) : (
              <>
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark All Read</span>
              </>
            )}
          </Button>
        )}
      </motion.div>

      <QuickNav onNavigate={(v) => onNavigate(v as View)} activeView="notifications" />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-4 w-full sm:w-auto">
          <TabsTrigger value="all" className="gap-1.5">
            All
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
              >
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-1.5">
            Unread
          </TabsTrigger>
        </TabsList>

        {/* All Tab */}
        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              <NotificationList
                notifications={notifications}
                isLoading={isLoading}
                isLoadingMore={isLoadingMore}
                total={total}
                currentPage={page}
                totalPages={totalPages}
                onLoadMore={handleLoadMoreAll}
                onNotificationClick={handleNotificationClick}
                onAvatarClick={handleAvatarClick}
                onVideoClick={handleVideoClick}
                markingIds={markingIds}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unread Tab */}
        <TabsContent value="unread">
          <Card>
            <CardContent className="p-0">
              <NotificationList
                notifications={unreadNotifications}
                isLoading={isLoading}
                isLoadingMore={isLoadingMore}
                total={unreadTotal}
                currentPage={unreadPage}
                totalPages={unreadTotalPages}
                onLoadMore={handleLoadMoreUnread}
                onNotificationClick={handleNotificationClick}
                onAvatarClick={handleAvatarClick}
                onVideoClick={handleVideoClick}
                markingIds={markingIds}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Notification List ─────────────────────────────────────────────

interface NotificationListProps {
  notifications: NotificationItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  total: number;
  currentPage: number;
  totalPages: number;
  onLoadMore: () => void;
  onNotificationClick: (n: NotificationItem) => void;
  onAvatarClick: (e: React.MouseEvent, userId: string) => void;
  onVideoClick: (e: React.MouseEvent, videoId: string) => void;
  markingIds: Set<string>;
}

function NotificationList({
  notifications,
  isLoading,
  isLoadingMore,
  total,
  currentPage,
  totalPages,
  onLoadMore,
  onNotificationClick,
  onAvatarClick,
  onVideoClick,
  markingIds,
}: NotificationListProps) {
  if (isLoading) {
    return (
      <div className="divide-y">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-4">
            <Skeleton className="w-9 h-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-3 w-16 shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mb-4">
          <Bell className="w-8 h-8 text-orange-300 dark:text-orange-700" />
        </div>
        <p className="text-base font-medium text-muted-foreground mb-1">
          No notifications yet
        </p>
        <p className="text-sm text-muted-foreground/70 text-center max-w-xs">
          When someone interacts with your content, you&apos;ll see it here.
        </p>
      </div>
    );
  }

  const remaining = total - notifications.length;

  return (
    <div>
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="divide-y"
      >
        {notifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            onClick={() => onNotificationClick(notification)}
            onAvatarClick={(e) => onAvatarClick(e, notification.fromUser?.id || '')}
            onVideoClick={
              notification.video
                ? (e) => onVideoClick(e, notification.video.id)
                : undefined
            }
            isMarking={markingIds.has(notification.id)}
          />
        ))}
      </motion.div>

      {/* Load More */}
      {currentPage < totalPages && (
        <div className="p-4 text-center border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="gap-2"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              `Load More${remaining > 0 ? ` (${remaining} remaining)` : ''}`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Notification Row ──────────────────────────────────────────────

interface NotificationRowProps {
  notification: NotificationItem;
  onClick: () => void;
  onAvatarClick: (e: React.MouseEvent) => void;
  onVideoClick?: (e: React.MouseEvent) => void;
  isMarking: boolean;
}

function NotificationRow({
  notification,
  onClick,
  onAvatarClick,
  onVideoClick,
  isMarking,
}: NotificationRowProps) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.mention;
  const Icon = config.icon;
  const isUnread = !notification.isRead;
  const fromUser = notification.fromUser;
  const video = notification.video;

  return (
    <motion.div
      variants={itemVariants}
      className={`relative flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer group ${
        isUnread
          ? 'bg-orange-50/60 dark:bg-orange-950/20 hover:bg-orange-100/70 dark:hover:bg-orange-950/30'
          : 'hover:bg-muted/50'
      }`}
      onClick={onClick}
    >
      {/* Unread indicator dot */}
      {isUnread && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-500 shrink-0" />
      )}

      {/* Type icon */}
      <div
        className={`w-9 h-9 rounded-full ${config.bgColor} flex items-center justify-center shrink-0 ring-2 ${config.ringColor} ${
          isUnread ? '' : 'opacity-60'
        }`}
      >
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>

      {/* Avatar (fromUser) */}
      {fromUser ? (
        <button
          onClick={onAvatarClick}
          className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-full"
          aria-label={`View ${fromUser.displayName || fromUser.username}'s profile`}
        >
          {fromUser.avatarUrl ? (
            <img
              src={fromUser.avatarUrl}
              alt={fromUser.displayName || fromUser.username}
              className="w-9 h-9 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(
                fromUser.id
              )} flex items-center justify-center ring-1 ring-white/20`}
            >
              <span className="text-xs font-bold text-white">
                {getInitials(fromUser.username)}
              </span>
            </div>
          )}
        </button>
      ) : (
        <div className="w-9 h-9 shrink-0" />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${
            isUnread
              ? 'font-medium text-foreground'
              : 'text-muted-foreground font-normal'
          }`}
        >
          {notification.title}
        </p>
        {notification.message && (
          <p
            className={`text-xs mt-0.5 leading-relaxed truncate ${
              isUnread
                ? 'text-muted-foreground'
                : 'text-muted-foreground/70'
            }`}
          >
            {notification.message}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          {getRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Right side: video thumbnail or read indicator */}
      <div className="flex items-center gap-2 shrink-0 self-center">
        {/* Marking indicator */}
        {isMarking && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
        )}

        {/* Video thumbnail */}
        {video && onVideoClick && (
          <button
            onClick={onVideoClick}
            className="relative w-12 h-12 rounded-md overflow-hidden ring-1 ring-border hover:ring-2 hover:ring-orange-400 transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label={`View video: ${video.title}`}
          >
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-200 to-amber-300 dark:from-orange-900 dark:to-amber-800 flex items-center justify-center">
                <Video className="w-4 h-4 text-white/80" />
              </div>
            )}
          </button>
        )}

        {/* Read indicator */}
        {isUnread ? (
          <Check className="w-4 h-4 text-orange-400/0 group-hover:text-orange-400/60 transition-colors" />
        ) : (
          <CheckCheck className="w-4 h-4 text-muted-foreground/30" />
        )}
      </div>
    </motion.div>
  );
}

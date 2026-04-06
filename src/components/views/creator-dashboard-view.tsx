'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Eye,
  Users,
  Trophy,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Megaphone,
  CreditCard,
  Building2,
  Video,
  MessageCircle,
  Heart,
  BarChart3,
  MapPin,
  Clock,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { getScoreLevel, getScoreLevelBadge } from '@/types';
import { PromoteVideoDialog } from '@/components/promote-video-dialog';

// ─── Types ──────────────────────────────────────────────────────────
interface CreatorDashboardViewProps {
  onNavigate: (view: string) => void;
}

type Period = 'all' | '7d' | '30d' | '90d';

// ─── Helpers ────────────────────────────────────────────────────────
function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function getPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

const ACTIVITY_ICONS: Record<string, typeof Video> = {
  video: Video,
  tip: Heart,
  follow: Users,
  poll: BarChart3,
  default: Clock,
};

const PERIOD_TABS: { value: Period; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// ─── Component ──────────────────────────────────────────────────────
export function CreatorDashboardView({ onNavigate }: CreatorDashboardViewProps) {
  const { currentUser } = useAuthStore();

  const [period, setPeriod] = useState<Period>('30d');
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    try {
      const headers = { 'X-User-Id': currentUser.id };

      const [dashRes, analyticsRes] = await Promise.all([
        fetch('/api/creator/dashboard', { headers }),
        fetch(`/api/creator/analytics?period=${period}`, { headers }),
      ]);

      if (!dashRes.ok) throw new Error('Failed to load dashboard');
      if (!analyticsRes.ok) throw new Error('Failed to load analytics');

      const dashData = await dashRes.json();
      const analyticsData = await analyticsRes.json();

      setDashboard(dashData);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [currentUser, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Derived data ───────────────────────────────────────────────
  const overview = dashboard?.overview as { totalViews: number; totalFollowers: number; memberScore: number; isVerified: boolean } | undefined;
  const earnings = dashboard?.earnings as { thisMonth: number; lastMonth: number; totalEarnings: number; pendingPayout: number } | undefined;
  const content = dashboard?.content as { totalVideos: number; totalPolls: number; totalResponses: number; topVideo: { id: string; title: string; viewCount: number; thumbnailUrl: string | null; createdAt: string } | null } | undefined;
  const audience = dashboard?.audience as { topLocations: { name: string; count: number }[]; topAgeRanges: { name: string; count: number }[]; subscriberGrowth: { date: string; newSubscribers: number }[] } | undefined;
  const recentActivity = dashboard?.recentActivity as { type: string; description: string; timestamp: string }[] | undefined;
  const analyticsData = analytics?.analytics as { totalViews: number; totalLikes: number; totalComments: number; totalResponses: number; totalTips: number; totalRevenue: number; totalPolls: number; avgEngagement: number; topCategory: string | null; subscriberCount: number; period: string; computedAt: string } | undefined;
  const dailyViews = analytics?.dailyViews as { date: string; views: number }[] | undefined;
  const milestones = analytics?.milestones as { label: string; achieved: boolean; value: number }[] | undefined;

  const percentChange = earnings ? getPercentChange(earnings.thisMonth, earnings.lastMonth) : 0;
  const level = overview ? getScoreLevel(overview.memberScore) : 'bronze';
  const levelBadge = getScoreLevelBadge(level);
  const maxLocationCount = audience?.topLocations?.length ? Math.max(...audience.topLocations.map(l => l.count), 1) : 1;
  const maxViews = dailyViews?.length ? Math.max(...dailyViews.map(d => d.views), 1) : 1;

  // ─── Loading skeletons ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen px-4 py-6 max-w-6xl mx-auto">
        {/* Header skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="w-24 h-9 rounded-md" />
          <div>
            <Skeleton className="h-8 w-48 mb-1" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        {/* Period tabs skeleton */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-20 h-8 rounded-full" />
          ))}
        </div>

        {/* Overview cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sections skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions skeleton */}
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-44 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen px-4 py-6 max-w-6xl mx-auto flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold">Failed to load Creator Studio</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button
          onClick={fetchData}
          className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="min-h-screen px-4 py-6 max-w-6xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6"
      >
        <Button
          variant="ghost"
          onClick={() => onNavigate('dashboard')}
          className="shrink-0 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">Back to Dashboard</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-orange-500" />
            Creator Studio
          </h1>
          <p className="text-sm text-muted-foreground">Manage your content, track analytics, and grow your audience</p>
        </div>
      </motion.div>

      {/* ─── Period Tabs ─────────────────────────────────────────── */}
      <motion.div
        variants={staggerItem}
        initial="initial"
        animate="animate"
        className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none"
      >
        {PERIOD_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={period === tab.value ? 'default' : 'outline'}
            size="sm"
            className={
              period === tab.value
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm shrink-0'
                : 'shrink-0'
            }
            onClick={() => setPeriod(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </motion.div>

      {/* ─── Overview Cards ──────────────────────────────────────── */}
      <motion.div
        variants={staggerItem}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {/* Total Views */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5 text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total Views</p>
                <p className="text-xl font-bold">
                  {formatNumber(overview?.totalViews ?? analyticsData?.totalViews ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Followers */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total Followers</p>
                <p className="text-xl font-bold">
                  {formatNumber(overview?.totalFollowers ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Member Score */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Member Score</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold">{overview?.memberScore ?? 0}</p>
                  <Badge className={`text-[10px] px-1.5 py-0 ${levelBadge.className}`}>
                    {levelBadge.label}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earnings This Month */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Earnings This Month</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(earnings?.thisMonth ?? 0)}
                  </p>
                  {percentChange !== 0 && (
                    <span className={`flex items-center text-xs font-medium ${percentChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {percentChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(percentChange)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Earnings & Content Performance ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Earnings Section */}
        <motion.div
          variants={staggerItem}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-500" />
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* This Month vs Last Month */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">This Month</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {formatMoney(earnings?.thisMonth ?? 0)}
                  </p>
                  {percentChange !== 0 && (
                    <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${percentChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {percentChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(percentChange)}% vs last month
                    </div>
                  )}
                </div>
                <div className="rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Last Month</p>
                  <p className="text-2xl font-bold">
                    {formatMoney(earnings?.lastMonth ?? 0)}
                  </p>
                </div>
              </div>

              {/* Pending & Total */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium">Pending Payout</span>
                  </div>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {formatMoney(earnings?.pendingPayout ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium">Total Earnings</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(earnings?.totalEarnings ?? 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Content Performance */}
        <motion.div
          variants={staggerItem}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.12 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="w-5 h-5 text-orange-500" />
                Top Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              {content && content.totalVideos > 0 ? (
                <div className="space-y-1">
                  {/* Top Video Highlight */}
                  {content.topVideo && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shrink-0 text-white">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{content.topVideo.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(content.topVideo.viewCount)} views
                        </p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs shrink-0">
                        #1
                      </Badge>
                    </div>
                  )}

                  {/* Content Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">{content.totalVideos}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Videos</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">{content.totalPolls}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Polls</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">{content.totalResponses}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Responses</p>
                    </div>
                    </div>

                  {/* Engagement Stats from analytics */}
                  {analyticsData && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Heart className="w-3.5 h-3.5 text-pink-500" />
                          Total Likes
                        </div>
                        <span className="font-semibold">{formatNumber(analyticsData.totalLikes)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MessageCircle className="w-3.5 h-3.5 text-orange-500" />
                          Total Comments
                        </div>
                        <span className="font-semibold">{formatNumber(analyticsData.totalComments)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
                          Avg. Engagement
                        </div>
                        <span className="font-semibold">{analyticsData.avgEngagement.toFixed(1)}%</span>
                      </div>
                      {analyticsData.topCategory && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                            Top Category
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {analyticsData.topCategory}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Video className="w-10 h-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No content yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create your first lead clip to get started</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-2"
                    onClick={() => onNavigate('create-lead')}
                  >
                    <Video className="w-4 h-4" />
                    Create Lead Clip
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Audience & Recent Activity ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Audience Overview */}
        <motion.div
          variants={staggerItem}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                Your Audience
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Subscriber count */}
              <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
                <div>
                  <p className="text-xs text-muted-foreground">Subscribers</p>
                  <p className="text-xl font-bold">{analyticsData?.subscriberCount ?? 0}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                  <ArrowUpRight className="w-3 h-3" />
                  {audience?.subscriberGrowth?.reduce((sum, d) => sum + d.newSubscribers, 0) ?? 0} this week
                </div>
              </div>

              {/* Top Locations */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Locations</p>
              {audience?.topLocations && audience.topLocations.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {audience.topLocations.map((location) => (
                    <div key={location.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-orange-400" />
                          <span className="font-medium">{location.name}</span>
                        </div>
                        <span className="text-muted-foreground text-xs">{location.count}</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${(location.count / maxLocationCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">No location data yet</p>
              )}

              {/* Age Ranges */}
              {audience?.topAgeRanges && audience.topAgeRanges.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Age Distribution</p>
                  <div className="flex flex-wrap gap-2">
                    {audience.topAgeRanges.map((age) => (
                      <Badge key={age.name} variant="secondary" className="text-xs">
                        {age.name}: {age.count}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          variants={staggerItem}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.17 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {recentActivity && recentActivity.length > 0 ? (
                  recentActivity.slice(0, 8).map((activity, index) => {
                    const Icon = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.default;
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">{timeAgo(activity.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Clock className="w-10 h-10 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                    <p className="text-xs text-muted-foreground mt-1">Start creating content to see activity here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Milestones ─────────────────────────────────────────── */}
      {milestones && milestones.length > 0 && (
        <motion.div
          variants={staggerItem}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-orange-500" />
                Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.label}
                    className={`flex flex-col items-center p-3 rounded-xl border transition-colors ${
                      milestone.achieved
                        ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800'
                        : 'bg-muted/30 border-muted'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
                      milestone.achieved
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                        : 'bg-muted'
                    }`}>
                      {milestone.achieved ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-xs text-muted-foreground">🔒</span>
                      )}
                    </div>
                    <p className="text-[10px] font-medium text-center leading-tight">{milestone.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Quick Actions ───────────────────────────────────────── */}
      <motion.div
        variants={staggerItem}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.22 }}
        className="flex flex-wrap gap-3"
      >
        <Button
          onClick={() => setShowPromoteDialog(true)}
          className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm"
        >
          <Megaphone className="w-4 h-4" />
          Promote a Video
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => onNavigate('wallet')}
        >
          <CreditCard className="w-4 h-4" />
          Manage Subscriptions
        </Button>
        <Button
          variant="outline"
          className="gap-2 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
          onClick={() => onNavigate('advertiser-dashboard')}
        >
          <Megaphone className="w-4 h-4" />
          Ad Manager
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => onNavigate('creator-dashboard')}
        >
          <Building2 className="w-4 h-4" />
          Edit Business Profile
        </Button>
      </motion.div>

      {/* ─── Promote Video Dialog ─────────────────────────────── */}
      <PromoteVideoDialog
        open={showPromoteDialog}
        onOpenChange={setShowPromoteDialog}
        onSuccess={fetchData}
      />
    </div>
  );
}

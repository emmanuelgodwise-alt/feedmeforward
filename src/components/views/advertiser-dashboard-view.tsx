'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  DollarSign,
  Eye,
  MousePointerClick,
  BarChart3,
  ArrowLeft,
  Plus,
  RefreshCw,
  AlertCircle,
  Pause,
  Play,
  ExternalLink,
  Settings2,
  TrendingUp,
  TrendingDown,
  Globe,
  Smartphone,
  Monitor,
  Users,
  Target,
  Video,
  ThumbsUp,
  Filter,
  Search,
  ChevronDown,
  CircleDot,
  Wallet,
  PieChart as PieChartIcon,
  CheckCircle2,
  Clock,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useAuthStore } from '@/stores/auth-store';
import { CATEGORIES } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────

interface AdvertiserDashboardViewProps {
  onNavigate: (view: string) => void;
}

type Period = '7d' | '30d' | '90d' | 'all';
type CampaignStatus = 'active' | 'paused' | 'exhausted' | 'draft';

interface Campaign {
  id: string;
  title: string;
  status: CampaignStatus;
  adType: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spent: number;
  budget: number;
  createdAt: string;
}

interface CampaignAnalytics {
  totalSpent: number;
  totalImpressions: number;
  totalClicks: number;
  avgCpm: number;
  periodChange: {
    spent: number;
    impressions: number;
    clicks: number;
  };
}

interface RevenueShare {
  platform: number;
  creators: number;
  voters: number;
  totalDistributed: number;
  yourCreatorShare: number;
  yourAdvertiserSpend: number;
}

interface Placement {
  id: string;
  videoTitle: string;
  placementType: string;
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
  thumbnailUrl?: string;
}

interface Demographics {
  ageDistribution: { range: string; count: number }[];
  locations: { name: string; count: number }[];
  genderSplit: { gender: string; count: number }[];
  devices: { type: string; count: number }[];
}

interface EligibleVideo {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  viewCount: number;
  pollVotes: number;
  engagementRate: number;
  category: string | null;
  creatorUsername: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const PERIOD_TABS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

const STATUS_STYLES: Record<CampaignStatus, { className: string; icon: typeof CircleDot; label: string }> = {
  active: {
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    icon: CircleDot,
    label: 'Active',
  },
  paused: {
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    icon: Pause,
    label: 'Paused',
  },
  exhausted: {
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    icon: Clock,
    label: 'Exhausted',
  },
  draft: {
    className: 'bg-muted text-muted-foreground dark:bg-muted/50',
    icon: Minus,
    label: 'Draft',
  },
};

const REVENUE_COLORS = ['#f97316', '#f59e0b', '#10b981'];

const AGE_COLORS = ['#f97316', '#fb923c', '#fdba74', '#f59e0b', '#d97706', '#b45309'];
const DEVICE_ICONS: Record<string, typeof Smartphone> = {
  mobile: Smartphone,
  desktop: Monitor,
  tablet: Monitor,
};

const THUMBNAIL_GRADIENTS = [
  'from-orange-400 to-red-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-orange-500 to-yellow-500',
  'from-amber-500 to-red-400',
  'from-red-400 to-orange-600',
  'from-yellow-400 to-amber-600',
  'from-pink-400 to-rose-500',
];

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  },
  itemStyle: { color: 'hsl(var(--foreground))' },
};

// ─── Helpers ────────────────────────────────────────────────────────

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function getGradient(index: number): string {
  return THUMBNAIL_GRADIENTS[index % THUMBNAIL_GRADIENTS.length];
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="flex items-center gap-0.5 text-muted-foreground text-xs"><Minus className="w-3 h-3" />0%</span>;
  const positive = value > 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
      <Icon className="w-3 h-3" />
      {Math.abs(value)}%
    </span>
  );
}

// ─── AdCampaignDialog ───────────────────────────────────────────────

function AdCampaignDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [budget, setBudget] = useState('');
  const [adType, setAdType] = useState('pre-roll');
  const [targeting, setTargeting] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !budget) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/ads/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': useAuthStore.getState().currentUser?.id ?? '' },
        body: JSON.stringify({ title, budget: parseFloat(budget), adType, targeting }),
      });
      if (res.ok) {
        setTitle('');
        setBudget('');
        setAdType('pre-roll');
        setTargeting('all');
        onOpenChange(false);
        onSuccess();
      }
    } catch {
      // Silently fail — dialog stays open
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-white" />
            </div>
            Create Campaign
          </DialogTitle>
          <DialogDescription>
            Set up a new ad campaign to reach your target audience on FeedMeForward.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Campaign Title</label>
            <Input
              placeholder="e.g. Summer Product Launch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Daily Budget</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="50.00"
                min="1"
                step="0.01"
                className="pl-9"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">Minimum $1.00 per day</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ad Format</label>
            <Select value={adType} onValueChange={setAdType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pre-roll">Pre-Roll Video Ad</SelectItem>
                <SelectItem value="mid-roll">Mid-Roll Video Ad</SelectItem>
                <SelectItem value="banner">Banner Overlay</SelectItem>
                <SelectItem value="sponsored">Sponsored Content</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Targeting</label>
            <Select value={targeting} onValueChange={setTargeting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Audiences</SelectItem>
                <SelectItem value="18-24">Age 18-24</SelectItem>
                <SelectItem value="25-34">Age 25-34</SelectItem>
                <SelectItem value="35-44">Age 35-44</SelectItem>
                <SelectItem value="45+">Age 45+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !budget || parseFloat(budget) < 1 || submitting}
            className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Launch Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Custom Pie Label ───────────────────────────────────────────────

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {name} {(percent * 100).toFixed(0)}%
    </text>
  );
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────

export function AdvertiserDashboardView({ onNavigate }: AdvertiserDashboardViewProps) {
  const { currentUser } = useAuthStore();

  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [revenueShare, setRevenueShare] = useState<RevenueShare | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [demographics, setDemographics] = useState<Demographics | null>(null);
  const [eligibleVideos, setEligibleVideos] = useState<EligibleVideo[]>([]);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [videoCategoryFilter, setVideoCategoryFilter] = useState('all');
  const [videoSortBy, setVideoSortBy] = useState<'views' | 'engagement'>('views');
  const [videoSearch, setVideoSearch] = useState('');
  const [togglingCampaign, setTogglingCampaign] = useState<string | null>(null);

  // ─── Fetch data ───────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    try {
      const headers = { 'X-User-Id': currentUser.id };

      const [campaignsRes, analyticsRes, eligibleRes, revenueRes] = await Promise.all([
        fetch('/api/ads/campaigns', { headers }),
        fetch(`/api/ads/analytics?period=${period}`, { headers }),
        fetch('/api/ads/eligible-videos', { headers }),
        fetch(`/api/ads/revenue/${currentUser.id}`, { headers }).catch(() => null),
      ]);

      if (!campaignsRes.ok) throw new Error('Failed to load campaigns');
      if (!analyticsRes.ok) throw new Error('Failed to load analytics');

      const campaignsData = await campaignsRes.json();
      const analyticsData = await analyticsRes.json();
      const eligibleData = await eligibleRes.json();

      setCampaigns(campaignsData.campaigns ?? campaignsData ?? []);
      setAnalytics(analyticsData.analytics ?? analyticsData ?? null);
      setEligibleVideos(eligibleData.videos ?? eligibleData ?? []);

      // Revenue & demographics from analytics payload or separate endpoints
      if (analyticsData.revenueShare) {
        setRevenueShare(analyticsData.revenueShare);
      }
      if (analyticsData.demographics) {
        setDemographics(analyticsData.demographics);
      }
      if (analyticsData.placements) {
        setPlacements(analyticsData.placements);
      }

      if (revenueRes?.ok) {
        const revData = await revenueRes.json();
        if (revData.revenueShare) setRevenueShare(revData.revenueShare);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [currentUser, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Toggle campaign status ───────────────────────────────────
  const handleToggleCampaign = async (campaignId: string, currentStatus: CampaignStatus) => {
    setTogglingCampaign(campaignId);
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const res = await fetch(`/api/ads/campaigns`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id ?? '',
        },
        body: JSON.stringify({ campaignId, status: newStatus }),
      });
      if (res.ok) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaignId ? { ...c, status: newStatus as CampaignStatus } : c))
        );
      }
    } catch {
      // Silently fail
    } finally {
      setTogglingCampaign(null);
    }
  };

  // ─── Place ad on video ────────────────────────────────────────
  const handlePlaceAd = async (videoId: string) => {
    try {
      await fetch('/api/ads/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id ?? '',
        },
        body: JSON.stringify({ videoId, title: `Ad on video ${videoId.slice(0, 6)}`, budget: 10, adType: 'banner' }),
      });
      fetchData();
    } catch {
      // Silently fail
    }
  };

  // ─── Derived / Sorted data ────────────────────────────────────
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const statusOrder: Record<CampaignStatus, number> = { active: 0, paused: 1, exhausted: 2, draft: 3 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return b.spent - a.spent;
  });

  const revenuePieData = revenueShare
    ? [
        { name: 'Platform', value: revenueShare.platform },
        { name: 'Creators', value: revenueShare.creators },
        { name: 'Voters', value: revenueShare.voters },
      ]
    : [];

  const ageData = demographics?.ageDistribution ?? [];
  const locationData = demographics?.locations ?? [];
  const genderData = demographics?.genderSplit ?? [];
  const deviceData = demographics?.devices ?? [];

  const filteredVideos = eligibleVideos
    .filter((v) => {
      if (videoCategoryFilter !== 'all' && v.category !== videoCategoryFilter) return false;
      if (videoSearch && !v.title.toLowerCase().includes(videoSearch.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (videoSortBy === 'engagement') return b.engagementRate - a.engagementRate;
      return b.viewCount - a.viewCount;
    });

  // ─── Loading Skeletons ───────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-8 w-48 mb-1" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="w-36 h-9 rounded-lg" />
        </div>

        {/* Period tabs skeleton */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-20 h-8 rounded-full" />
          ))}
        </div>

        {/* Overview stats skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-24 mb-2" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Campaign list + Revenue breakdown skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-56 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>

        {/* Placements + Demographics skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>

        {/* Marketplace skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-72 w-full rounded-xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold">Failed to load Ad Manager</h2>
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

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto">
      {/* ═══════════════════════════════════════════════════════
          SECTION 1: Header
          ═══════════════════════════════════════════════════════ */}
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
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            Ad Manager
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your campaigns, track performance, and optimize your ad spend
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </Button>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════
          Period Selector Tabs
          ═══════════════════════════════════════════════════════ */}
      <motion.div
        variants={staggerItem}
        initial="initial"
        animate="animate"
        className="flex gap-2 mb-6 overflow-x-auto pb-1"
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

      {/* ═══════════════════════════════════════════════════════
          SECTION 2: Overview Stats Cards
          ═══════════════════════════════════════════════════════ */}
      <motion.div
        variants={staggerItem}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {/* Total Spent */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-orange-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Total Spent</p>
                <p className="text-xl font-bold">{formatMoney(analytics?.totalSpent ?? 0)}</p>
              </div>
              {analytics?.periodChange?.spent !== undefined && (
                <ChangeIndicator value={analytics.periodChange.spent} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Impressions */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Total Impressions</p>
                <p className="text-xl font-bold">{formatNumber(analytics?.totalImpressions ?? 0)}</p>
              </div>
              {analytics?.periodChange?.impressions !== undefined && (
                <ChangeIndicator value={analytics.periodChange.impressions} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Clicks */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                <MousePointerClick className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Total Clicks</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold">{formatNumber(analytics?.totalClicks ?? 0)}</p>
                  {analytics?.totalImpressions && analytics.totalImpressions > 0 ? (
                    <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      {((analytics.totalClicks / analytics.totalImpressions) * 100).toFixed(2)}% CTR
                    </Badge>
                  ) : null}
                </div>
              </div>
              {analytics?.periodChange?.clicks !== undefined && (
                <ChangeIndicator value={analytics.periodChange.clicks} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Avg CPM */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-purple-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Avg. CPM</p>
                <p className="text-xl font-bold">{formatMoney(analytics?.avgCpm ?? 0)}</p>
                <p className="text-[10px] text-muted-foreground">cost per 1,000 impressions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3: Campaign List + SECTION 4: Revenue Breakdown
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Campaign List */}
        <motion.div
          variants={staggerItem}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                Campaigns
                <Badge variant="secondary" className="text-xs ml-1">
                  {campaigns.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                Manage and monitor all your advertising campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sortedCampaigns.length > 0 ? (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {sortedCampaigns.map((campaign) => {
                    const statusInfo = STATUS_STYLES[campaign.status];
                    const StatusIcon = statusInfo.icon;
                    const budgetUsed = campaign.budget > 0 ? (campaign.spent / campaign.budget) * 100 : 0;
                    const budgetColor =
                      budgetUsed > 90
                        ? 'text-red-500'
                        : budgetUsed > 70
                          ? 'text-amber-500'
                          : 'text-emerald-500';

                    return (
                      <motion.div
                        key={campaign.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 rounded-xl border bg-card hover:shadow-md transition-all"
                      >
                        {/* Campaign header row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm truncate">{campaign.title}</h3>
                              <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${statusInfo.className}`}>
                                <StatusIcon className="w-3 h-3 mr-0.5" />
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Video className="w-3 h-3" />
                                {campaign.adType}
                              </span>
                              <span>{formatNumber(campaign.impressions)} impressions</span>
                              <span>{formatNumber(campaign.clicks)} clicks</span>
                              <span className="font-medium text-orange-500">
                                {campaign.ctr.toFixed(2)}% CTR
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            {(campaign.status === 'active' || campaign.status === 'paused') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={togglingCampaign === campaign.id}
                                onClick={() => handleToggleCampaign(campaign.id, campaign.status)}
                              >
                                {togglingCampaign === campaign.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : campaign.status === 'active' ? (
                                  <Pause className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <Play className="w-4 h-4 text-emerald-500" />
                                )}
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Settings2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>

                        {/* Budget progress */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  budgetUsed > 90
                                    ? 'bg-red-400'
                                    : budgetUsed > 70
                                      ? 'bg-amber-400'
                                      : 'bg-gradient-to-r from-orange-400 to-amber-400'
                                }`}
                                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className={`text-xs font-semibold shrink-0 ${budgetColor}`}>
                            {formatMoney(campaign.spent)} / {formatMoney(campaign.budget)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mb-4">
                    <Megaphone className="w-8 h-8 text-orange-400" />
                  </div>
                  <p className="text-sm font-semibold mb-1">No campaigns yet</p>
                  <p className="text-xs text-muted-foreground mb-4 text-center max-w-sm">
                    Launch your first ad campaign to reach the FeedMeForward audience and start seeing results.
                  </p>
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  >
                    <Plus className="w-4 h-4" />
                    Create Your First Campaign
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Revenue Sharing Breakdown */}
        <motion.div
          variants={staggerItem}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.13 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="w-5 h-5 text-orange-500" />
                Revenue Sharing
              </CardTitle>
              <CardDescription>
                How ad revenue is distributed across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {revenueShare ? (
                <div className="space-y-4">
                  {/* Donut chart */}
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenuePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          label={renderCustomLabel}
                          labelLine={false}
                          strokeWidth={0}
                        >
                          {revenuePieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={REVENUE_COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}`, undefined]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div className="space-y-2">
                    {revenuePieData.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: REVENUE_COLORS[i] }}
                          />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-semibold">{((item.value / (revenuePieData.reduce((s, d) => s + d.value, 0) || 1)) * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Distributed</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">
                        {formatMoney(revenueShare.totalDistributed)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Your Creator Share</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(revenueShare.yourCreatorShare)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Your Ad Spend</span>
                      <span className="font-semibold">
                        {formatMoney(revenueShare.yourAdvertiserSpend)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <PieChart className="w-12 h-12 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No revenue data yet</p>
                  <p className="text-xs text-muted-foreground">Start a campaign to see revenue sharing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5: Top Performing Placements + SECTION 6: Demographics
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Performing Placements */}
        <motion.div
          variants={staggerItem}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.16 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                Top Placements
              </CardTitle>
              <CardDescription>
                Best performing ad placements ranked by revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {placements.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {placements
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 8)
                    .map((placement, index) => {
                      const maxRevenue = placements.reduce((m, p) => Math.max(m, p.revenue), 0) || 1;
                      return (
                        <div
                          key={placement.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          {/* Rank */}
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              index === 0
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                                : index === 1
                                  ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700'
                                  : index === 2
                                    ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {index + 1}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{placement.videoTitle}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {placement.placementType}
                              </Badge>
                              <span>{formatNumber(placement.impressions)} imp</span>
                              <span>{formatNumber(placement.clicks)} clicks</span>
                            </div>
                          </div>

                          {/* Revenue bar */}
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              {formatMoney(placement.revenue)}
                            </p>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                                style={{ width: `${(placement.revenue / maxRevenue) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <TrendingUp className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No placement data yet</p>
                  <p className="text-xs text-muted-foreground">Your top placements will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Audience Demographics */}
        <motion.div
          variants={staggerItem}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.18 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                Audience Demographics
              </CardTitle>
              <CardDescription>
                Insights into who is seeing and engaging with your ads
              </CardDescription>
            </CardHeader>
            <CardContent>
              {demographics ? (
                <div className="space-y-5 max-h-[400px] overflow-y-auto">
                  {/* Age Distribution Bar Chart */}
                  {ageData.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Age Distribution
                      </p>
                      <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={ageData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="range" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip {...tooltipStyle} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Impressions">
                              {ageData.map((_, i) => (
                                <Cell key={`age-${i}`} fill={AGE_COLORS[i % AGE_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Location Breakdown */}
                  {locationData.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Top Locations
                      </p>
                      <div className="space-y-2">
                        {locationData.slice(0, 5).map((loc) => {
                          const maxCount = locationData[0]?.count || 1;
                          return (
                            <div key={loc.name} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <Globe className="w-3 h-3 text-orange-400" />
                                  {loc.name}
                                </span>
                                <span className="font-semibold">{formatNumber(loc.count)}</span>
                              </div>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full"
                                  style={{ width: `${(loc.count / maxCount) * 100}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Gender Split */}
                  {genderData.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Gender Split
                      </p>
                      <div className="flex gap-2">
                        {genderData.map((g) => {
                          const totalGender = genderData.reduce((s, d) => s + d.count, 0) || 1;
                          const pct = ((g.count / totalGender) * 100).toFixed(0);
                          return (
                            <div
                              key={g.gender}
                              className="flex-1 text-center p-2 rounded-lg bg-muted/50"
                            >
                              <p className="text-sm font-bold">{pct}%</p>
                              <p className="text-[10px] text-muted-foreground uppercase">{g.gender}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Device Types */}
                  {deviceData.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Device Types
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {deviceData.map((d) => {
                          const DeviceIcon = DEVICE_ICONS[d.type.toLowerCase()] || Monitor;
                          const totalDevices = deviceData.reduce((s, dev) => s + dev.count, 0) || 1;
                          const pct = ((d.count / totalDevices) * 100).toFixed(0);
                          return (
                            <div key={d.type} className="text-center p-2 rounded-lg bg-muted/50">
                              <DeviceIcon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-sm font-bold">{pct}%</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{d.type}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No demographic data yet</p>
                  <p className="text-xs text-muted-foreground">Audience insights will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7: Worthy Videos Marketplace
          ═══════════════════════════════════════════════════════ */}
      <motion.div
        variants={staggerItem}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.22 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-500" />
                  Worthy Videos Marketplace
                </CardTitle>
                <CardDescription>
                  Discover high-engagement videos eligible for ad placement
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search videos..."
                    value={videoSearch}
                    onChange={(e) => setVideoSearch(e.target.value)}
                    className="pl-9 h-8 text-xs"
                  />
                </div>
                <Select value={videoCategoryFilter} onValueChange={setVideoCategoryFilter}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <Filter className="w-3.5 h-3.5 mr-1" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={videoSortBy} onValueChange={(v) => setVideoSortBy(v as 'views' | 'engagement')}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <ChevronDown className="w-3.5 h-3.5 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="views">By Views</SelectItem>
                    <SelectItem value="engagement">By Engagement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[540px] overflow-y-auto pr-1">
                {filteredVideos.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="group rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all"
                  >
                    {/* Thumbnail */}
                    <div
                      className={`h-32 bg-gradient-to-br ${getGradient(index)} relative`}
                    >
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-10 h-10 text-white/50" />
                        </div>
                      )}

                      {/* Engagement badge */}
                      <Badge className="absolute top-2 right-2 bg-black/60 text-white text-[10px] border-0 backdrop-blur-sm">
                        {video.engagementRate.toFixed(1)}% eng.
                      </Badge>
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-2">
                      <h4 className="text-sm font-semibold line-clamp-2 leading-tight min-h-[2.5rem]">
                        {video.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">@{video.creatorUsername}</p>

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatNumber(video.viewCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {formatNumber(video.pollVotes)}
                        </span>
                      </div>

                      {/* Category + Place Ad */}
                      <div className="flex items-center justify-between pt-1">
                        {video.category && (
                          <Badge variant="secondary" className="text-[10px]">
                            {video.category}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          className="ml-auto h-7 text-xs gap-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                          onClick={() => handlePlaceAd(video.id)}
                        >
                          <Target className="w-3 h-3" />
                          Place Ad
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-orange-400" />
                </div>
                <p className="text-sm font-semibold mb-1">No videos available</p>
                <p className="text-xs text-muted-foreground text-center max-w-sm">
                  {videoSearch || videoCategoryFilter !== 'all'
                    ? 'Try adjusting your filters to discover more videos.'
                    : 'Check back later for new high-engagement videos eligible for ad placement.'}
                </p>
                {(videoSearch || videoCategoryFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-2"
                    onClick={() => {
                      setVideoSearch('');
                      setVideoCategoryFilter('all');
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Quick Actions ─────────────────────────────────────── */}
      <motion.div
        variants={staggerItem}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.25 }}
        className="flex flex-wrap gap-3 mt-6"
      >
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => onNavigate('wallet')}
        >
          <Wallet className="w-4 h-4" />
          Fund Wallet
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => onNavigate('analytics-pro')}
        >
          <BarChart3 className="w-4 h-4" />
          Advanced Analytics
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => onNavigate('creator-dashboard')}
        >
          <Megaphone className="w-4 h-4" />
          Creator Studio
        </Button>
      </motion.div>

      {/* ─── Create Campaign Dialog ────────────────────────────── */}
      <AdCampaignDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchData}
      />
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, Eye, Heart, MessageCircle, Users,
  DollarSign, Target, Activity, Shield, ShieldCheck, Award, Zap,
  Download, ChevronDown, ChevronUp, Loader2, AlertCircle, ArrowUpRight,
  ArrowDownRight, Minus, PieChart as PieChartIcon, Clock, Globe, Star, Lock, Unlock,
  FileText, Layers, Percent, RefreshCw, CheckCircle2, XCircle,
  Info, Sparkles, Vote, Filter, Search, Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickNav } from '@/components/quick-nav';
import { useAuthStore } from '@/stores/auth-store';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie,
  RadialBarChart, RadialBar,
} from 'recharts';

// ─── Colors ─────────────────────────────────────────────────────────
const COLORS = ['#f97316', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];
const COLORS_ALPHA = COLORS.map((c) => c + '44');

const TRUST_COLORS: Record<string, { bg: string; text: string; border: string; fill: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/40', fill: '#10b981' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800/40', fill: '#f59e0b' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800/40', fill: '#f97316' },
  red: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800/40', fill: '#ef4444' },
};

type Period = '7d' | '30d' | '90d';

interface ViewProps { onNavigate: (view: string) => void; }

const PERIOD_TABS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

// ─── Helpers ───────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtMoney(n: number): string { return `$${n.toFixed(2)}`; }

function ChangeIndicator({ value, compact }: { value: number; compact?: boolean }) {
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

function KpiCard({ icon: Icon, label, value, subtext, change, color = 'orange' }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtext?: React.ReactNode;
  change?: number;
  color?: string;
}) {
  const bgMap: Record<string, string> = {
    orange: 'bg-orange-50 dark:bg-orange-950/30',
    blue: 'bg-blue-50 dark:bg-blue-950/30',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30',
    amber: 'bg-amber-50 dark:bg-amber-950/30',
    purple: 'bg-purple-50 dark:bg-purple-950/30',
    cyan: 'bg-cyan-50 dark:bg-cyan-950/30',
    red: 'bg-red-50 dark:bg-red-950/30',
  };
  const iconMap: Record<string, string> = {
    orange: 'text-orange-500',
    blue: 'text-blue-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    purple: 'text-purple-500',
    cyan: 'text-cyan-500',
    red: 'text-red-500',
  };
  return (
    <Card className={`${bgMap[color]} border-0 shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${iconMap[color]}`} />
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
          </div>
          {change !== undefined && <ChangeIndicator value={change} />}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {subtext && <p className="text-[11px] text-muted-foreground mt-0.5">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

const tooltipStyle = {
  contentStyle: { backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' },
  itemStyle: { color: 'hsl(var(--foreground))' },
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────
export function AnalyticsProView({ onNavigate }: ViewProps) {
  const { currentUser } = useAuthStore();
  const [period, setPeriod] = useState<Period>('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [engagement, setEngagement] = useState<Record<string, unknown> | null>(null);
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [audience, setAudience] = useState<Record<string, unknown> | null>(null);
  const [revenue, setRevenue] = useState<Record<string, unknown> | null>(null);
  const [polls, setPolls] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentSearch, setContentSearch] = useState('');
  const [pollStatus, setPollStatus] = useState('all');
  const [exporting, setExporting] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { 'X-User-Id': currentUser.id };
      const [o, e, c, a, r, p] = await Promise.all([
        fetch(`/api/analytics/overview?period=${period}`, { headers }).then((r) => r.json()),
        fetch(`/api/analytics/engagement?period=${period}`, { headers }).then((r) => r.json()),
        fetch(`/api/analytics/content?limit=50`, { headers }).then((r) => r.json()),
        fetch(`/api/analytics/audience?period=${period}`, { headers }).then((r) => r.json()),
        fetch('/api/analytics/revenue', { headers }).then((r) => r.json()),
        fetch(`/api/analytics/polls?status=${pollStatus}`, { headers }).then((r) => r.json()),
      ]);
      if (o.success) setOverview(o.data);
      if (e.success) setEngagement(e.data);
      if (c.success) setContent(c.data);
      if (a.success) setAudience(a.data);
      if (r.success) setRevenue(r.data);
      if (p.success) setPolls(p.data);
    } catch {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [currentUser, period, pollStatus]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Export CSV ──────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const rows: string[] = [];
      rows.push('Analytics Pro Export — FeedMeForward');
      rows.push(`Generated: ${new Date().toISOString()}`);
      rows.push('');

      if (overview) {
        const kpis = overview.kpis as Record<string, Record<string, number>>;
        rows.push('=== OVERVIEW KPIs ===');
        rows.push(`Views: ${kpis.views?.value ?? 0}`);
        rows.push(`Likes: ${kpis.likes?.value ?? 0}`);
        rows.push(`Comments: ${kpis.comments?.value ?? 0}`);
        rows.push(`Engagement Rate: ${kpis.engagementRate?.value ?? 0}%`);
        rows.push(`Followers: ${kpis.followers?.value ?? 0}`);
        rows.push(`Revenue: $${kpis.revenue?.value ?? 0}`);
        rows.push('');
      }

      if (polls) {
        const pollList = (polls.polls as Array<Record<string, unknown>>) || [];
        rows.push('=== POLL TRUST SCORES ===');
        rows.push('Question,Votes,Trust Score,Grade,Confidence');
        for (const poll of pollList) {
          const trust = poll.trust as Record<string, unknown>;
          rows.push(`"${poll.question}",${poll.totalVotes},${trust?.score},${trust?.grade},${trust?.confidence}`);
        }
      }

      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-pro-${period}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div><Skeleton className="h-8 w-48 mb-1" /><Skeleton className="h-4 w-64" /></div>
        </div>
        <div className="flex gap-2 mb-6">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-20 h-8 rounded-full" />)}</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><AlertCircle className="w-8 h-8 text-red-500" /></div>
        <h2 className="text-lg font-semibold">Failed to load Analytics Pro</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={fetchAll} className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500"><RefreshCw className="w-4 h-4" />Retry</Button>
      </div>
    );
  }

  if (!currentUser) return null;

  const kpis = overview?.kpis as any;
  const dailyTimeSeries = (overview?.dailyTimeSeries as Array<Record<string, number>>) || [];
  const engagementData = engagement as Record<string, unknown> | null;
  const contentData = content as Record<string, unknown> | null;
  const audienceData = audience as Record<string, unknown> | null;
  const revenueData = revenue as Record<string, unknown> | null;
  const pollsData = polls as Record<string, unknown> | null;

  return (
    <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Analytics Pro
              <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] border-0">BUSINESS</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">Enterprise-grade insights for informed decisions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-full p-1">
            {PERIOD_TABS.map((tab) => (
              <Button key={tab.value} variant={period === tab.value ? 'default' : 'ghost'} size="sm" className={`rounded-full text-xs h-7 px-3 ${period === tab.value ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' : ''}`} onClick={() => setPeriod(tab.value)}>
                {tab.label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchAll}><RefreshCw className="w-3.5 h-3.5" /></Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export
          </Button>
        </div>
      </motion.div>

      <QuickNav onNavigate={onNavigate} activeView="analytics-pro" />

      {/* ─── Tabs ────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="overview" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white"><BarChart3 className="w-3.5 h-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="engagement" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white"><Activity className="w-3.5 h-3.5" />Engagement</TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white"><Layers className="w-3.5 h-3.5" />Content</TabsTrigger>
          <TabsTrigger value="audience" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white"><Users className="w-3.5 h-3.5" />Audience</TabsTrigger>
          <TabsTrigger value="revenue" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white"><DollarSign className="w-3.5 h-3.5" />Revenue</TabsTrigger>
          <TabsTrigger value="polls" className="gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white"><Vote className="w-3.5 h-3.5" />Poll Trust</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════
            TAB 1: OVERVIEW — YouTube Studio / Facebook Insights rival
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={Eye} label="Views" value={fmt(kpis?.views?.value ?? 0)} change={kpis?.views?.change} subtext={`${fmt(kpis?.views?.total ?? 0)} all time`} color="orange" />
            <KpiCard icon={Heart} label="Likes" value={fmt(kpis?.likes?.value ?? 0)} change={kpis?.likes?.change} color="red" />
            <KpiCard icon={MessageCircle} label="Comments" value={fmt(kpis?.comments?.value ?? 0)} change={kpis?.comments?.change} color="blue" />
            <KpiCard icon={Percent} label="Engagement Rate" value={`${kpis?.engagementRate?.value ?? 0}%`} change={kpis?.engagementRate?.change} color="emerald" />
            <KpiCard icon={Users} label="Followers" value={fmt(kpis?.followers?.value ?? 0)} change={kpis?.followers?.change} subtext={`${fmt(kpis?.followers?.total ?? 0)} total`} color="amber" />
            <KpiCard icon={Activity} label="Responses" value={fmt(kpis?.responses?.value ?? 0)} change={kpis?.responses?.change} color="purple" />
            <KpiCard icon={DollarSign} label="Revenue" value={fmtMoney(kpis?.revenue?.value ?? 0)} change={kpis?.revenue?.change} subtext={`${fmtMoney(kpis?.revenue?.pending ?? 0)} pending`} color="emerald" />
            <KpiCard icon={Layers} label="Content" value={`${kpis?.content?.totalVideos ?? 0} videos`} subtext={`${kpis?.content?.totalPolls ?? 0} polls`} color="cyan" />
          </div>

          {/* Views & Revenue Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-500" />Views Over Time</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTimeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={4} />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip {...tooltipStyle} />
                      <Area type="monotone" dataKey="views" stroke="#f97316" fill="#f9731644" strokeWidth={2} name="Views" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" />Daily Revenue</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyTimeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={4} />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Timeline + Top Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" />Engagement Timeline</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyTimeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={4} />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="likes" stroke="#ef4444" strokeWidth={2} dot={false} name="Likes" />
                      <Line type="monotone" dataKey="comments" stroke="#3b82f6" strokeWidth={2} dot={false} name="Comments" />
                      <Line type="monotone" dataKey="followers" stroke="#f59e0b" strokeWidth={2} dot={false} name="New Followers" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Performing Content */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" />Top Content</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {((overview?.topVideos as Array<Record<string, unknown>>) || []).slice(0, 5).map((v, i) => {
                    const views = v.views as number;
                    const maxViews = ((overview?.topVideos as Array<Record<string, number>>)?.[0]?.views) || 1;
                    return (
                      <div key={v.id as string} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{v.title as string}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted-foreground">{fmt(views)} views</span>
                            <span className="text-xs text-muted-foreground">{v.likes as number} likes</span>
                            <span className="text-xs text-muted-foreground">{v.comments as number} comments</span>
                          </div>
                        </div>
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden shrink-0">
                          <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full" style={{ width: `${(views / maxViews) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reactions Breakdown */}
          {(overview?.reactions as Array<Record<string, number>>)?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-pink-500" />Reaction Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(overview?.reactions as Array<Record<string, number>>).map((r) => ({ type: r.type.charAt(0).toUpperCase() + r.type.slice(1), count: r.count }))} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="type" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={60} />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {((overview?.reactions as Array<unknown>) || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trust Score Summary Card */}
          {pollsData && (
            <Card className="border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/80 to-amber-50/50 dark:from-emerald-950/20 dark:to-amber-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Poll Trust Summary
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">FOR BUSINESS</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: 'Total Polls', value: (pollsData.summary as Record<string, number>)?.totalPolls ?? 0 },
                    { label: 'Total Votes', value: fmt((pollsData.summary as Record<string, number>)?.totalVotes ?? 0) },
                    { label: 'Avg Trust Score', value: `${(pollsData.summary as Record<string, number>)?.avgTrustScore ?? 0}/100` },
                    { label: 'High Trust (A)', value: (pollsData.summary as Record<string, number>)?.highTrustPolls ?? 0 },
                    { label: 'Avg Engagement', value: `${(pollsData.summary as Record<string, number>)?.avgEngagementRate ?? 0}%` },
                  ].map((s, i) => (
                    <div key={i} className="text-center p-3 rounded-lg bg-background/50">
                      <p className="text-lg font-bold">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 2: ENGAGEMENT — Detailed engagement metrics
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="engagement" className="space-y-6">
          {engagementData && (
            <>
              {/* Engagement KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={Eye} label="Views" value={fmt((engagementData.summary as any)?.views?.value ?? 0)} change={(engagementData.summary as any)?.views?.change} color="orange" />
                <KpiCard icon={Heart} label="Likes" value={fmt((engagementData.summary as any)?.likes?.value ?? 0)} color="red" />
                <KpiCard icon={Vote} label="Votes" value={fmt((engagementData.summary as any)?.votes?.value ?? 0)} change={(engagementData.summary as any)?.votes?.change} color="purple" />
                <KpiCard icon={Percent} label="Eng. Rate" value={`${(engagementData.summary as any)?.overallEngagementRate ?? 0}%`} color="emerald" />
              </div>

              {/* Funnel */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Filter className="w-4 h-4 text-cyan-500" />Engagement Funnel</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: 'Views', value: (engagementData.funnel as any)?.views ?? 0, color: 'from-orange-400 to-orange-500', icon: Eye },
                      { label: 'Engaged (Like/Comment/React)', value: (engagementData.funnel as any)?.engaged ?? 0, color: 'from-blue-400 to-blue-500', icon: Heart },
                      { label: 'Voted', value: (engagementData.funnel as any)?.voted ?? 0, color: 'from-purple-400 to-purple-500', icon: Vote },
                      { label: 'Saved', value: (engagementData.funnel as any)?.saved ?? 0, color: 'from-amber-400 to-amber-500', icon: Star },
                      { label: 'Reposted', value: (engagementData.funnel as any)?.reposted ?? 0, color: 'from-emerald-400 to-emerald-500', icon: RefreshCw },
                    ].map((step, i) => {
                      const maxVal = (engagementData.funnel as any)?.views ?? 1;
                      const pctWidth = (step.value / maxVal) * 100;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2"><step.icon className="w-4 h-4 text-muted-foreground" /><span className="font-medium">{step.label}</span></div>
                            <div className="flex items-center gap-2"><span className="font-bold">{fmt(step.value)}</span><span className="text-xs text-muted-foreground">{maxVal > 0 ? (step.value / maxVal * 100).toFixed(1) : 0}%</span></div>
                          </div>
                          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${step.color} rounded-full transition-all duration-700`} style={{ width: `${pctWidth}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Engagement Trend + Hourly */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" />Engagement Rate Trend</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={engagementData.engagementTrend as Array<Record<string, number>>}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={4} />
                          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                          <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Engagement Rate']} />
                          <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} dot={false} name="Eng. Rate %" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-purple-500" />Peak Engagement Hours</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={engagementData.hourlyEngagement as Array<Record<string, number>>}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={2} />
                          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip {...tooltipStyle} />
                          <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Interactions" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Peak Times + Reactions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" />Best Times to Post</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-center">
                        <Clock className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                        <p className="text-lg font-bold">{(engagementData.peakTimes as any)?.hour?.label}</p>
                        <p className="text-xs text-muted-foreground">Peak Hour</p>
                      </div>
                      <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-center">
                        <Activity className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                        <p className="text-lg font-bold">{(engagementData.peakTimes as any)?.day?.label}</p>
                        <p className="text-xs text-muted-foreground">Peak Day</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-pink-500" />Reaction Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={Object.entries((engagementData.reactions as any)?.breakdown || {}).map(([type, count]) => ({ name: type.charAt(0).toUpperCase() + type.slice(1), value: count }))} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                            {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                          </Pie>
                          <Tooltip {...tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 3: CONTENT — Content performance table
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="content" className="space-y-6">
          {/* Summary */}
          {contentData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-center">
                  <Layers className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                  <p className="text-xl font-bold">{(contentData.summary as Record<string, number>)?.leadCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Lead Clips</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-center">
                  <MessageCircle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <p className="text-xl font-bold">{(contentData.summary as Record<string, number>)?.responseCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Responses</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-center">
                  <Eye className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <p className="text-xl font-bold">{fmt(((contentData.content as Array<Record<string, number>>) || []).reduce((s: number, v: Record<string, number>) => s + (v.views || 0), 0))}</p>
                  <p className="text-xs text-muted-foreground">Total Views</p>
                </div>
                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-center">
                  <Percent className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <p className="text-xl font-bold">{((contentData.content as Array<Record<string, number>>) || []).length > 0 ? (((contentData.content as Array<Record<string, number>>).reduce((s, v) => s + (v.engagementRate || 0), 0) / (contentData.content as Array<unknown>).length)).toFixed(1) : 0}%</p>
                  <p className="text-xs text-muted-foreground">Avg Eng. Rate</p>
                </div>
              </div>

              {/* Search */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search content..." value={contentSearch} onChange={(e) => setContentSearch(e.target.value)} className="pl-9" />
                </div>
              </div>

              {/* Content Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Content</th>
                          <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Views</th>
                          <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Likes</th>
                          <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Comments</th>
                          <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Eng. Rate</th>
                          <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Poll Votes</th>
                          <th className="text-center p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((contentData.content as Array<Record<string, unknown>>) || [])
                          .filter((v: any) => !contentSearch || (v.title || '').toLowerCase().includes(contentSearch.toLowerCase()))
                          .slice(0, 20)
                          .map((v: any) => (
                            <tr key={v.id} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="p-3 max-w-[200px]">
                                <p className="font-medium truncate">{v.title}</p>
                                <p className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleDateString()}</p>
                              </td>
                              <td className="p-3 text-right font-semibold">{fmt(v.views)}</td>
                              <td className="p-3 text-right">{v.likes}</td>
                              <td className="p-3 text-right">{v.comments}</td>
                              <td className="p-3 text-right">
                                <span className={`font-semibold ${v.engagementRate > 10 ? 'text-emerald-500' : v.engagementRate > 5 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                  {v.engagementRate.toFixed(1)}%
                                </span>
                              </td>
                              <td className="p-3 text-right">{v.poll?.totalVotes ?? '—'}</td>
                              <td className="p-3 text-center">
                                <Badge variant={v.type === 'lead' ? 'default' : 'secondary'} className={`text-[10px] ${v.type === 'lead' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0' : ''}`}>
                                  {v.type}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 4: AUDIENCE — Demographics & growth
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="audience" className="space-y-6">
          {audienceData && (
            <>
              {/* Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-center">
                  <Users className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                  <p className="text-xl font-bold">{fmt((audienceData.overview as Record<string, number>)?.totalFollowers ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-center">
                  <Heart className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <p className="text-xl font-bold">{fmt((audienceData.overview as Record<string, number>)?.totalEngagers ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">Active Engagers</p>
                </div>
                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-center">
                  <Vote className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <p className="text-xl font-bold">{fmt((audienceData.overview as Record<string, number>)?.totalVoters ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">Poll Voters</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <p className="text-xl font-bold">{(audienceData.overview as Record<string, number>)?.verifiedVoterRatio ?? 0}%</p>
                  <p className="text-xs text-muted-foreground">Verified Voter Ratio</p>
                </div>
              </div>

              {/* Demographics Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Age Range */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-orange-500" />Age Distribution (Followers)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={(audienceData.followers as any)?.byAgeRange || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="value" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip {...tooltipStyle} />
                          <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} name="Followers" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Gender */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-amber-500" />Gender Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={((audienceData.followers as any)?.byGender || []).map((d: any) => ({ name: (d.value || '').charAt(0).toUpperCase() + (d.value || '').slice(1).replace(/-/g, ' '), value: d.count }))} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                            {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                          </Pie>
                          <Tooltip {...tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Locations + Top Interests */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-cyan-500" />Top Locations (Voters)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {((audienceData.voters as any)?.byLocation || []).slice(0, 10).map((loc: any, i: number) => {
                        const maxCount = ((audienceData.voters as any)?.byLocation || [])[0]?.count || 1;
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                            <span className="text-sm flex-1 truncate">{loc.value}</span>
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full" style={{ width: `${(loc.count / maxCount) * 100}%` }} /></div>
                            <span className="text-xs font-semibold w-8 text-right">{loc.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />Top Interests (Followers)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                      {((audienceData.followers as any)?.topInterests || []).map((item: any, i: number) => (
                        <Badge key={i} variant="outline" className="px-3 py-1 text-xs capitalize">
                          {item.name} <span className="ml-1 opacity-60">({item.count})</span>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Follower Growth */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" />Follower Growth (30 Days)</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={audienceData.followerGrowth as Array<Record<string, number>>}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={4} />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip {...tooltipStyle} />
                        <Area type="monotone" dataKey="newFollowers" stroke="#10b981" fill="#10b98144" strokeWidth={2} name="New Followers" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 5: REVENUE — Business monetization analytics
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="revenue" className="space-y-6">
          {revenueData && (
            <>
              {/* Revenue KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={DollarSign} label="This Month" value={fmtMoney((revenueData.summary as Record<string, number>)?.thisMonth ?? 0)} change={(revenueData.summary as Record<string, number>)?.change} color="emerald" />
                <KpiCard icon={Clock} label="Last Month" value={fmtMoney((revenueData.summary as Record<string, number>)?.lastMonth ?? 0)} color="amber" />
                <KpiCard icon={TrendingUp} label="Total Earnings" value={fmtMoney((revenueData.summary as Record<string, number>)?.total ?? 0)} color="emerald" />
                <KpiCard icon={Clock} label="Pending" value={fmtMoney((revenueData.summary as Record<string, number>)?.pending ?? 0)} color="orange" />
              </div>

              {/* Revenue Trend */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" />Monthly Revenue Trend</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData.monthlyRevenue as Array<Record<string, number>>}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                        <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b98144" strokeWidth={2} name="Revenue" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Breakdown + Subscriptions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-purple-500" />Revenue Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={((revenueData.revenueByType as any) || []).map((r: any) => ({ name: (r.type || '').charAt(0).toUpperCase() + (r.type || '').slice(1), value: r.amount }))} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                            {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                          </Pie>
                          <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toFixed(2)}`]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-cyan-500" />Subscriptions</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/30">
                        <p className="text-lg font-bold">{(revenueData.subscriptions as Record<string, number>)?.activeCount ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground">Active</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                        <p className="text-lg font-bold">{fmtMoney((revenueData.subscriptions as Record<string, number>)?.thisMonthRevenue ?? 0)}</p>
                        <p className="text-[10px] text-muted-foreground">This Month</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                        <p className="text-lg font-bold">{fmtMoney((revenueData.subscriptions as Record<string, number>)?.totalRevenue ?? 0)}</p>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {((revenueData.subscriptions as any)?.recentSubscribers || []).slice(0, 5).map((sub: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                          <div>
                            <p className="text-sm font-medium">{sub.displayName || sub.username}</p>
                            <p className="text-xs text-muted-foreground">@{sub.username} · {sub.tier}</p>
                          </div>
                          <span className="text-xs font-semibold text-emerald-500">${sub.amount}/mo</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Paid Polls Performance */}
              {((revenueData.paidPolls as Array<unknown>) || []).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-orange-500" />Paid Poll Performance</CardTitle>
                    <CardDescription>ROI and conversion metrics for paid polls</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-2 text-xs uppercase text-muted-foreground">Poll</th>
                            <th className="text-right p-2 text-xs uppercase text-muted-foreground">Budget</th>
                            <th className="text-right p-2 text-xs uppercase text-muted-foreground">Spent</th>
                            <th className="text-right p-2 text-xs uppercase text-muted-foreground">Responses</th>
                            <th className="text-right p-2 text-xs uppercase text-muted-foreground">Conv. Rate</th>
                            <th className="text-center p-2 text-xs uppercase text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {((revenueData.paidPolls as any[]) || []).map((p: any) => (
                            <tr key={p.id} className="border-b hover:bg-muted/30">
                              <td className="p-2 max-w-[200px] truncate font-medium">{p.question}</td>
                              <td className="p-2 text-right">{fmtMoney(p.totalRewardPool)}</td>
                              <td className="p-2 text-right font-semibold text-orange-500">{fmtMoney(p.spentToDate)}</td>
                              <td className="p-2 text-right">{p.totalResponses}</td>
                              <td className="p-2 text-right">{p.conversionRate}%</td>
                              <td className="p-2 text-center">
                                <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className={`text-[10px] ${p.status === 'active' ? 'bg-emerald-500 text-white border-0' : 'bg-muted'}`}>
                                  {p.status as string}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════
            TAB 6: POLL TRUST — Business-grade reliability scoring
            ═══════════════════════════════════════════════════════ */}
        <TabsContent value="polls" className="space-y-6">
          {pollsData && (
            <>
              {/* Summary + Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">{(pollsData.summary as Record<string, number>)?.avgTrustScore ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Avg Trust Score</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-center">
                    <Award className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">{(pollsData.summary as Record<string, number>)?.highTrustPolls ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">High Trust (A Grade)</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-center">
                    <BarChart3 className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">{(pollsData.summary as Record<string, number>)?.totalPolls ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Total Polls</p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-center">
                    <Vote className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">{fmt((pollsData.summary as Record<string, number>)?.totalVotes ?? 0)}</p>
                    <p className="text-[10px] text-muted-foreground">Total Votes</p>
                  </div>
                </div>
                <div className="flex gap-1 bg-muted rounded-full p-1">
                  {[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'closed', label: 'Closed' }].map((s) => (
                    <Button key={s.value} variant={pollStatus === s.value ? 'default' : 'ghost'} size="sm" className={`rounded-full text-xs h-7 px-3 ${pollStatus === s.value ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' : ''}`} onClick={() => setPollStatus(s.value)}>
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Trust Distribution */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-emerald-500" />Trust Grade Distribution</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(pollsData.trustDistribution as Array<Record<string, number>>) || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="grade" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Polls">
                          {((pollsData.trustDistribution as Array<unknown>) || []).map((_, i) => <Cell key={i} fill={['#10b981', '#10b981', '#f59e0b', '#f97316', '#ef4444'][i] || '#94a3b8'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Individual Poll Trust Cards */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Shield className="w-5 h-5 text-orange-500" />Individual Poll Trust Scores</h3>
                {((pollsData.polls as any[]) || []).map((poll: any) => {
                  const trust = poll.trust || {};
                  const trustColor = TRUST_COLORS[trust.color] || TRUST_COLORS.red;
                  const components = trust.components || {};
                  return (
                    <Card key={poll.id as string} className={`${trustColor.bg} border ${trustColor.border}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          {/* Trust Score Circle */}
                          <div className="flex items-center gap-4 shrink-0">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${trustColor.border}`} style={{ borderColor: trustColor.fill }}>
                              <div className="text-center">
                                <p className="text-xl font-bold" style={{ color: trustColor.fill }}>{trust.score}</p>
                                <p className="text-[10px] font-semibold" style={{ color: trustColor.fill }}>Grade {trust.grade}</p>
                              </div>
                            </div>
                          </div>

                          {/* Poll Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold truncate">{poll.question}</p>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  <span className="text-xs text-muted-foreground"><Vote className="w-3 h-3 inline mr-1" />{poll.totalVotes} votes</span>
                                  <span className="text-xs text-muted-foreground"><Eye className="w-3 h-3 inline mr-1" />{fmt(poll.videoViews)} views</span>
                                  <span className="text-xs text-muted-foreground"><Percent className="w-3 h-3 inline mr-1" />{poll.engagementRate.toFixed(1)}% eng.</span>
                                  <Badge variant="outline" className={`text-[10px] ${poll.status === 'active' ? 'border-emerald-300 text-emerald-600' : 'border-muted text-muted-foreground'}`}>
                                    {poll.status === 'active' ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                                    {poll.status}
                                  </Badge>
                                  {poll.isPaid && <Badge className="bg-amber-100 text-amber-700 text-[10px] border-0">PAID</Badge>}
                                </div>
                              </div>
                            </div>

                            {/* Trust Components */}
                            <div className="grid grid-cols-4 gap-2 mt-3">
                              {[
                                { label: 'Sample Size', value: components?.sample ?? 0, max: 25 },
                                { label: 'Voter Quality', value: components?.quality ?? 0, max: 25 },
                                { label: 'Diversity', value: components?.diversity ?? 0, max: 25 },
                                { label: 'Velocity', value: components?.velocity ?? 0, max: 25 },
                              ].map((c, i) => (
                                <div key={i}>
                                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                                    <span className="text-muted-foreground">{c.label}</span>
                                    <span className="font-semibold">{c.value}/{c.max}</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(c.value / c.max) * 100}%`, backgroundColor: trustColor.fill }} />
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Stats row */}
                            <div className="flex items-center gap-4 mt-3 flex-wrap">
                              <div className="text-xs">
                                <span className="text-muted-foreground">Confidence: </span>
                                <span className="font-semibold">{trust.confidence}</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-muted-foreground">Verified: </span>
                                <span className="font-semibold">{poll.voters?.verifiedRatio ?? 0}%</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-muted-foreground">Avg Voter Score: </span>
                                <span className="font-semibold">{poll.voters?.avgScore ?? 0}</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-muted-foreground">Locations: </span>
                                <span className="font-semibold">{poll.voters?.uniqueLocations ?? 0}</span>
                              </div>
                            </div>

                            {/* Bias Indicators */}
                            {((trust.biasIndicators as string[]) || []).length > 0 && (
                              <div className="mt-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                                <div className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                                  <Info className="w-3 h-3" />Bias Indicators
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {(trust.biasIndicators as string[]).map((b, i) => (
                                    <Badge key={i} variant="outline" className="text-[10px] border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300">{b}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* No bias - clean indicator */}
                            {((trust.biasIndicators as string[]) || []).length === 0 && (poll.totalVotes as number) >= 10 && (
                              <div className="mt-3 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30">
                                <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3" />No bias indicators detected — results appear reliable
                                </div>
                              </div>
                            )}

                            {/* Leading Option */}
                            {(poll.leadingOption) && (
                              <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                                <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                                <span className="text-xs"><span className="font-semibold">Leading: </span>{poll.leadingOption?.text} ({poll.leadingOption?.percentage}%)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  Clock,
  Zap,
  Trophy,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Activity,
  Lightbulb,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  Cell,
} from 'recharts';

const CHART_COLORS = ['#f97316', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981'];
const CHART_COLORS_ALPHA = ['#f9731666', '#f59e0b66', '#ef444466', '#8b5cf666', '#06b6d466', '#10b98166'];

interface PollAnalyticsProps {
  pollId: string;
}

interface AnalyticsData {
  poll: {
    id: string;
    question: string;
    totalVotes: number;
    isPaid: boolean;
    closesAt: string | null;
    isClosed: boolean;
    timeRemaining: number | null;
    createdAt: string;
  };
  video: { title: string; viewCount: number; status: string };
  distribution: Array<{ id: string; text: string; votes: number; percentage: number }>;
  timeline: Array<{ date: string; totalVotes: number; options: Array<{ id: string; text: string; votes: number }> }>;
  hourlyActivity: Array<{ hour: number; label: string; votes: number }>;
  engagement: { totalVotes: number; views: number; engagementRate: number; votesPerHour: number; votesPerDay: number; pollAgeDays: number };
  comparison: { leadingOption: { id: string; text: string; votes: number; percentage: number } | null; trailingOption: { id: string; text: string; votes: number; percentage: number } | null; margin: number };
  voters: { uniqueVoters: number; avgMemberScore: number; verifiedCount: number; newAccountCount: number; scoreDistribution: Array<{ range: string; count: number }> };
  velocity: { last24h: number; prev24h: number; changePercent: number };
  timing: { timeToFirstVote: number | null; firstVoteDate: string | null };
  insights: string[];
}

export function PollAnalytics({ pollId }: PollAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(true);
  const [showVoterDemo, setShowVoterDemo] = useState(false);
  const [showHourly, setShowHourly] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/polls/${pollId}/analytics`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error || 'Failed to load analytics');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [pollId]);

  const handleExportCSV = () => {
    if (!data) return;

    const headers = ['Metric', 'Value'];
    const rows = [
      ['Poll Question', data.poll.question],
      ['Total Votes', String(data.engagement.totalVotes)],
      ['Views', String(data.engagement.views)],
      ['Engagement Rate', `${data.engagement.engagementRate.toFixed(2)}%`],
      ['Votes/Hour', data.engagement.votesPerHour.toFixed(2)],
      ['Votes/Day', data.engagement.votesPerDay.toFixed(2)],
      ['Poll Age (Days)', String(data.engagement.pollAgeDays)],
      ['', ''],
      ['Option', 'Votes', 'Percentage'],
      ...data.distribution.map((d) => [d.text, String(d.votes), `${d.percentage.toFixed(1)}%`]),
      ['', ''],
      ['Unique Voters', String(data.voters.uniqueVoters)],
      ['Avg Voter Score', data.voters.avgMemberScore.toFixed(0)],
      ['Verified Voters', String(data.voters.verifiedCount)],
      ['New Account Voters', String(data.voters.newAccountCount)],
      ['', ''],
      ['Last 24h Votes', String(data.velocity.last24h)],
      ['Previous 24h Votes', String(data.velocity.prev24h)],
      ['Velocity Change', `${data.velocity.changePercent.toFixed(1)}%`],
    ];

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poll-analytics-${pollId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          <span className="text-sm font-medium">Loading analytics...</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
        <p className="text-sm text-muted-foreground">{error || 'Analytics unavailable'}</p>
      </div>
    );
  }

  const VelocityIcon = data.velocity.changePercent > 5 ? ArrowUpRight : data.velocity.changePercent < -5 ? ArrowDownRight : Minus;
  const velocityColor = data.velocity.changePercent > 5 ? 'text-emerald-500' : data.velocity.changePercent < -5 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-orange-500" />
          Poll Analytics
        </h2>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* ── Overview KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={Target}
          label="Total Votes"
          value={data.engagement.totalVotes.toLocaleString()}
          subtext={`${data.engagement.votesPerDay.toFixed(1)}/day`}
          color="orange"
        />
        <KpiCard
          icon={Eye}
          label="Engagement Rate"
          value={`${data.engagement.engagementRate.toFixed(1)}%`}
          subtext={`of ${data.engagement.views} views`}
          color="blue"
        />
        <KpiCard
          icon={Zap}
          label="Last 24h"
          value={String(data.velocity.last24h)}
          subtext={
            <span className={`flex items-center gap-0.5 ${velocityColor}`}>
              <VelocityIcon className="w-3 h-3" />
              {Math.abs(data.velocity.changePercent).toFixed(0)}% vs prev
            </span>
          }
          color={data.velocity.changePercent > 0 ? 'emerald' : 'red'}
        />
        <KpiCard
          icon={Clock}
          label="Poll Age"
          value={`${data.engagement.pollAgeDays}d`}
          subtext={data.poll.isClosed ? 'Closed' : data.poll.timeRemaining ? `${data.poll.timeRemaining}h left` : 'No deadline'}
          color="amber"
        />
      </div>

      {/* ── Vote Distribution (Bar Chart) ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart className="w-4 h-4 text-orange-500" />
            Vote Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.distribution} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="text" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'votes') return [value, 'Votes'];
                    return [`${value.toFixed(1)}%`, 'Percentage'];
                  }}
                />
                <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                  {data.distribution.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Option breakdown table */}
          <div className="mt-4 space-y-2">
            {data.distribution.map((opt, idx) => (
              <div key={opt.id} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                <span className="text-sm flex-1 truncate">{opt.text}</span>
                <div className="flex-1 max-w-[200px] h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${opt.percentage}%`, backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                  />
                </div>
                <span className="text-sm font-semibold w-12 text-right">{opt.votes}</span>
                <span className="text-xs text-muted-foreground w-12 text-right">{opt.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Vote Timeline (Stacked Area Chart) ── */}
      {data.timeline.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Vote Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeline} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  {data.distribution.map((opt, idx) => (
                    <Area
                      key={opt.id}
                      type="monotone"
                      dataKey={`options[${idx}].votes`}
                      stackId="1"
                      name={opt.text}
                      fill={CHART_COLORS_ALPHA[idx % CHART_COLORS_ALPHA.length]}
                      stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Engagement Metrics Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Leading vs Trailing */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Option Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.comparison.leadingOption && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{data.comparison.leadingOption.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.comparison.leadingOption.votes} votes · {data.comparison.leadingOption.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
            {data.comparison.trailingOption && data.comparison.trailingOption.id !== data.comparison.leadingOption?.id && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold shrink-0">
                  {data.distribution.length}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{data.comparison.trailingOption.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.comparison.trailingOption.votes} votes · {data.comparison.trailingOption.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-muted-foreground">Gap</span>
              <span className={`font-semibold ${data.comparison.margin > 50 ? 'text-orange-600' : data.comparison.margin < 10 ? 'text-red-500' : 'text-foreground'}`}>
                {data.comparison.margin.toFixed(1)} percentage points
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Voter Demographics */}
        <Card>
          <CardHeader className="pb-2">
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setShowVoterDemo(!showVoterDemo)}
            >
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Voter Demographics
              </CardTitle>
              {showVoterDemo ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </CardHeader>
          <CardContent className={showVoterDemo ? '' : 'hidden'}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold">{data.voters.uniqueVoters}</p>
                  <p className="text-[10px] text-muted-foreground">Unique Voters</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-lg font-bold">{data.voters.avgMemberScore.toFixed(0)}</p>
                  <p className="text-[10px] text-muted-foreground">Avg Score</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <div>
                    <p className="text-sm font-semibold">{data.voters.verifiedCount}</p>
                    <p className="text-[10px] text-muted-foreground">Verified</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-sm font-semibold">{data.voters.newAccountCount}</p>
                    <p className="text-[10px] text-muted-foreground">New Users</p>
                  </div>
                </div>
              </div>
              {/* Score Distribution mini chart */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Score Distribution</p>
                {data.voters.scoreDistribution.map((bucket, idx) => {
                  const maxCount = Math.max(...data.voters.scoreDistribution.map((b) => b.count), 1);
                  return (
                    <div key={bucket.range} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-16 shrink-0">{bucket.range}</span>
                      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(bucket.count / maxCount) * 100}%`,
                            backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold w-6 text-right">{bucket.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
          <CardContent className={showVoterDemo ? 'hidden' : ''}>
            <p className="text-xs text-muted-foreground text-center py-2">Click to expand voter demographics</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Hourly Activity (Collapsible) ── */}
      <Card>
        <CardHeader className="pb-2">
          <button
            className="flex items-center justify-between w-full text-left"
            onClick={() => setShowHourly(!showHourly)}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Hourly Voting Activity
            </CardTitle>
            {showHourly ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </CardHeader>
        {showHourly && (
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourlyActivity} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={2} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [value, 'Votes']}
                  />
                  <Bar dataKey="votes" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── AI Insights ── */}
      {data.insights.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800/40 bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10">
          <CardHeader className="pb-2">
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setShowInsights(!showInsights)}
            >
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-orange-500" />
                Key Insights
                <Badge variant="secondary" className="text-[10px]">{data.insights.length}</Badge>
              </CardTitle>
              {showInsights ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </CardHeader>
          {showInsights && (
            <CardContent>
              <ul className="space-y-2">
                {data.insights.map((insight, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{insight}</span>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── KPI Card Component ────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext: React.ReactNode;
  color: 'orange' | 'blue' | 'emerald' | 'red' | 'amber';
}) {
  const colorMap = {
    orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', icon: 'text-orange-500', border: 'border-orange-200 dark:border-orange-800/40' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', icon: 'text-blue-500', border: 'border-blue-200 dark:border-blue-800/40' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: 'text-emerald-500', border: 'border-emerald-200 dark:border-emerald-800/40' },
    red: { bg: 'bg-red-50 dark:bg-red-950/30', icon: 'text-red-500', border: 'border-red-200 dark:border-red-800/40' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', icon: 'text-amber-500', border: 'border-amber-200 dark:border-amber-800/40' },
  };

  const c = colorMap[color];

  return (
    <Card className={`${c.bg} border ${c.border}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${c.icon}`} />
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{subtext}</p>
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { QuickNav } from '@/components/quick-nav';
import {
  ArrowLeft,
  BarChart3,
  Users,
  UserPlus,
  TrendingUp,
  Loader2,
  MapPin,
  Tag,
  RefreshCw,
} from 'lucide-react';

interface ViewProps {
  onNavigate: (view: string) => void;
}

interface InsightsData {
  totalUsers: number;
  totalWithProfile: number;
  percentageWithProfile: number;
  avgScore: number;
  distributions: {
    byAgeRange: { value: string; count: number }[];
    byGender: { value: string; count: number }[];
    byLocation: { value: string; count: number }[];
    byLanguage: { value: string; count: number }[];
    byScoreRange: { range: string; count: number }[];
  };
  topInterests: { name: string; count: number }[];
}

const staggerContainer = { animate: { transition: { staggerChildren: 0.06 } } };
const staggerItem = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const AGE_COLORS = [
  'bg-orange-500',
  'bg-orange-400',
  'bg-amber-500',
  'bg-amber-400',
  'bg-yellow-500',
];

const GENDER_COLORS: Record<string, { bg: string; text: string; iconBg: string }> = {
  male: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', iconBg: 'bg-orange-500' },
  female: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', iconBg: 'bg-amber-500' },
  'non-binary': { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', iconBg: 'bg-yellow-500' },
  'prefer-not-to-say': { bg: 'bg-stone-100 dark:bg-stone-900/40', text: 'text-stone-700 dark:text-stone-300', iconBg: 'bg-stone-500' },
};

export function AudienceInsightsView({ onNavigate }: ViewProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audience/insights', {
        headers: { 'X-User-Id': currentUser?.id || '' },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        toast({
          title: 'Failed to load insights',
          description: json.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Network error',
        description: 'Could not fetch audience insights',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, toast]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm text-muted-foreground">Loading audience insights...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <BarChart3 className="w-12 h-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No audience data available yet.</p>
          <Button variant="outline" onClick={fetchInsights} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const totalInDistributions = data.distributions.byAgeRange.reduce((s, d) => s + d.count, 0);
  const maxAgeCount = Math.max(...data.distributions.byAgeRange.map((d) => d.count), 1);
  const maxLocationCount = Math.max(...data.distributions.byLocation.map((d) => d.count), 1);
  const maxScoreCount = Math.max(...data.distributions.byScoreRange.map((d) => d.count), 1);
  const maxInterestCount = data.topInterests.length > 0 ? data.topInterests[0].count : 1;

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="min-h-screen px-4 py-8 max-w-5xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Dashboard</span>
        </Button>
      </motion.div>

      <motion.div variants={staggerItem} className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Audience Insights</h1>
            <p className="text-sm text-muted-foreground">Platform-wide demographics & engagement</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInsights} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </motion.div>

      <QuickNav onNavigate={onNavigate} activeView="audience" />

      {/* Overview Stats */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card className="bg-orange-50 dark:bg-orange-950/50 border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Users</p>
                <p className="text-xl font-bold">{data.totalUsers.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card className="bg-amber-50 dark:bg-amber-950/50 border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profiled Users</p>
                <p className="text-xl font-bold">{data.percentageWithProfile}%</p>
                <p className="text-xs text-muted-foreground">{data.totalWithProfile.toLocaleString()} with data</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card className="bg-emerald-50 dark:bg-emerald-950/50 border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Member Score</p>
                <p className="text-xl font-bold">{data.avgScore.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Age Distribution */}
      <motion.div variants={staggerItem} className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Age Distribution</CardTitle>
            <CardDescription>User breakdown by age range</CardDescription>
          </CardHeader>
          <CardContent>
            {data.distributions.byAgeRange.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No age data available</p>
            ) : (
              <div className="space-y-3">
                {data.distributions.byAgeRange.map((item, idx) => {
                  const pct = totalInDistributions > 0 ? Math.round((item.count / totalInDistributions) * 100) : 0;
                  const barWidth = (item.count / maxAgeCount) * 100;
                  return (
                    <div key={item.value} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-12 shrink-0">{item.value}</span>
                      <div className="flex-1 h-7 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.05 }}
                          className={`h-full rounded-full ${AGE_COLORS[idx % AGE_COLORS.length]}`}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{item.count}</span>
                      <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Gender Distribution */}
      <motion.div variants={staggerItem} className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gender Distribution</CardTitle>
            <CardDescription>User breakdown by gender identity</CardDescription>
          </CardHeader>
          <CardContent>
            {data.distributions.byGender.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No gender data available</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.distributions.byGender.map((item) => {
                  const total = data.distributions.byGender.reduce((s, d) => s + d.count, 0);
                  const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                  const colors = GENDER_COLORS[item.value] || GENDER_COLORS['prefer-not-to-say'];
                  return (
                    <motion.div
                      key={item.value}
                      whileHover={{ scale: 1.03 }}
                      className={`${colors.bg} rounded-xl p-4 flex flex-col items-center gap-2 transition-shadow hover:shadow-md`}
                    >
                      <div className={`w-10 h-10 rounded-full ${colors.iconBg} flex items-center justify-center`}>
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-sm font-semibold capitalize ${colors.text}`}>
                        {item.value.replace(/-/g, ' ')}
                      </span>
                      <Badge variant="secondary" className="text-xs">{item.count} users</Badge>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Locations */}
      <motion.div variants={staggerItem} className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" />
              Top Locations
            </CardTitle>
            <CardDescription>Most common user locations</CardDescription>
          </CardHeader>
          <CardContent>
            {data.distributions.byLocation.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No location data available</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {data.distributions.byLocation.map((item, idx) => {
                  const barWidth = (item.count / maxLocationCount) * 100;
                  return (
                    <div key={item.value} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-6 shrink-0">
                        <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-orange-500" />
                      </div>
                      <span className="text-sm font-medium flex-1 truncate">{item.value}</span>
                      <div className="w-32 h-5 bg-muted rounded-full overflow-hidden hidden sm:block">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.04 }}
                          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400"
                        />
                      </div>
                      <span className="text-sm font-semibold w-10 text-right">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Interests */}
      <motion.div variants={staggerItem} className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-500" />
              Top Interests
            </CardTitle>
            <CardDescription>Most popular interests across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topInterests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No interest data available</p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto">
                {data.topInterests.map((interest, idx) => {
                  const intensity = interest.count / maxInterestCount;
                  const colorClass =
                    intensity > 0.75
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200 border-orange-300 dark:border-orange-700'
                      : intensity > 0.5
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                        : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
                  return (
                    <motion.div
                      key={interest.name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: idx * 0.02 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Badge
                        variant="outline"
                        className={`px-3 py-1.5 text-sm font-medium cursor-default ${colorClass}`}
                      >
                        <span className="capitalize">{interest.name}</span>
                        <span className="ml-1.5 opacity-70">({interest.count})</span>
                      </Badge>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Score Range Distribution */}
      <motion.div variants={staggerItem} className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Score Range Distribution
            </CardTitle>
            <CardDescription>User count across member score ranges</CardDescription>
          </CardHeader>
          <CardContent>
            {data.distributions.byScoreRange.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No score data available</p>
            ) : (
              <div className="space-y-3">
                {data.distributions.byScoreRange.map((item, idx) => {
                  const barWidth = (item.count / maxScoreCount) * 100;
                  const total = data.distributions.byScoreRange.reduce((s, d) => s + d.count, 0);
                  const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                  const gradientClass =
                    idx === 0
                      ? 'bg-stone-400'
                      : idx === 1
                        ? 'bg-amber-400'
                        : idx === 2
                          ? 'bg-orange-400'
                          : idx === 3
                            ? 'bg-orange-500'
                            : 'bg-orange-600';
                  return (
                    <div key={item.range} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-16 shrink-0">{item.range}</span>
                      <div className="flex-1 h-7 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.06 }}
                          className={`h-full rounded-full ${gradientClass}`}
                        />
                      </div>
                      <span className="text-sm font-medium w-10 text-right">{item.count}</span>
                      <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

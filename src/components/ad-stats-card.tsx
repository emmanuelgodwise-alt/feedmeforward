'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Eye,
  MousePointerClick,
  TrendingUp,
  DollarSign,
  Wallet,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Target,
} from 'lucide-react';
import type { AdCampaign } from '@/stores/ad-store';

interface AdStatsCardProps {
  campaign: AdCampaign;
  /** Optional trend data (e.g. previous period for comparison) */
  previousStats?: {
    impressions?: number;
    clicks?: number;
    spent?: number;
  };
  className?: string;
}

/** Calculate percentage change between current and previous values */
function getChange(current: number, previous: number | undefined): {
  value: number;
  direction: 'up' | 'down' | 'neutral';
} {
  if (!previous || previous === 0) return { value: 0, direction: 'neutral' };
  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(change),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
  };
}

function ChangeIndicator({ current, previous, className = '' }: {
  current: number;
  previous: number | undefined;
  className?: string;
}) {
  const { value, direction } = getChange(current, previous);
  if (direction === 'neutral' || value === 0) {
    return (
      <span className={`flex items-center gap-0.5 text-xs text-muted-foreground ${className}`}>
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  }
  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-medium ${
        direction === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      } ${className}`}
    >
      {direction === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {value.toFixed(1)}%
    </span>
  );
}

/** Mini sparkline rendered as a series of bars */
function MiniSparkline({ values, color = 'bg-emerald-500' }: { values: number[]; color?: string }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-px h-5">
      {values.slice(-7).map((v, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${(v / max) * 100}%` }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className={`w-1.5 rounded-sm ${color} opacity-70`}
        />
      ))}
    </div>
  );
}

function AdStatsCardComponent({ campaign, previousStats, className = '' }: AdStatsCardProps) {
  const ctr = campaign.impressions > 0
    ? ((campaign.clicks / campaign.impressions) * 100)
    : 0;
  const remaining = Math.max(0, campaign.totalBudget - campaign.spent);
  const budgetUtilization = campaign.totalBudget > 0
    ? Math.min(100, (campaign.spent / campaign.totalBudget) * 100)
    : 0;

  // Simulated trend data for sparkline (in a real app, this would come from the API)
  const sparklineData = campaign.impressions > 0
    ? Array.from({ length: 7 }, (_, i) =>
        Math.max(1, Math.floor((campaign.impressions / 7) * (0.5 + Math.random() * 0.8 + i * 0.05)))
      )
    : [];

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Card className={`overflow-hidden ${className}`}>
        {/* Header with gradient accent */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm font-semibold truncate">{campaign.title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {campaign.adType.replace('_', '-').toUpperCase()} &middot;{' '}
                {campaign.advertiser?.username || 'You'}
              </p>
            </div>
            <Badge className={`text-[10px] font-medium shrink-0 border-0 ${statusColors[campaign.status] || statusColors.draft}`}>
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Impressions */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    <ChangeIndicator current={campaign.impressions} previous={previousStats?.impressions} />
                  </div>
                  <p className="text-base font-bold leading-tight">
                    {campaign.impressions.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Impressions</p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Number of times your ad was displayed</TooltipContent>
            </Tooltip>

            {/* Clicks */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <MousePointerClick className="w-3.5 h-3.5 text-muted-foreground" />
                    <ChangeIndicator current={campaign.clicks} previous={previousStats?.clicks} />
                  </div>
                  <p className="text-base font-bold leading-tight">
                    {campaign.clicks.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Clicks</p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Number of times users clicked your ad</TooltipContent>
            </Tooltip>

            {/* CTR */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Target className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className={`text-xs font-medium ${ctr >= 2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                      {ctr >= 2 ? 'Good' : 'Avg'}
                    </span>
                  </div>
                  <p className="text-base font-bold leading-tight">
                    {ctr.toFixed(2)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">CTR</p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Click-through rate (clicks / impressions)</TooltipContent>
            </Tooltip>

            {/* Spent */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    <ChangeIndicator current={campaign.spent} previous={previousStats?.spent} />
                  </div>
                  <p className="text-base font-bold leading-tight">
                    ${campaign.spent.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Spent</p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Total amount spent on this campaign</TooltipContent>
            </Tooltip>

            {/* Remaining Budget */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-base font-bold leading-tight text-emerald-600 dark:text-emerald-400">
                    ${remaining.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Remaining</p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Budget remaining for this campaign</TooltipContent>
            </Tooltip>

            {/* Revenue / eCPM */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-base font-bold leading-tight">
                    {campaign.impressions > 0
                      ? `$${((campaign.spent / campaign.impressions) * 1000).toFixed(2)}`
                      : '$0.00'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">eCPM</p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Effective cost per 1,000 impressions</TooltipContent>
            </Tooltip>
          </div>

          {/* Budget Utilization Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Budget Utilization</span>
              <span className="font-medium">
                ${campaign.spent.toFixed(2)} / ${campaign.totalBudget.toFixed(2)}
              </span>
            </div>
            <div className="relative">
              <Progress
                value={budgetUtilization}
                className="h-2"
              />
              {/* Color overlay based on utilization */}
              <div
                className="absolute inset-0 h-2 rounded-full pointer-events-none"
                style={{
                  background: budgetUtilization > 80
                    ? 'linear-gradient(90deg, #10b981 0%, #f59e0b 80%, #ef4444 100%)'
                    : 'linear-gradient(90deg, #10b981, #14b8a6)',
                  clipPath: `inset(0 ${100 - budgetUtilization}% 0 0)`,
                }}
              />
            </div>
            {budgetUtilization > 80 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                {budgetUtilization >= 100
                  ? 'Budget fully spent'
                  : `Budget ${(100 - budgetUtilization).toFixed(0)}% remaining`}
              </p>
            )}
          </div>

          {/* Sparkline Trend */}
          {sparklineData.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                Impression trend (7 days)
              </span>
              <MiniSparkline values={sparklineData} />
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export const AdStatsCard = memo(AdStatsCardComponent);

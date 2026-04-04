'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  Wallet,
  Gift,
  Star,
  Target,
  Flame,
  Zap,
  CheckCircle2,
  ArrowRight,
  DollarSign,
  Award,
  Crown,
  Loader2,
} from 'lucide-react';
import { getScoreLevel, getScoreLevelBadge, getScoreLevelInfo, getNextLevelThreshold, getPreviousLevelThreshold } from '@/types';

interface RewardTransaction {
  id: string;
  amount: number;
  description: string | null;
  createdAt: string;
  referenceId: string | null;
}

interface ViewProps {
  onNavigate: (view: 'landing' | 'signup' | 'login' | 'dashboard' | 'schema' | 'explore' | 'create-lead' | 'create-response' | 'video-detail' | 'profile' | 'leaderboard' | 'wallet' | 'rewards') => void;
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export function RewardsView({ onNavigate }: ViewProps) {
  const { currentUser } = useAuthStore();
  const [rewardTransactions, setRewardTransactions] = useState<RewardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRewards, setTotalRewards] = useState(0);

  const fetchRewards = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch wallet transactions filtered by reward type
      const res = await fetch('/api/wallet/transactions', {
        headers: { 'X-User-Id': currentUser?.id || '' },
      });
      const json = await res.json();
      if (json.success && json.transactions) {
        const rewards = json.transactions.filter(
          (t: { type: string }) => t.type === 'reward' || t.type === 'earning'
        );
        setRewardTransactions(rewards);
        setTotalRewards(rewards.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0));
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      fetchRewards();
    }
  }, [currentUser, fetchRewards]);

  if (!currentUser) {
    return (
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="min-h-screen flex items-center justify-center px-4 py-12"
      >
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-md shadow-emerald-500/20">
              <Gift className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Rewards Center</CardTitle>
            <CardDescription>Sign in to track your rewards and earnings</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md"
              onClick={() => onNavigate('signup')}
            >
              Get Started Free
            </Button>
            <Button
              variant="outline"
              className="w-full bg-black hover:bg-gray-800 text-white"
              onClick={() => onNavigate('login')}
            >
              Sign In
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onNavigate('landing')}
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const level = getScoreLevel(currentUser.memberScore);
  const levelBadge = getScoreLevelBadge(level);
  const levelInfo = getScoreLevelInfo(level);
  const nextThreshold = getNextLevelThreshold(currentUser.memberScore);
  const prevThreshold = getPreviousLevelThreshold(currentUser.memberScore);

  const score = currentUser.memberScore;
  const progressToNext = nextThreshold
    ? Math.round(((score - prevThreshold) / (nextThreshold - prevThreshold)) * 100)
    : 100;

  const rewardTiers = [
    {
      icon: Star,
      label: 'Engagement Rewards',
      description: 'Earn points for creating videos, voting on polls, commenting, and liking content. Active participation is the foundation of your rewards.',
      maxPoints: 300,
      currentPoints: Math.min(score, 300),
      color: 'from-orange-400 to-amber-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/50',
      borderColor: 'border-orange-200 dark:border-orange-800/40',
    },
    {
      icon: Target,
      label: 'Quality Rewards',
      description: 'Higher quality content earns more points. Videos with more likes, responses, and positive engagement boost your quality score up to 400 points.',
      maxPoints: 400,
      currentPoints: Math.min(Math.max(score - 300, 0), 400),
      color: 'from-amber-400 to-yellow-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50',
      borderColor: 'border-amber-200 dark:border-amber-800/40',
    },
    {
      icon: Zap,
      label: 'Accuracy Rewards',
      description: 'Vote on polls and get rewarded when the majority agrees with your choice. Accurate voting earns up to 200 bonus points.',
      maxPoints: 200,
      currentPoints: Math.min(Math.max(score - 700, 0), 200),
      color: 'from-emerald-400 to-green-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
      borderColor: 'border-emerald-200 dark:border-emerald-800/40',
    },
    {
      icon: Flame,
      label: 'Streak Rewards',
      description: 'Maintain daily activity streaks for bonus points. Consistent engagement over consecutive days earns up to 100 streak points.',
      maxPoints: 100,
      currentPoints: Math.min(Math.max(score - 900, 0), 100),
      color: 'from-rose-400 to-red-500',
      bgColor: 'bg-rose-50 dark:bg-rose-950/50',
      borderColor: 'border-rose-200 dark:border-rose-800/40',
    },
  ];

  const milestones = [
    { score: 0, label: 'Bronze', icon: Award, unlocked: true, description: 'Welcome to FeedMeForward! Start engaging to earn rewards.' },
    { score: 200, label: 'Silver', icon: Star, unlocked: score >= 200, description: 'You\'re building momentum! Silver members gain visibility.' },
    { score: 500, label: 'Gold', icon: Crown, unlocked: score >= 500, description: 'Gold members get a verified badge and higher reward rates.' },
    { score: 750, label: 'Diamond', icon: CheckCircle2, unlocked: score >= 750, description: 'Elite status! Maximum rewards and community recognition.' },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="min-h-screen px-4 py-8 max-w-4xl mx-auto"
    >
      {/* Header */}
      <motion.div
        variants={staggerItem}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Gift className="w-6 h-6 text-orange-500" />
              <h1 className="text-2xl font-bold">Rewards Center</h1>
            </div>
            <p className="text-sm text-muted-foreground">Track your earnings, scores, and unlockable rewards</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('wallet')}
          className="gap-2"
        >
          <Wallet className="w-4 h-4" />
          Open Wallet
        </Button>
      </motion.div>

      {/* Score Overview Card */}
      <motion.div variants={staggerItem} className="mb-8">
        <Card className="border-2 border-orange-200 dark:border-orange-800/40 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Your Member Score</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-3xl font-bold text-white">{score.toLocaleString()}</span>
                  <Badge className={`${levelBadge.className} text-xs`}>{levelBadge.label}</Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-orange-100 text-sm">Next Level</p>
                <p className="text-white font-bold text-lg">
                  {nextThreshold ? `${nextThreshold} pts` : 'MAX'}
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{levelInfo.label} Level</span>
                <span className="font-medium">{progressToNext}% to next</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${levelInfo.gradient} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNext}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              {nextThreshold && (
                <p className="text-xs text-muted-foreground">
                  {nextThreshold - score} points until {milestones.find(m => m.score === nextThreshold)?.label} level
                </p>
              )}
            </div>

            {/* Wallet Balance */}
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <span className="text-sm text-muted-foreground">Wallet Balance</span>
              </div>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                ${currentUser.walletBalance.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reward Categories Grid */}
      <motion.div variants={staggerItem} className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          Reward Categories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewardTiers.map((tier) => (
            <motion.div
              key={tier.label}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Card className={`${tier.bgColor} border ${tier.borderColor} h-full`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tier.color} flex items-center justify-center shadow-sm`}>
                      <tier.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{tier.label}</CardTitle>
                      <p className="text-xs text-muted-foreground">Up to {tier.maxPoints} points</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{tier.description}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{tier.currentPoints}/{tier.maxPoints} pts</span>
                    </div>
                    <div className="w-full h-2 bg-background/50 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${tier.color} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((tier.currentPoints / tier.maxPoints) * 100, 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Milestones */}
      <motion.div variants={staggerItem} className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Milestone Levels
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {milestones.map((milestone) => (
            <motion.div
              key={milestone.label}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Card
                className={`h-full transition-all ${
                  milestone.unlocked
                    ? 'border-2 border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10'
                    : 'border border-border/50 bg-muted/30 opacity-60'
                }`}
              >
                <CardHeader className="text-center pb-3">
                  <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                    milestone.unlocked
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-orange-500/20'
                      : 'bg-muted'
                  }`}>
                    <milestone.icon className={`w-6 h-6 ${milestone.unlocked ? 'text-white' : 'text-muted-foreground'}`} />
                  </div>
                  <CardTitle className="text-base">{milestone.label}</CardTitle>
                  <p className="text-xs text-muted-foreground">{milestone.score} points</p>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{milestone.description}</p>
                  {milestone.unlocked ? (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Unlocked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <ArrowRight className="w-3 h-3 mr-1" />
                      {milestone.score - score} pts to go
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Total Rewards Earned */}
      <motion.div variants={staggerItem} className="mb-8">
        <Card className="border-2 border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/80 to-orange-50/50 dark:from-emerald-950/20 dark:to-orange-950/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Total Rewards Earned</CardTitle>
                <CardDescription>From poll responses, tips, and engagement bonuses</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                ${totalRewards.toFixed(2)}
              </span>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                {rewardTransactions.length} reward{rewardTransactions.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            ) : rewardTransactions.length === 0 ? (
              <div className="text-center py-6">
                <Gift className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No rewards earned yet. Start engaging with polls and content!</p>
                <Button
                  className="mt-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  onClick={() => onNavigate('explore')}
                >
                  Explore Polls
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {rewardTransactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                        <Star className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description || 'Reward'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      +${tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {rewardTransactions.length > 0 && (
            <CardFooter className="pt-0">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => onNavigate('wallet')}
              >
                View All Transactions
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardFooter>
          )}
        </Card>
      </motion.div>

      {/* How to Earn Section */}
      <motion.div variants={staggerItem} className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          How to Earn Rewards
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: Trophy,
              title: 'Create Lead Clips',
              desc: 'Post video polls and earn points based on engagement, likes, and responses from the community.',
              action: 'Start Creating',
              navigateTo: 'create-lead' as const,
            },
            {
              icon: Zap,
              title: 'Respond to Polls',
              desc: 'Vote on video polls and earn rewards. Paid polls offer direct wallet earnings for each response.',
              action: 'Explore Polls',
              navigateTo: 'explore' as const,
            },
            {
              icon: Flame,
              title: 'Daily Streaks',
              desc: 'Stay active every day to build your streak bonus. Consistent engagement multiplies your rewards.',
              action: 'View Leaderboard',
              navigateTo: 'leaderboard' as const,
            },
            {
              icon: Gift,
              title: 'Fund Polls',
              desc: 'Add funds to poll reward pools and earn recognition. Creators who fund polls attract more engagement.',
              action: 'Open Wallet',
              navigateTo: 'wallet' as const,
            },
          ].map((item) => (
            <motion.div
              key={item.title}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate(item.navigateTo)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{item.desc}</p>
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <span className="text-sm font-medium">{item.action}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Verified Badge Info */}
      {!currentUser.isVerified && (
        <motion.div variants={staggerItem} className="mb-8">
          <Card className="border-2 border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Unlock Verified Badge</CardTitle>
                  <CardDescription>Reach 500 points to get automatically verified</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                The verified badge shows the community that you are a trusted, active member. It unlocks at 500 points (Gold level). 
                Keep creating content, voting on polls, and engaging with the community to reach this milestone.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Progress to Verified</span>
                    <span className="font-medium">{score}/500 pts</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((score / 500) * 100, 100)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {Math.max(0, 500 - score)} pts to go
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Footer */}
      <motion.div variants={staggerItem} className="text-center py-6">
        <p className="text-xs text-muted-foreground">
          FeedMeForward Rewards &mdash; Engage, Earn, Grow
        </p>
      </motion.div>
    </motion.div>
  );
}

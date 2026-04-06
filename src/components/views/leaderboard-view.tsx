'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Trophy,
  Crown,
  Medal,
  CheckCircle2,
  Video,
  Users,
  Star,
  Award,
  ChevronRight,
} from 'lucide-react';
import {
  getScoreLevel,
  getScoreLevelBadge,
  getScoreLevelColor,
  getNextLevelThreshold,
  getPreviousLevelThreshold,
} from '@/types';
import type { LeaderboardEntry } from '@/types';

import { useAuthStore } from '@/stores/auth-store';
import { QuickNav } from '@/components/quick-nav';

interface LeaderboardViewProps {
  onNavigate: (view: string) => void;
  setProfileUserId?: (id: string) => void;
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500">
      <CheckCircle2 className="w-3 h-3 text-white" />
    </span>
  );
}

function PodiumUser({
  entry,
  position,
  onNavigate,
  setProfileUserId,
}: {
  entry: LeaderboardEntry;
  position: number;
  onNavigate: (view: string) => void;
  setProfileUserId?: (id: string) => void;
}) {
  const isCenter = position === 1;
  const level = getScoreLevel(entry.memberScore);
  const badge = getScoreLevelBadge(level);
  const gradientColor = getScoreLevelColor(level);

  const heights = { 1: 'h-48 sm:h-56', 2: 'h-36 sm:h-44', 3: 'h-28 sm:h-36' };
  const colors = {
    1: 'from-amber-400 to-yellow-500',
    2: 'from-gray-300 to-gray-400',
    3: 'from-orange-500 to-amber-600',
  };
  const iconComponents = {
    1: Crown,
    2: Medal,
    3: Medal,
  };
  const Icon = iconComponents[position as 1 | 2 | 3];

  const handleClick = () => {
    if (setProfileUserId) {
      setProfileUserId(entry.userId);
      onNavigate('profile');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.15, duration: 0.6, type: 'spring' }}
      className={`flex-1 flex flex-col items-center ${isCenter ? 'order-2' : position === 2 ? 'order-1' : 'order-3'}`}
    >
      {/* Crown/Icon */}
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 2, delay: position * 0.3 }}
        className="mb-2"
      >
        <Icon className={`w-6 h-6 ${position === 1 ? 'text-amber-400' : position === 2 ? 'text-gray-400' : 'text-orange-500'}`} />
      </motion.div>

      {/* Avatar */}
      <button
        onClick={handleClick}
        className="relative group cursor-pointer"
      >
        {entry.avatarUrl ? (
          <img
            src={entry.avatarUrl}
            alt={entry.username}
            className={`rounded-full object-cover border-4 border-background shadow-lg group-hover:scale-105 transition-transform ${
              isCenter ? 'w-20 h-20' : 'w-16 h-16'
            }`}
          />
        ) : (
          <div className={`rounded-full bg-gradient-to-br ${gradientColor} flex items-center justify-center text-white font-bold border-4 border-background shadow-lg group-hover:scale-105 transition-transform ${
            isCenter ? 'w-20 h-20 text-2xl' : 'w-16 h-16 text-xl'
          }`}>
            {entry.username.charAt(0).toUpperCase()}
          </div>
        )}
        {entry.isVerified && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-sm border-2 border-background">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </button>

      {/* Name & Score */}
      <button
        onClick={handleClick}
        className="mt-2 text-center group cursor-pointer"
      >
        <p className={`font-semibold group-hover:text-orange-500 transition-colors ${isCenter ? 'text-base' : 'text-sm'}`}>
          @{entry.username}
        </p>
        <p className={`font-bold ${isCenter ? 'text-xl' : 'text-lg'}`}>{entry.memberScore}</p>
        <Badge className={`text-[10px] px-1.5 ${badge.className}`}>{badge.label}</Badge>
      </button>

      {/* Podium Base */}
      <div className={`w-full max-w-24 mt-3 ${heights[position as 1 | 2 | 3]}`}>
        <div className={`w-full h-full rounded-t-xl bg-gradient-to-b ${colors[position as 1 | 2 | 3]} flex items-center justify-center shadow-lg`}>
          <span className="text-4xl font-extrabold text-white/80">#{position}</span>
        </div>
      </div>
    </motion.div>
  );
}

function LeaderboardRow({
  entry,
  currentUser,
  onNavigate,
  setProfileUserId,
}: {
  entry: LeaderboardEntry;
  currentUser?: { id: string } | null;
  onNavigate: (view: string) => void;
  setProfileUserId?: (id: string) => void;
}) {
  const level = getScoreLevel(entry.memberScore);
  const badge = getScoreLevelBadge(level);
  const gradientColor = getScoreLevelColor(level);
  const isCurrentUser = currentUser?.id === entry.userId;

  const handleClick = () => {
    if (setProfileUserId) {
      setProfileUserId(entry.userId);
      onNavigate('profile');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isCurrentUser
          ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40'
          : 'hover:bg-muted/50'
      }`}
    >
      {/* Rank */}
      <span className="w-8 text-center font-bold text-muted-foreground text-sm">{entry.rank}</span>

      {/* Avatar */}
      <button onClick={handleClick} className="shrink-0 cursor-pointer">
        {entry.avatarUrl ? (
          <img
            src={entry.avatarUrl}
            alt={entry.username}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradientColor} flex items-center justify-center text-white text-sm font-bold`}>
            {entry.username.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {/* Username */}
      <button onClick={handleClick} className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer">
        <span className="font-medium text-sm truncate hover:text-orange-500 transition-colors">
          @{entry.username}
        </span>
        {entry.isVerified && <VerifiedBadge />}
        {isCurrentUser && (
          <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">You</Badge>
        )}
      </button>

      {/* Level Badge */}
      <Badge className={`text-[10px] px-1.5 shrink-0 ${badge.className}`}>{badge.label}</Badge>

      {/* Score */}
      <span className="font-bold text-sm w-14 text-right">{entry.memberScore}</span>
    </motion.div>
  );
}

export function LeaderboardView({ onNavigate, setProfileUserId }: LeaderboardViewProps) {
  const { currentUser } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [userRank, setUserRank] = useState<{ rank: number; score: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/scores/leaderboard?limit=50&category=${category}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setLeaderboard(json.leaderboard ?? []);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    // Fetch current user's rank
    if (currentUser) {
      fetch(`/api/scores/${currentUser.id}`)
        .then((r) => r.json())
        .then((json) => {
          if (!cancelled && json.userId) {
            setUserRank({ rank: json.memberScore, score: json.memberScore });
          }
        })
        .catch(() => {});
    }

    return () => { cancelled = true; };
  }, [category, currentUser]);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const level = currentUser ? getScoreLevel(currentUser.memberScore) : null;
  const badge = level ? getScoreLevelBadge(level) : null;

  return (
    <div className="min-h-screen px-4 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="shrink-0">
          <span className="text-sm">Back to Dashboard</span>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold">Leaderboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">Top community members ranked by Member Score</p>
        </div>
      </motion.div>

      <QuickNav onNavigate={onNavigate} activeView="leaderboard" />

      {/* Category Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              <Users className="w-3.5 h-3.5 mr-1" />
              All
            </TabsTrigger>
            <TabsTrigger value="creators" className="flex-1">
              <Video className="w-3.5 h-3.5 mr-1" />
              Creators
            </TabsTrigger>
            <TabsTrigger value="engagers" className="flex-1">
              <Star className="w-3.5 h-3.5 mr-1" />
              Engagers
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Your Rank Card */}
      {currentUser && userRank && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (setProfileUserId) {
                        setProfileUserId(currentUser.id);
                        onNavigate('profile');
                      }
                    }}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:scale-105 transition-transform"
                  >
                    {currentUser.username.charAt(0).toUpperCase()}
                  </button>
                  <div>
                    <p className="font-semibold text-sm">Your Rank</p>
                    <p className="text-xs text-muted-foreground">@{currentUser.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {badge && <Badge className={`text-xs ${badge.className}`}>{badge.label}</Badge>}
                  <div className="text-right">
                    <p className="text-lg font-bold">{currentUser.memberScore ?? 0} pts</p>
                    <p className="text-xs text-muted-foreground">Level {badge?.label}</p>
                  </div>
                </div>
              </div>
              {/* Progress to next level */}
              {level && (
                <div className="mt-3">
                  {(() => {
                    const myScore = currentUser.memberScore ?? 0;
                    const nextT = getNextLevelThreshold(myScore);
                    const prevT = getPreviousLevelThreshold(myScore);
                    if (nextT !== null) {
                      const pct = ((myScore - prevT) / (nextT - prevT)) * 100;
                      return (
                        <>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>{getScoreLevelBadge(getScoreLevel(myScore)).label}</span>
                            <span>{myScore}/{nextT} to {getScoreLevelBadge(getScoreLevel(nextT - 1)).label}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-500 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
              {/* View Profile Button */}
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs gap-1 border-orange-200 dark:border-orange-800/40 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                  onClick={() => {
                    if (setProfileUserId) {
                      setProfileUserId(currentUser.id);
                      onNavigate('profile');
                    }
                  }}
                >
                  View Profile
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Podium */}
      {loading ? (
        <div className="flex items-end justify-center gap-4 mb-8 h-72">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className={`rounded-t-xl w-20 ${i === 1 ? 'h-56' : i === 2 ? 'h-44' : 'h-36'}`} />
          ))}
        </div>
      ) : top3.length >= 3 ? (
        <div className="flex items-end justify-center gap-2 sm:gap-4 mb-8 px-4">
          <PodiumUser
            entry={top3[1]}
            position={2}
            onNavigate={onNavigate}
            setProfileUserId={setProfileUserId}
          />
          <PodiumUser
            entry={top3[0]}
            position={1}
            onNavigate={onNavigate}
            setProfileUserId={setProfileUserId}
          />
          <PodiumUser
            entry={top3[2]}
            position={3}
            onNavigate={onNavigate}
            setProfileUserId={setProfileUserId}
          />
        </div>
      ) : (
        <Card className="mb-8 border-dashed">
          <CardContent className="p-8 text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Not enough data for the podium yet</p>
          </CardContent>
        </Card>
      )}

      <Separator className="mb-4" />

      {/* Rankings List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : rest.length === 0 && top3.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium">No members on the leaderboard yet</p>
            <p className="text-sm text-muted-foreground mt-1">Start engaging to earn points and climb the ranks!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {rest.map((entry) => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              currentUser={currentUser}
              onNavigate={onNavigate}
              setProfileUserId={setProfileUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Video Types ───────────────────────────────────────────────────

export interface VideoCreator {
  username: string;
  id: string;
  isVerified?: boolean;
}

export interface VideoCounts {
  polls: number;
  likes: number;
  comments: number;
  responses: number;
}

export interface Video {
  id: string;
  creatorId: string;
  type: 'lead' | 'response';
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  category: string | null;
  tags: string[] | null;
  status: 'active' | 'expired' | 'answered';
  duration: number | null;
  viewCount: number;
  isPublic: boolean;
  createdAt: string;
  creator?: VideoCreator;
  _count?: VideoCounts;
}

// ─── Poll Types ────────────────────────────────────────────────────

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
}

export interface Poll {
  id: string;
  videoId: string;
  question: string;
  options: PollOption[];
  isPaid: boolean;
  rewardPerResponse: number | null;
  responseCount: number;
  closesAt: string | null;
  userVoted?: boolean;
  userVoteOptionId?: string | null;
}

// ─── Video Detail Type ────────────────────────────────────────────

export interface VideoDetail extends Video {
  polls: Poll[];
  creator: VideoCreator;
  likeCount: number;
  commentCount: number;
  responseCount: number;
  isLiked?: boolean;
}

// ─── Comment Types ────────────────────────────────────────────────

export interface CommentUser {
  username: string;
  id: string;
  isVerified?: boolean;
}

export interface CommentData {
  id: string;
  userId: string;
  videoId: string;
  content: string;
  parentCommentId: string | null;
  isVideoReply: boolean;
  videoReplyUrl: string | null;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
  _count?: { likes: number; replies: number };
  replies?: CommentData[];
}

// ─── Video Store Types ────────────────────────────────────────────

export interface VideoFilters {
  type: string;
  status: string;
  category: string;
  search: string;
}

export const CATEGORIES = [
  'Entertainment',
  'Tech',
  'Sports',
  'Music',
  'News',
  'Lifestyle',
  'Education',
  'Other',
] as const;

export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  expired: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  answered: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

export const THUMBNAIL_GRADIENTS = [
  'from-orange-400 to-red-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-orange-500 to-yellow-500',
  'from-amber-500 to-red-400',
  'from-red-400 to-orange-600',
  'from-yellow-400 to-amber-600',
  'from-pink-400 to-rose-500',
];

// ─── Score & Gamification Types ─────────────────────────────────────

export interface ScoreBreakdown {
  engagement: number; // 0-300
  quality: number;    // 0-400
  accuracy: number;   // 0-200
  streak: number;     // 0-100
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  memberScore: number;
  isVerified: boolean;
  avatarUrl: string | null;
  videoCount: number;
  followerCount: number;
}

export interface UserProfileData {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
  memberScore: number;
  isVerified: boolean;
  createdAt: string;
  videoCount: number;
  responseCount: number;
  followerCount: number;
  followingCount: number;
  breakdown: ScoreBreakdown;
}

export type ScoreLevel = 'bronze' | 'silver' | 'gold' | 'diamond';

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 750) return 'diamond';
  if (score >= 500) return 'gold';
  if (score >= 200) return 'silver';
  return 'bronze';
}

export function getScoreLevelInfo(level: ScoreLevel): { label: string; color: string; gradient: string; minScore: number } {
  switch (level) {
    case 'diamond': return { label: 'Diamond', color: 'text-cyan-600 dark:text-cyan-400', gradient: 'from-cyan-400 to-purple-500', minScore: 750 };
    case 'gold': return { label: 'Gold', color: 'text-amber-600 dark:text-amber-400', gradient: 'from-amber-400 to-yellow-500', minScore: 500 };
    case 'silver': return { label: 'Silver', color: 'text-gray-600 dark:text-gray-300', gradient: 'from-gray-300 to-gray-400', minScore: 200 };
    case 'bronze': return { label: 'Bronze', color: 'text-orange-700 dark:text-orange-400', gradient: 'from-orange-600 to-amber-700', minScore: 0 };
  }
}

export function getScoreLevelColor(level: ScoreLevel): string {
  switch (level) {
    case 'diamond': return 'from-cyan-400 to-purple-500';
    case 'gold': return 'from-amber-400 to-yellow-500';
    case 'silver': return 'from-gray-300 to-gray-400';
    case 'bronze': return 'from-orange-600 to-amber-700';
  }
}

export function getScoreLevelBadge(level: ScoreLevel): { label: string; className: string } {
  switch (level) {
    case 'diamond':
      return { label: 'Diamond', className: 'bg-gradient-to-r from-cyan-100 to-purple-100 text-cyan-700 dark:from-cyan-900/40 dark:to-purple-900/40 dark:text-cyan-300' };
    case 'gold':
      return { label: 'Gold', className: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 dark:from-amber-900/40 dark:to-yellow-900/40 dark:text-amber-300' };
    case 'silver':
      return { label: 'Silver', className: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 dark:from-gray-800/40 dark:to-gray-700/40 dark:text-gray-300' };
    case 'bronze':
      return { label: 'Bronze', className: 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 dark:from-orange-900/40 dark:to-amber-900/40 dark:text-orange-300' };
  }
}

export function getNextLevelThreshold(score: number): number | null {
  if (score >= 750) return null; // Already max
  if (score >= 500) return 750;
  if (score >= 200) return 500;
  return 200;
}

export function getPreviousLevelThreshold(score: number): number {
  if (score >= 750) return 500;
  if (score >= 500) return 200;
  if (score >= 200) return 0;
  return 0;
}

// ─── Video Types ───────────────────────────────────────────────────

export interface VideoCreator {
  username: string;
  id: string;
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

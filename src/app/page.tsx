'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore, type User } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { getScoreLevel, getScoreLevelBadge } from '@/types';
import { ExploreView } from '@/components/views/explore-view';
import { CreateLeadView } from '@/components/views/create-lead-view';
import { CreateResponseView } from '@/components/views/create-response-view';
import { VideoDetailView } from '@/components/views/video-detail-view';
import { ProfileView } from '@/components/views/profile-view';
import { LeaderboardView } from '@/components/views/leaderboard-view';
import { WalletView } from '@/components/views/wallet-view';
import { RewardsView } from '@/components/views/rewards-view';
import { InvitationsView } from '@/components/views/invitations-view';
import { ImportFriendsView } from '@/components/views/import-friends-view';
import { ReferralBanner } from '@/components/referral-banner';
import { AudienceInsightsView } from '@/components/views/audience-insights-view';
import { SegmentsView } from '@/components/views/segments-view';
import { SocialFeedView } from '@/components/views/social-feed-view';
import { NotificationsView } from '@/components/views/notifications-view';
import { UsersListView } from '@/components/views/users-list-view';
import { MessagesView } from '@/components/views/messages-view';
import { CirclesView } from '@/components/views/circles-view';
import { CircleDetailView } from '@/components/views/circle-detail-view';
import { ModerationView } from '@/components/views/moderation-view';
import { OnboardingView } from '@/components/views/onboarding-view';
import { HashtagFeedView } from '@/components/views/hashtag-feed-view';
import { LiveSessionsView } from '@/components/views/live-sessions-view';
import { LiveStreamView } from '@/components/views/live-stream-view';
import { BroadcasterView } from '@/components/views/broadcaster-view';
import { CreatorDashboardView } from '@/components/views/creator-dashboard-view';
import { TrendingVideos } from '@/components/trending-videos';
import { GlobalSearch } from '@/components/global-search';
import { SkipToContent } from '@/components/skip-to-content';
import { NotificationBell } from '@/components/notification-bell';
import { useRealtime } from '@/hooks/use-realtime';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';
import {
  Eye,
  EyeOff,
  Loader2,
  Play,
  ArrowRight,
  LogOut,
  Trophy,
  Wallet,
  Shield,
  BadgeCheck,
  Video,
  Sparkles,
  Users,
  TrendingUp,
  ChevronRight,
  Database,
  BarChart3,
  UserPlus,
  MessageSquare,
  Heart,
  ThumbsUp,
  CreditCard,
  Send,
  Circle as CircleIcon,
  Share2,
  Radio,
  BarChart2,
  Flag,
  Hash,
  Vote,
  KeyRound,
  Table2,
  RefreshCw,
  User as UserIcon,
  Award,
  CheckCircle2,
  Target,
  Bell,
  Rss,
  ShieldCheck,
  LayoutDashboard,
} from 'lucide-react';
import { FollowButton } from '@/components/follow-button';

export type View = 'landing' | 'signup' | 'login' | 'dashboard' | 'schema' | 'explore' | 'create-lead' | 'create-response' | 'video-detail' | 'profile' | 'leaderboard' | 'wallet' | 'rewards' | 'invitations' | 'import-friends' | 'audience' | 'segments' | 'feed' | 'notifications' | 'users-list' | 'messages' | 'circles' | 'circle-detail' | 'moderation' | 'onboarding' | 'hashtag-feed' | 'live' | 'live-session' | 'broadcaster' | 'creator-dashboard';

// ─── Types for Schema API ──────────────────────────────────────────
interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  isUnique?: boolean;
  isId?: boolean;
  defaultVal?: string;
}

interface SchemaModel {
  name: string;
  icon: string;
  category: string;
  description: string;
  fields: SchemaField[];
  recordCount: number;
}

interface SchemaData {
  summary: {
    totalModels: number;
    totalFields: number;
    totalRecords: number;
    categories: Record<string, string[]>;
  };
  models: SchemaModel[];
}

// ─── Icon Map ───────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  User: UserIcon,
  Video,
  BarChart3,
  Vote: Hash,
  UserPlus,
  MessageSquare,
  Heart,
  ThumbsUp,
  CreditCard,
  Send,
  Circle: CircleIcon,
  Users,
  Share2,
  Radio,
  BarChart2,
  Flag,
};

// ─── Category Colors ───────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, {
  border: string;
  bg: string;
  badge: string;
  headerBg: string;
  iconBg: string;
}> = {
  core: {
    border: 'border-orange-200 dark:border-orange-800/50',
    bg: 'bg-orange-50/80 dark:bg-orange-950/30',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    headerBg: 'bg-gradient-to-r from-orange-500 to-orange-600',
    iconBg: 'from-orange-400 to-amber-500',
  },
  social: {
    border: 'border-amber-200 dark:border-amber-800/50',
    bg: 'bg-amber-50/80 dark:bg-amber-950/30',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    headerBg: 'bg-gradient-to-r from-amber-500 to-amber-600',
    iconBg: 'from-amber-400 to-orange-500',
  },
  monetization: {
    border: 'border-emerald-200 dark:border-emerald-800/50',
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    headerBg: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    iconBg: 'from-emerald-400 to-green-500',
  },
  community: {
    border: 'border-sky-200 dark:border-sky-800/50',
    bg: 'bg-sky-50/80 dark:bg-sky-950/30',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    headerBg: 'bg-gradient-to-r from-sky-500 to-sky-600',
    iconBg: 'from-sky-400 to-blue-500',
  },
  live: {
    border: 'border-rose-200 dark:border-rose-800/50',
    bg: 'bg-rose-50/80 dark:bg-rose-950/30',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    headerBg: 'bg-gradient-to-r from-rose-500 to-rose-600',
    iconBg: 'from-rose-400 to-pink-500',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  social: 'Social',
  monetization: 'Monetization',
  community: 'Community',
  live: 'Live',
};

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// ─── Floating Background Orbs ───────────────────────────────────────
function FloatingOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-orange-200/30 dark:bg-orange-900/20 blur-3xl animate-pulse" />
      <div className="absolute top-1/3 -left-40 w-96 h-96 rounded-full bg-amber-200/30 dark:bg-amber-900/20 blur-3xl animate-pulse [animation-delay:2s]" />
      <div className="absolute -bottom-40 right-1/4 w-80 h-80 rounded-full bg-orange-300/20 dark:bg-orange-800/15 blur-3xl animate-pulse [animation-delay:4s]" />
      <div className="absolute top-2/3 left-1/4 w-64 h-64 rounded-full bg-amber-100/30 dark:bg-amber-900/15 blur-3xl animate-pulse [animation-delay:1s]" />
    </div>
  );
}

// ─── Landing Page ──────────────────────────────────────────────────
function LandingPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { isAuthenticated } = useAuthStore();

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
    >
      {/* Hero */}
      <motion.div variants={staggerItem} className="text-center max-w-3xl mx-auto mb-12">
        <motion.div
          className="relative inline-block mb-8"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg shadow-orange-500/25 flex items-center justify-center">
            <img src="/logo.svg" alt="FeedMeForward Logo" className="w-16 h-16 md:w-24 md:h-24 object-contain" />
          </div>
          <motion.div
            className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-md"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Play className="w-3 h-3 text-white fill-white ml-0.5" />
          </motion.div>
        </motion.div>

        <motion.h1
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4"
          variants={staggerItem}
        >
          <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">
            FeedMe
          </span>
          <span className="text-foreground">Forward</span>
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto mb-8"
          variants={staggerItem}
        >
          Where Every Video Starts a Conversation
        </motion.p>

        <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25 h-12 px-8 text-base font-semibold"
            onClick={() => onNavigate('signup')}
          >
            Get Started Free
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button
            size="lg"
            className="bg-black hover:bg-gray-800 text-white shadow-lg shadow-black/25 h-12 px-8 text-base font-semibold"
            onClick={() => onNavigate('login')}
          >
            Sign In
          </Button>
        </motion.div>
      </motion.div>

      {/* Feature Cards */}
      <motion.div
        variants={staggerItem}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full"
      >
        {/* Video Polls Card */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          onClick={() => {
            if (!isAuthenticated) {
              onNavigate('signup');
            } else {
              onNavigate('explore');
            }
          }}
        >
          <Card className="bg-orange-50 dark:bg-orange-950/50 border-0 shadow-md h-full cursor-pointer">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center mb-2 shadow-sm">
                <Video className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg">Video Polls</CardTitle>
              <CardDescription className="text-sm leading-relaxed">Create engaging polls with video content that captivates your audience.</CardDescription>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Community Driven Card */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          onClick={() => {
            if (!isAuthenticated) {
              onNavigate('signup');
            } else {
              onNavigate('leaderboard');
            }
          }}
        >
          <Card className="bg-amber-50 dark:bg-amber-950/50 border-0 shadow-md h-full cursor-pointer">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center mb-2 shadow-sm">
                <Users className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg">Community Driven</CardTitle>
              <CardDescription className="text-sm leading-relaxed">Build your audience and connect with creators who share your passions.</CardDescription>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Earn Rewards Card */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          onClick={() => {
            if (!isAuthenticated) {
              onNavigate('signup');
            } else {
              onNavigate('rewards');
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <Card className="bg-red-50 dark:bg-red-950/50 border-0 shadow-md h-full">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-2 shadow-sm">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-lg">Earn Rewards</CardTitle>
              <CardDescription className="text-sm leading-relaxed">Grow your member score and earn wallet rewards for your engagement.</CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      </motion.div>

      {/* Bottom Social Proof */}
      <motion.div variants={staggerItem} className="mt-16 text-center">
        <p className="text-sm text-muted-foreground">
          Join thousands of creators already polling their audiences
        </p>
        <div className="flex items-center justify-center gap-2 mt-3">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-amber-400 border-2 border-background"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              style={{ marginLeft: i > 0 ? '-8px' : '0', zIndex: 5 - i }}
            />
          ))}
          <span className="text-sm font-medium text-foreground ml-3">+2,400 creators</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Sign Up Form ──────────────────────────────────────────────────
function SignUpForm({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { toast } = useToast();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!form.username || form.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!form.password || form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the terms';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form, agreedToTerms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Registration failed',
          description: data.error || 'Something went wrong',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Welcome to FeedMeForward! 🎉',
        description: `Your account has been created, ${data.user.username}!`,
      });

      login(data.user);
      onNavigate('onboarding');
    } catch {
      toast({
        title: 'Network error',
        description: 'Please check your connection and try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="min-h-screen flex items-center justify-center px-4 py-12"
    >
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-start mb-2">
            <Button variant="ghost" onClick={() => onNavigate('landing')} className="shrink-0">
              <span className="text-sm">Back to Home</span>
            </Button>
          </div>
          <motion.div
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-md shadow-orange-500/20"
            whileHover={{ rotate: 5, scale: 1.05 }}
          >
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain" />
          </motion.div>
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>Join the FeedMeForward community today</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="coolcreator42"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                aria-invalid={!!errors.username}
              />
              {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className="pr-10"
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  className="pr-10"
                  aria-invalid={!!errors.confirmPassword}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => {
                    setAgreedToTerms(checked === true);
                    if (errors.terms) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.terms;
                        return next;
                      });
                    }
                  }}
                  className="mt-0.5"
                />
                <Label htmlFor="terms" className="text-sm leading-snug text-muted-foreground cursor-pointer">
                  I agree to the{' '}
                  <span className="text-primary font-medium cursor-pointer hover:underline">
                    Terms of Service
                  </span>{' '}
                  and{' '}
                  <span className="text-primary font-medium cursor-pointer hover:underline">
                    Privacy Policy
                  </span>
                </Label>
              </div>
              {errors.terms && <p className="text-xs text-destructive">{errors.terms}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => onNavigate('login')}
              >
                Sign in
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}

// ─── Login Form ────────────────────────────────────────────────────
function LoginForm({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { toast } = useToast();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!form.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Login failed',
          description: data.error || 'Invalid credentials',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: `Welcome back, ${data.user.username}! 👋`,
        description: 'You are now signed in',
      });

      login(data.user);
      onNavigate(data.user.onboardingCompleted ? 'explore' : 'onboarding');
    } catch {
      toast({
        title: 'Network error',
        description: 'Please check your connection and try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="min-h-screen flex items-center justify-center px-4 py-12"
    >
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-start mb-2">
            <Button variant="ghost" onClick={() => onNavigate('landing')} className="shrink-0">
              <span className="text-sm">Back to Home</span>
            </Button>
          </div>
          <motion.div
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-md shadow-orange-500/20"
            whileHover={{ rotate: 5, scale: 1.05 }}
          >
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain" />
          </motion.div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Sign in to your FeedMeForward account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Password</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className="pr-10"
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => onNavigate('signup')}
              >
                Sign up
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────
function Dashboard({ onNavigate, setProfileUserId }: { onNavigate: (view: View) => void; setProfileUserId: (id: string) => void }) {
  const { currentUser, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    onNavigate('landing');
  };

  const handleViewProfile = () => {
    if (currentUser && setProfileUserId) {
      setProfileUserId(currentUser.id);
      onNavigate('profile');
    }
  };

  if (!currentUser) return null;

  const score = currentUser.memberScore ?? 0;
  const balance = currentUser.walletBalance ?? 0;
  const verified = currentUser.isVerified ?? false;
  const role = currentUser.role || 'member';

  const level = getScoreLevel(score);
  const levelBadge = getScoreLevelBadge(level);

  const stats = [
    {
      icon: Trophy,
      label: 'Member Score',
      value: score.toLocaleString(),
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50',
      onClick: handleViewProfile,
    },
    {
      icon: Wallet,
      label: 'Wallet Balance',
      value: `$${balance.toFixed(2)}`,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/50',
      onClick: () => onNavigate('wallet'),
    },
    {
      icon: Shield,
      label: 'Role',
      value: role.charAt(0).toUpperCase() + role.slice(1),
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
      onClick: undefined,
    },
    {
      icon: verified ? CheckCircle2 : BadgeCheck,
      label: verified ? 'Verified ✓' : 'Not yet',
      value: verified ? 'Yes' : `${Math.max(0, 500 - score)} pts`,
      color: verified ? 'text-amber-500' : 'text-muted-foreground',
      bgColor: verified ? 'bg-amber-50 dark:bg-amber-950/50' : 'bg-muted',
      onClick: verified ? undefined : handleViewProfile,
    },
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
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20">
            <img src="/logo.svg" alt="Logo" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              FeedMeForward
              <Badge className={`text-xs ${levelBadge.className}`}>{levelBadge.label}</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">Welcome back, {currentUser.username}!</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GlobalSearch onNavigate={(v) => onNavigate(v as View)} setProfileUserId={setProfileUserId} />
          <NotificationBell onNavigate={(v) => onNavigate(v as View)} />
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Card
              className={`${stat.bgColor} border-0 shadow-sm h-full ${stat.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
              onClick={stat.onClick}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* User Info Card */}
      <motion.div variants={staggerItem} className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Overview</CardTitle>
            <CardDescription>Your account details and activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Username</p>
                <p className="font-medium flex items-center gap-2">
                  {currentUser.username}
                  {verified && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                  <Badge variant="secondary" className="text-xs">
                    {role}
                  </Badge>
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                <p className="font-medium">{currentUser.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Cards */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* My Profile Card */}
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 border-orange-200 dark:border-orange-800/40 bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10"
            onClick={handleViewProfile}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">My Profile</CardTitle>
                  <CardDescription>View your scores</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-sm font-bold">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{currentUser.displayName || currentUser.username}</p>
                  <p className="text-xs text-muted-foreground">@{currentUser.username}</p>
                </div>
                <Badge className={`text-[10px] shrink-0 ${levelBadge.className}`}>{levelBadge.label}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <span className="text-sm font-medium">View Profile</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Leaderboard Card */}
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10"
            onClick={() => onNavigate('leaderboard')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Leaderboard</CardTitle>
                  <CardDescription>Top community members</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                See the top-ranked members by Member Score. Compete with the community.
              </p>
              <div className="mt-4 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <span className="text-sm font-medium">View Rankings</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rewards Card */}
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/80 to-orange-50/50 dark:from-emerald-950/20 dark:to-orange-950/10"
            onClick={() => onNavigate('rewards')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Rewards</CardTitle>
                  <CardDescription>Track earnings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                View your reward tiers, milestones, and total earnings from engagement.
              </p>
              <div className="mt-4 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <span className="text-sm font-medium">View Rewards</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Audience Insights Card */}
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 border-orange-200 dark:border-orange-800/40 bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10"
            onClick={() => onNavigate('audience')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Audience Insights</CardTitle>
                  <CardDescription>Platform demographics</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Explore platform demographics and audience analytics.
              </p>
              <div className="mt-4 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <span className="text-sm font-medium">View Insights</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Audience Segments Card */}
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10"
            onClick={() => onNavigate('segments')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Segments</CardTitle>
                  <CardDescription>Target audiences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Create and manage audience segments for targeted polls.
              </p>
              <div className="mt-4 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <span className="text-sm font-medium">View Segments</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Social Feed Card */}
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 border-blue-200 dark:border-blue-800/40 bg-gradient-to-br from-blue-50/80 to-orange-50/50 dark:from-blue-950/20 dark:to-orange-950/10"
            onClick={() => onNavigate('feed')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                  <Rss className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Social Feed</CardTitle>
                  <CardDescription>Personalized content</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                See videos from creators you follow, discover new content, and stay connected.
              </p>
              <div className="mt-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <span className="text-sm font-medium">View Feed</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications Card */}
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 border-rose-200 dark:border-rose-800/40 bg-gradient-to-br from-rose-50/80 to-orange-50/50 dark:from-rose-950/20 dark:to-orange-950/10"
            onClick={() => onNavigate('notifications')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-sm">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Notifications</CardTitle>
                  <CardDescription>Stay updated</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                See who followed you, liked your videos, commented, and more activity updates.
              </p>
              <div className="mt-4 flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <span className="text-sm font-medium">View Notifications</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Messages Card */}
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 border-cyan-200 dark:border-cyan-800/40 bg-gradient-to-br from-cyan-50/80 to-blue-50/50 dark:from-cyan-950/20 dark:to-blue-950/10"
            onClick={() => onNavigate('messages')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-sm">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Messages</CardTitle>
                  <CardDescription>Direct messaging</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Chat with other creators, share ideas, and build connections.
              </p>
              <div className="mt-4 flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                <span className="text-sm font-medium">Open Messages</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Lead Clips Card */}
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 border-orange-200 dark:border-orange-800/40 bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10"
            onClick={() => onNavigate('explore')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Lead Clips</CardTitle>
                  <CardDescription>Explore & create polls</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Create and share engaging video polls with your community.
              </p>
              <div className="mt-4 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <span className="text-sm font-medium">Explore Clips</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Create Lead Clip Card */}
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10"
            onClick={() => onNavigate('create-lead')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Create Lead Clip</CardTitle>
                  <CardDescription>Start a new poll</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Share a video and attach a poll question.
              </p>
              <div className="mt-4 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <span className="text-sm font-medium">Create Now</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Invite Friends Card */}
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-2 border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-amber-950/10"
            onClick={() => onNavigate('import-friends')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Invite Friends</CardTitle>
                  <CardDescription>Import & earn $2</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Import contacts, share links, and earn rewards for every sign-up.
              </p>
              <div className="mt-4 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <span className="text-sm font-medium">Import Friends</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Creator Studio Card — only for creators */}
        {currentUser?.role === 'creator' && (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20" onClick={() => onNavigate('creator-dashboard')}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Creator Studio</p>
                  <p className="text-xs text-muted-foreground">Analytics & tools</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* Moderation Card — only show for moderators and admins */}
      {(role === 'moderator' || role === 'admin') && (
        <motion.div variants={staggerItem} className="mb-8">
          <Card
            className="relative border-2 border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate('moderation')}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Moderation</CardTitle>
                  <CardDescription>Review reported content and enforce community guidelines</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <span className="text-sm font-medium">Open Moderation Dashboard</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Wallet Actions Card */}
      <motion.div variants={staggerItem} className="mb-8">
        <Card className="border-2 border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/80 to-orange-50/50 dark:from-emerald-950/20 dark:to-orange-950/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-orange-500 flex items-center justify-center shadow-sm">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Quick Wallet Actions</CardTitle>
                <CardDescription>Deposit, send tips, and manage funds</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                onClick={() => onNavigate('wallet')}
              >
                <Plus className="w-3 h-3" />
                Deposit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/30 text-pink-700 dark:text-pink-300"
                onClick={() => onNavigate('wallet')}
              >
                <Send className="w-3 h-3" />
                Send Tip
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <span className="text-sm font-medium">Manage Wallet</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Referral Banner — show on dashboard */}
      <ReferralBanner onNavigate={(v) => onNavigate(v as View)} />

      {/* What's Trending Section */}
      <motion.div variants={staggerItem} className="mb-8">
        <TrendingVideos
          onVideoClick={(id) => {
            window.dispatchEvent(new CustomEvent('navigate-video', { detail: { videoId: id } }));
          }}
          onSeeAll={() => onNavigate('explore')}
          variant="compact"
        />
      </motion.div>

      {/* Follow Suggestions Mini Section */}
      <DashboardFollowSuggestions onNavigate={navigate} setProfileUserId={handleSetProfileUserId} />

      {/* Footer */}
      <motion.div variants={staggerItem} className="text-center py-6">
        <p className="text-xs text-muted-foreground">
          FeedMeForward &mdash; Where Every Video Starts a Conversation
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Follow Suggestions for Dashboard ─────────────────────────────
function DashboardFollowSuggestions({ onNavigate, setProfileUserId }: { onNavigate: (view: View) => void; setProfileUserId: (id: string) => void }) {
  const { currentUser } = useAuthStore();
  const [suggestions, setSuggestions] = useState<Array<{
    id: string; username: string; displayName: string | null; avatarUrl: string | null;
    followerCount: number; isVerified: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    fetch('/api/users/suggestions', {
      headers: { 'X-User-Id': currentUser.id },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.suggestions) setSuggestions(json.suggestions.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentUser]);

  if (!currentUser || suggestions.length === 0) return null;

  return (
    <motion.div variants={staggerItem} className="mb-8">
      <Card className="border-2 border-orange-200 dark:border-orange-800/40 bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">People You May Know</CardTitle>
                <CardDescription>Grow your community</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex-1 flex items-center gap-3 p-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-7 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              {suggestions.map((user) => (
                <div key={user.id} className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors">
                  <button
                    className="shrink-0"
                    onClick={() => { setProfileUserId(user.id); onNavigate('profile'); }}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.username} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-sm font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-1">
                      {user.displayName || user.username}
                      {user.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    <p className="text-[10px] text-muted-foreground">{user.followerCount} followers</p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <FollowButton targetUserId={user.id} targetUsername={user.username} variant="compact" size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Schema Dashboard ───────────────────────────────────────────────
function SchemaDashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [schemaData, setSchemaData] = useState<SchemaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const fetchSchema = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/schema');
      const json = await res.json();
      if (json.success && json.data) {
        setSchemaData(json.data as SchemaData);
      } else {
        setError(json.error || 'Failed to load schema');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  const filteredModels = schemaData?.models.filter(
    (m) => filterCategory === 'all' || m.category === filterCategory
  ) ?? [];

  const categoryCounts = schemaData
    ? Object.entries(schemaData.summary.categories).map(([key, models]) => ({
        key,
        label: CATEGORY_LABELS[key] || key,
        count: models.length,
      }))
    : [];

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="min-h-screen px-4 py-8 max-w-6xl mx-auto"
    >
      {/* Header */}
      <motion.div
        variants={staggerItem}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="shrink-0">
            <span className="text-sm">Back to Dashboard</span>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-6 h-6 text-orange-500" />
              <h1 className="text-2xl font-bold">Database Schema</h1>
            </div>
            <p className="text-sm text-muted-foreground">FeedMeForward data architecture overview</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSchema}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Summary Stats */}
      {schemaData && (
        <motion.div variants={staggerItem} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            {
              icon: Table2,
              label: 'Total Models',
              value: schemaData.summary.totalModels,
              color: 'text-orange-500',
              bgColor: 'bg-orange-50 dark:bg-orange-950/50',
            },
            {
              icon: KeyRound,
              label: 'Total Fields',
              value: schemaData.summary.totalFields,
              color: 'text-amber-500',
              bgColor: 'bg-amber-50 dark:bg-amber-950/50',
            },
            {
              icon: Database,
              label: 'Total Records',
              value: schemaData.summary.totalRecords,
              color: 'text-emerald-500',
              bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
            },
            {
              icon: Users,
              label: 'Categories',
              value: categoryCounts.length,
              color: 'text-sky-500',
              bgColor: 'bg-sky-50 dark:bg-sky-950/50',
            },
          ].map((stat) => (
            <Card key={stat.label} className={`${stat.bgColor} border-0 shadow-sm`}>
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className={`w-9 h-9 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Category Filter */}
      {schemaData && (
        <motion.div variants={staggerItem} className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={filterCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterCategory('all')}
            className={filterCategory === 'all' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' : ''}
          >
            All ({schemaData.summary.totalModels})
          </Button>
          {categoryCounts.map((cat) => {
            const colors = CATEGORY_COLORS[cat.key];
            const isActive = filterCategory === cat.key;
            return (
              <Button
                key={cat.key}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCategory(cat.key)}
                className={
                  isActive
                    ? `bg-gradient-to-r ${CATEGORY_COLORS[cat.key]?.headerBg} text-white shadow-sm`
                    : ''
                }
              >
                {cat.label} ({cat.count})
              </Button>
            );
          })}
        </motion.div>
      )}

      {/* Loading State */}
      {loading && !schemaData && (
        <motion.div variants={staggerItem} className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
          <p className="text-muted-foreground">Loading schema data...</p>
        </motion.div>
      )}

      {/* Error State */}
      {error && (
        <motion.div variants={staggerItem}>
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-6 text-center">
              <p className="text-destructive font-medium mb-2">Failed to load schema</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={fetchSchema} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Schema Model Cards Grid */}
      {schemaData && (
        <motion.div
          variants={staggerItem}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filteredModels.map((model, index) => {
            const colors = CATEGORY_COLORS[model.category] || CATEGORY_COLORS.core;
            const IconComponent = ICON_MAP[model.icon] || Database;
            const isExpanded = expandedModel === model.name;

            return (
              <motion.div
                key={model.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, type: 'spring', stiffness: 300 }}
                whileHover={{ y: -2 }}
              >
                <Card
                  className={`${colors.border} ${colors.bg} cursor-pointer transition-all hover:shadow-md`}
                  onClick={() => setExpandedModel(isExpanded ? null : model.name)}
                >
                  {/* Card Header */}
                  <div className={`${colors.headerBg} px-4 py-3 rounded-t-lg`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4 text-white/90" />
                        <h3 className="text-sm font-semibold text-white truncate">{model.name}</h3>
                      </div>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/20 text-white border-0 hover:bg-white/30">
                        {CATEGORY_LABELS[model.category] || model.category}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    {/* Description */}
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">
                      {model.description}
                    </p>

                    {/* Record Count */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {model.recordCount} record{model.recordCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {model.fields.length} field{model.fields.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Fields List */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-border/50 pt-3 mt-1"
                      >
                        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                          {model.fields.map((field) => (
                            <div
                              key={field.name}
                              className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-background/50 hover:bg-background/80 transition-colors"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {field.isId && (
                                  <KeyRound className="w-3 h-3 text-amber-500 shrink-0" />
                                )}
                                {field.isUnique && !field.isId && (
                                  <BadgeCheck className="w-3 h-3 text-sky-500 shrink-0" />
                                )}
                                <span className={`truncate ${field.isId ? 'font-semibold text-amber-700 dark:text-amber-300' : field.isUnique ? 'font-medium text-sky-700 dark:text-sky-300' : ''}`}>
                                  {field.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 font-mono"
                                >
                                  {field.type}
                                </Badge>
                                {!field.required && (
                                  <span className="text-[10px] text-muted-foreground">?</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Expand indicator */}
                    <div className="flex items-center justify-center pt-2">
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Empty Filter State */}
      {schemaData && filteredModels.length === 0 && (
        <motion.div variants={staggerItem}>
          <Card>
            <CardContent className="p-8 text-center">
              <Database className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No models found for this category</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Footer */}
      {schemaData && (
        <motion.div variants={staggerItem} className="text-center py-8">
          <p className="text-xs text-muted-foreground">
            FeedMeForward Schema &mdash; {schemaData.summary.totalModels} models &middot; {schemaData.summary.totalFields} fields &middot; SQLite
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────
export default function Home() {
  const { isAuthenticated, currentUser } = useAuthStore();

  // Establish global real-time SSE connection for all views
  useRealtime();

  const [view, setView] = useState<View>(isAuthenticated && !currentUser?.onboardingCompleted ? 'onboarding' : isAuthenticated ? 'explore' : 'landing');
  const [videoId, setVideoId] = useState<string>('');
  const [parentVideoId, setParentVideoId] = useState<string>('');
  const [parentVideoTitle, setParentVideoTitle] = useState<string>('');
  const [parentVideoCreator, setParentVideoCreator] = useState<string>('');
  const [parentVideoThumbnail, setParentVideoThumbnail] = useState<string>('');
  const [profileUserId, setProfileUserId] = useState<string>('');
  const [profileUsername, setProfileUsername] = useState<string>('');
  const [usersListTab, setUsersListTab] = useState<'followers' | 'following'>('followers');
  const [circleId, setCircleId] = useState<string>('');
  const [currentHashtag, setCurrentHashtag] = useState<string>('');
  const [currentLiveSessionId, setCurrentLiveSessionId] = useState<string>('');

  const navigate = useCallback((newView: View) => {
    setView(newView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Listen for video navigation from profile view
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.videoId) {
        setVideoId(detail.videoId);
        setView('video-detail');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('navigate-video', handler);
    const navigateUsersListHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setProfileUserId(detail.userId);
      setUsersListTab(detail.tab || 'followers');
      if (detail.username) {
        setProfileUsername(detail.username);
      }
      setView('users-list');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('navigate-users-list', navigateUsersListHandler);
    // Listen for hashtag navigation
    const hashtagHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tag) {
        setCurrentHashtag(detail.tag);
        setView('hashtag-feed');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('navigate-hashtag', hashtagHandler);
    return () => {
      window.removeEventListener('navigate-video', handler);
      window.removeEventListener('navigate-users-list', navigateUsersListHandler);
      window.removeEventListener('navigate-hashtag', hashtagHandler);
    };
  }, []);

  const handleVideoClick = useCallback((id: string) => {
    setVideoId(id);
    setView('video-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSetParentVideoId = useCallback((id: string) => {
    setParentVideoId(id);
  }, []);

  const handleSetProfileUserId = useCallback((id: string) => {
    setProfileUserId(id);
  }, []);

  const handleSetCircleId = useCallback((id: string) => {
    setCircleId(id);
  }, []);

  const handleSetVideoId = useCallback((id: string) => {
    setVideoId(id);
    setView('video-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
    <SkipToContent />
    <main id="main-content" className="relative overflow-hidden">
      <FloatingOrbs />
      <AnimatePresence mode="wait">
        {view === 'landing' && <LandingPage key="landing" onNavigate={navigate} />}
        {view === 'signup' && <SignUpForm key="signup" onNavigate={navigate} />}
        {view === 'login' && <LoginForm key="login" onNavigate={navigate} />}
        {view === 'dashboard' && <Dashboard key="dashboard" onNavigate={navigate} setProfileUserId={handleSetProfileUserId} />}
        {view === 'schema' && <SchemaDashboard key="schema" onNavigate={navigate} />}
        {view === 'explore' && <ExploreView key="explore" onNavigate={navigate} setVideoId={handleVideoClick} />}
        {view === 'create-lead' && <CreateLeadView key="create-lead" onNavigate={navigate} />}
        {view === 'create-response' && (
          <CreateResponseView
            key="create-response"
            onNavigate={navigate}
            parentVideoId={parentVideoId}
            parentVideoTitle={parentVideoTitle}
            parentVideoCreator={parentVideoCreator}
            parentVideoThumbnail={parentVideoThumbnail}
          />
        )}
        {view === 'video-detail' && (
          <VideoDetailView
            key={videoId}
            onNavigate={navigate}
            videoId={videoId}
            setParentVideoId={handleSetParentVideoId}
            setProfileUserId={handleSetProfileUserId}
          />
        )}
        {view === 'profile' && profileUserId && (
          <ProfileView
            key={profileUserId}
            onNavigate={navigate}
            userId={profileUserId}
          />
        )}
        {view === 'leaderboard' && (
          <LeaderboardView
            key="leaderboard"
            onNavigate={navigate}
            setProfileUserId={handleSetProfileUserId}
          />
        )}
        {view === 'wallet' && (
          <WalletView
            key="wallet"
            onNavigate={navigate}
          />
        )}
        {view === 'rewards' && (
          <RewardsView
            key="rewards"
            onNavigate={navigate}
          />
        )}
        {view === 'invitations' && (
          <InvitationsView
            key="invitations"
            onNavigate={navigate}
          />
        )}
        {view === 'import-friends' && (
          <ImportFriendsView
            key="import-friends"
            onNavigate={navigate}
          />
        )}
        {view === 'audience' && (
          <AudienceInsightsView
            key="audience"
            onNavigate={navigate}
          />
        )}
        {view === 'segments' && (
          <SegmentsView
            key="segments"
            onNavigate={navigate}
          />
        )}
        {view === 'feed' && (
          <SocialFeedView
            key="feed"
            onNavigate={navigate}
            setVideoId={handleVideoClick}
            setProfileUserId={handleSetProfileUserId}
          />
        )}
        {view === 'notifications' && (
          <NotificationsView
            key="notifications"
            onNavigate={navigate}
            setProfileUserId={handleSetProfileUserId}
            setVideoId={handleVideoClick}
          />
        )}
        {view === 'users-list' && profileUserId && (
          <UsersListView
            key={`users-list-${profileUserId}-${usersListTab}`}
            onNavigate={navigate}
            setProfileUserId={handleSetProfileUserId}
            targetUserId={profileUserId}
            targetUsername={profileUsername || undefined}
            initialTab={usersListTab}
          />
        )}
        {view === 'messages' && (
          <MessagesView
            key="messages"
            onNavigate={navigate}
            setProfileUserId={handleSetProfileUserId}
          />
        )}
        {view === 'circles' && (
          <CirclesView
            key="circles"
            onNavigate={navigate}
            setCircleId={handleSetCircleId}
          />
        )}
        {view === 'circle-detail' && (
          <CircleDetailView
            key={circleId}
            onNavigate={navigate}
            circleId={circleId}
            setProfileUserId={handleSetProfileUserId}
            setVideoId={handleSetVideoId}
          />
        )}
        {view === 'moderation' && (
          <ModerationView
            key="moderation"
            onNavigate={navigate}
          />
        )}
        {view === 'hashtag-feed' && currentHashtag && (
          <HashtagFeedView
            key={currentHashtag}
            onNavigate={navigate}
            hashtag={currentHashtag}
            setVideoId={handleVideoClick}
            onHashtagClick={(tag) => {
              setCurrentHashtag(tag);
              setView('hashtag-feed');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
        {view === 'onboarding' && (
          <OnboardingView
            key="onboarding"
            onComplete={() => setView('explore')}
            onNavigate={navigate}
          />
        )}
        {view === 'creator-dashboard' && (
          <CreatorDashboardView key="creator-dashboard" onNavigate={navigate} />
        )}
      </AnimatePresence>
    </main>
    </>
  );
}

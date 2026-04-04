'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';

type View = 'landing' | 'signup' | 'login' | 'dashboard';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
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
            variant="outline"
            className="h-12 px-8 text-base font-semibold"
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
        {[
          {
            icon: Video,
            title: 'Video Polls',
            desc: 'Create engaging polls with video content that captivates your audience.',
            color: 'from-orange-400 to-orange-500',
            bgColor: 'bg-orange-50 dark:bg-orange-950/50',
          },
          {
            icon: Users,
            title: 'Community Driven',
            desc: 'Build your audience and connect with creators who share your passions.',
            color: 'from-amber-400 to-amber-500',
            bgColor: 'bg-amber-50 dark:bg-amber-950/50',
          },
          {
            icon: TrendingUp,
            title: 'Earn Rewards',
            desc: 'Grow your member score and earn wallet rewards for your engagement.',
            color: 'from-orange-500 to-red-500',
            bgColor: 'bg-red-50 dark:bg-red-950/50',
          },
        ].map((feature) => (
          <motion.div
            key={feature.title}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Card className={`${feature.bgColor} border-0 shadow-md h-full`}>
              <CardHeader>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2 shadow-sm`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{feature.desc}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
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
      onNavigate('dashboard');
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
      onNavigate('dashboard');
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
function Dashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { currentUser, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    onNavigate('landing');
  };

  if (!currentUser) return null;

  const stats = [
    {
      icon: Trophy,
      label: 'Member Score',
      value: currentUser.memberScore.toLocaleString(),
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    },
    {
      icon: Wallet,
      label: 'Wallet Balance',
      value: `$${currentUser.walletBalance.toFixed(2)}`,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/50',
    },
    {
      icon: Shield,
      label: 'Role',
      value: currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1),
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      icon: BadgeCheck,
      label: 'Verified',
      value: currentUser.isVerified ? 'Yes' : 'Not yet',
      color: currentUser.isVerified ? 'text-blue-500' : 'text-muted-foreground',
      bgColor: currentUser.isVerified ? 'bg-blue-50 dark:bg-blue-950/50' : 'bg-muted',
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
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20">
            <img src="/logo.svg" alt="Logo" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">FeedMeForward</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {currentUser.username}!</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Card className={`${stat.bgColor} border-0 shadow-sm h-full`}>
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
                  <Badge variant="secondary" className="text-xs">
                    {currentUser.role}
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

      {/* Coming Soon Section */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card className="border-2 border-dashed border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Lead Clips</CardTitle>
                  <CardDescription>Coming Soon</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Create and share engaging video polls with your community. Lead Clips will let you ask questions through video and gather real-time responses.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Under Development
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card className="border-2 border-dashed border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Leaderboards</CardTitle>
                  <CardDescription>Coming Soon</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Compete with other creators on the leaderboard. Rise through the ranks by creating popular polls and engaging with your audience.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Under Development
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.div variants={staggerItem} className="text-center py-6">
        <p className="text-xs text-muted-foreground">
          FeedMeForward &mdash; Where Every Video Starts a Conversation
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────
export default function Home() {
  const { isAuthenticated } = useAuthStore();
  const [view, setView] = useState<View>(isAuthenticated ? 'dashboard' : 'landing');

  const navigate = useCallback((newView: View) => {
    setView(newView);
  }, []);

  return (
    <main className="relative overflow-hidden">
      <FloatingOrbs />
      <AnimatePresence mode="wait">
        {view === 'landing' && <LandingPage key="landing" onNavigate={navigate} />}
        {view === 'signup' && <SignUpForm key="signup" onNavigate={navigate} />}
        {view === 'login' && <LoginForm key="login" onNavigate={navigate} />}
        {view === 'dashboard' && <Dashboard key="dashboard" onNavigate={navigate} />}
      </AnimatePresence>
    </main>
  );
}

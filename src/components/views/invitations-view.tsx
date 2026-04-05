'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useToast } from '@/hooks/use-toast';
import { QuickNav } from '@/components/quick-nav';
import {
  UserPlus,
  Mail,
  CheckCircle2,
  Clock,
  DollarSign,
  Send,
  Users,
  Star,
  Gift,
  Loader2,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  Zap,
  Trophy,
  Copy,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────
interface ViewProps {
  onNavigate: (view: 'landing' | 'signup' | 'login' | 'dashboard' | 'schema' | 'explore' | 'create-lead' | 'create-response' | 'video-detail' | 'profile' | 'leaderboard' | 'wallet' | 'rewards' | 'invitations') => void;
}

interface InvitationStats {
  totalSent: number;
  totalAccepted: number;
  totalPending: number;
  totalRewarded: number;
  totalRewardAmount: number;
}

interface InvitationItem {
  id: string;
  inviteeEmail: string;
  videoId: string | null;
  status: string;
  rewardGiven: boolean;
  createdAt: string;
  respondedAt: string | null;
  video?: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
  } | undefined;
}

type StatusFilter = 'all' | 'pending' | 'accepted' | 'expired';

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// ─── Status Badge Config ──────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  sent: { label: 'Sent', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50' },
  clicked: { label: 'Clicked', className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/50' },
  responded: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400 border-gray-200 dark:border-gray-700/50' },
};

// ─── Component ────────────────────────────────────────────────────
export function InvitationsView({ onNavigate }: ViewProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();

  // Stats
  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Single invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteVideoId, setInviteVideoId] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Bulk invite form
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkVideoId, setBulkVideoId] = useState('');
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ createdCount: number; skippedCount: number; skippedEmails: string[] } | null>(null);
  const [showBulk, setShowBulk] = useState(false);

  // Invitations list
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ─── Fetch Stats ────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/invitations/stats', {
        headers: { 'X-User-Id': currentUser.id },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data);
      }
    } catch {
      // Silent fail
    } finally {
      setStatsLoading(false);
    }
  }, [currentUser]);

  // ─── Fetch Invitations List ─────────────────────────────────────
  const fetchInvitations = useCallback(async (page: number = 1, filter: StatusFilter = 'all') => {
    if (!currentUser) return;
    setListLoading(true);
    try {
      let statusParam: string | undefined;
      if (filter === 'pending') statusParam = 'sent';
      else if (filter === 'accepted') statusParam = 'responded';
      else if (filter === 'expired') statusParam = 'expired';

      const params = new URLSearchParams({ type: 'sent', page: String(page), limit: '10' });
      if (statusParam) params.set('status', statusParam);

      const res = await fetch(`/api/invitations?${params.toString()}`, {
        headers: { 'X-User-Id': currentUser.id },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setInvitations(json.data);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages);
        }
      }
    } catch {
      // Silent fail
    } finally {
      setListLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchStats();
      fetchInvitations(1, statusFilter);
    }
  }, [currentUser, fetchStats, fetchInvitations, statusFilter]);

  // ─── Send Single Invitation ─────────────────────────────────────
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setSendingInvite(true);
    try {
      const body: { inviteeEmail: string; videoId?: string } = {
        inviteeEmail: inviteEmail.trim().toLowerCase(),
      };
      if (inviteVideoId.trim()) {
        body.videoId = inviteVideoId.trim();
      }

      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || '',
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast({
          title: 'Invitation failed',
          description: json.error || 'Something went wrong',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Invitation sent! 🎉',
        description: `Invitation sent to ${inviteEmail.trim().toLowerCase()}. +10 points earned!`,
      });

      setInviteEmail('');
      setInviteVideoId('');
      setEmailError('');
      fetchStats();
      fetchInvitations(1, statusFilter);
      setCurrentPage(1);
    } catch {
      toast({
        title: 'Network error',
        description: 'Please check your connection and try again',
        variant: 'destructive',
      });
    } finally {
      setSendingInvite(false);
    }
  };

  // ─── Send Bulk Invitations ──────────────────────────────────────
  const handleBulkInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkResult(null);

    const emailList = bulkEmails
      .split(/[,;\n]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emailList.length === 0) {
      toast({
        title: 'No emails provided',
        description: 'Enter at least one email address',
        variant: 'destructive',
      });
      return;
    }

    setSendingBulk(true);
    try {
      const body: { emails: string[]; videoId?: string } = { emails: emailList };
      if (bulkVideoId.trim()) {
        body.videoId = bulkVideoId.trim();
      }

      const res = await fetch('/api/invitations/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || '',
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast({
          title: 'Bulk invite failed',
          description: json.error || 'Something went wrong',
          variant: 'destructive',
        });
        return;
      }

      const data = json.data;
      setBulkResult({
        createdCount: data.createdCount,
        skippedCount: data.skippedCount,
        skippedEmails: data.skippedEmails || [],
      });

      toast({
        title: `Bulk invite sent! 🎉`,
        description: `${data.createdCount} invitation${data.createdCount !== 1 ? 's' : ''} sent, +${data.scorePointsEarned} points earned!`,
      });

      if (data.createdCount > 0) {
        setBulkEmails('');
        setBulkVideoId('');
        fetchStats();
        fetchInvitations(1, statusFilter);
        setCurrentPage(1);
      }
    } catch {
      toast({
        title: 'Network error',
        description: 'Please check your connection and try again',
        variant: 'destructive',
      });
    } finally {
      setSendingBulk(false);
    }
  };

  // ─── Handle Filter Change ───────────────────────────────────────
  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  // ─── Unauthenticated State ──────────────────────────────────────
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
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-md shadow-orange-500/20">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Invite Friends</CardTitle>
            <CardDescription>Sign in to invite friends and earn rewards</CardDescription>
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

  // ─── Stats Cards Data ───────────────────────────────────────────
  const statCards = [
    {
      icon: Mail,
      label: 'Total Sent',
      value: stats?.totalSent ?? 0,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/50',
    },
    {
      icon: CheckCircle2,
      label: 'Accepted',
      value: stats?.totalAccepted ?? 0,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      icon: Clock,
      label: 'Pending',
      value: stats?.totalPending ?? 0,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    },
    {
      icon: DollarSign,
      label: 'Rewards Earned',
      value: `$${(stats?.totalRewardAmount ?? 0).toFixed(2)}`,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/50',
    },
  ];

  // ─── Status Filter Tabs ─────────────────────────────────────────
  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'expired', label: 'Expired' },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="min-h-screen px-4 py-8 max-w-4xl mx-auto"
    >
      {/* ─── 1. Header with Back Button ──────────────────────────── */}
      <motion.div
        variants={staggerItem}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="shrink-0">
            <span className="text-sm">Back to Dashboard</span>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-orange-500" />
              <h1 className="text-2xl font-bold">Invite Friends</h1>
            </div>
            <p className="text-sm text-muted-foreground">Grow the community and earn rewards</p>
          </div>
        </div>
      </motion.div>

      <QuickNav onNavigate={onNavigate} activeView="invitations" />

      {/* ─── 2. Invitation Stats Cards ───────────────────────────── */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statsLoading ? (
          <div className="col-span-4 flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : (
          statCards.map((stat) => (
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
          ))
        )}
      </motion.div>

      {/* ─── 3. Send Invitation Form ─────────────────────────────── */}
      <motion.div variants={staggerItem} className="mb-8">
        <Card className="border-2 border-orange-200 dark:border-orange-800/40 bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Send an Invitation</CardTitle>
                <CardDescription>Invite a friend to join FeedMeForward</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Friend&apos;s Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="friend@example.com"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  aria-invalid={!!emailError}
                  className="bg-background/80"
                />
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-video-id">
                  Video ID <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="invite-video-id"
                  placeholder="Link to a specific poll (optional)"
                  value={inviteVideoId}
                  onChange={(e) => setInviteVideoId(e.target.value)}
                  className="bg-background/80"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20"
                disabled={sendingInvite || !inviteEmail.trim()}
              >
                {sendingInvite ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </form>

            {/* Bulk invite toggle */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground gap-2"
                onClick={() => setShowBulk(!showBulk)}
              >
                <Users className="w-4 h-4" />
                {showBulk ? 'Hide Bulk Invite' : 'Invite multiple friends at once'}
                <motion.div
                  animate={{ rotate: showBulk ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ArrowRight className="w-3 h-3" />
                </motion.div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 4. Bulk Invite Section ──────────────────────────────── */}
      {showBulk && (
        <motion.div
          variants={staggerItem}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-8 overflow-hidden"
        >
          <Card className="border-2 border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Bulk Invite</CardTitle>
                  <CardDescription>Invite up to 10 friends at once (comma-separated)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-emails">Email Addresses</Label>
                  <textarea
                    id="bulk-emails"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    placeholder="Enter emails separated by commas or new lines...&#10;friend1@example.com, friend2@example.com"
                    value={bulkEmails}
                    onChange={(e) => {
                      setBulkEmails(e.target.value);
                      setBulkResult(null);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple emails with commas or new lines. Max 10 per request.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulk-video-id">
                    Video ID <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="bulk-video-id"
                    placeholder="Link to a specific poll (optional)"
                    value={bulkVideoId}
                    onChange={(e) => setBulkVideoId(e.target.value)}
                    className="bg-background/80"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/20"
                  disabled={sendingBulk || !bulkEmails.trim()}
                >
                  {sendingBulk ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Bulk Invites...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Bulk Invites
                    </>
                  )}
                </Button>
              </form>

              {/* Bulk Results */}
              {bulkResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 rounded-lg bg-background/60 border border-border/50"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {bulkResult.createdCount} sent
                      </span>
                    </div>
                    {bulkResult.skippedCount > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          {bulkResult.skippedCount} skipped
                        </span>
                      </div>
                    )}
                  </div>
                  {bulkResult.skippedEmails.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Skipped emails:</p>
                      <div className="flex flex-wrap gap-1">
                        {bulkResult.skippedEmails.map((email) => (
                          <Badge key={email} variant="outline" className="text-[10px] px-1.5 py-0">
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── 5. Recent Invitations ───────────────────────────────── */}
      <motion.div variants={staggerItem} className="mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recent Invitations</CardTitle>
                  <CardDescription>Your sent invitations and their status</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Tab Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              {filterTabs.map((tab) => (
                <Button
                  key={tab.key}
                  variant={statusFilter === tab.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange(tab.key)}
                  className={
                    statusFilter === tab.key
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                      : ''
                  }
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Loading State */}
            {listLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500 mb-2" />
                <p className="text-sm text-muted-foreground">Loading invitations...</p>
              </div>
            ) : invitations.length === 0 ? (
              /* Empty State */
              <div className="text-center py-10">
                <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">No invitations found</p>
                <p className="text-xs text-muted-foreground">
                  {statusFilter === 'all'
                    ? 'Start by inviting your friends using the form above!'
                    : `No ${statusFilter} invitations to show.`}
                </p>
                {statusFilter !== 'all' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => handleFilterChange('all')}
                  >
                    View All Invitations
                  </Button>
                )}
              </div>
            ) : (
              /* Invitation List */
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {invitations.map((inv) => {
                  const statusConf = STATUS_CONFIG[inv.status] || STATUS_CONFIG.sent;
                  return (
                    <motion.div
                      key={inv.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors border border-border/30"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{inv.inviteeEmail}</p>
                            {inv.rewardGiven && (
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`text-[10px] px-1.5 py-0 border ${statusConf.className}`}>
                              {statusConf.label}
                            </Badge>
                            {inv.video && (
                              <span className="text-xs text-muted-foreground truncate max-w-[160px]" title={inv.video.title}>
                                {inv.video.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs text-muted-foreground">
                          {new Date(inv.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        {inv.rewardGiven && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">+$2.00</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Load More */}
            {!listLoading && invitations.length > 0 && currentPage < totalPages && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const nextPage = currentPage + 1;
                    setCurrentPage(nextPage);
                    fetchInvitations(nextPage, statusFilter);
                  }}
                >
                  Load More
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 6. Reward Info Card ─────────────────────────────────── */}
      <motion.div variants={staggerItem} className="mb-8">
        <Card className="border-2 border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/80 to-orange-50/50 dark:from-emerald-950/20 dark:to-orange-950/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">How Rewards Work</CardTitle>
                <CardDescription>Earn points and wallet rewards for every successful invitation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: Send,
                  title: 'Send an Invite',
                  reward: '+10 points',
                  desc: 'Every invitation you send earns you 10 member score points instantly.',
                  color: 'from-orange-400 to-amber-500',
                  bgColor: 'bg-orange-50 dark:bg-orange-950/50',
                },
                {
                  icon: CheckCircle2,
                  title: 'Friend Accepts',
                  reward: '+50 points + $2',
                  desc: 'When your friend accepts, you earn 50 bonus points and a $2.00 wallet reward.',
                  color: 'from-emerald-400 to-green-500',
                  bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
                },
                {
                  icon: AlertCircle,
                  title: 'Daily Limit',
                  reward: '50 invites/day',
                  desc: 'You can send up to 50 invitations per day. Plan your invites wisely!',
                  color: 'from-amber-400 to-orange-500',
                  bgColor: 'bg-amber-50 dark:bg-amber-950/50',
                },
              ].map((item) => (
                <div key={item.title} className={`${item.bgColor} rounded-lg p-4`}>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-3`}>
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">{item.reward}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => onNavigate('rewards')}
            >
              <Trophy className="w-4 h-4" />
              View Full Rewards Center
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <motion.div variants={staggerItem} className="text-center py-6">
        <p className="text-xs text-muted-foreground">
          FeedMeForward Invitations &mdash; Grow the community, earn rewards
        </p>
      </motion.div>
    </motion.div>
  );
}

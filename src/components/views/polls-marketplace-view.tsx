'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import {
  useMarketplaceStore,
  type MarketplaceListing,
  type MarketplaceApplication,
  type QualificationCriteria,
  type CreateListingInput,
  type ApplicationStatus,
  type ListingStatus,
} from '@/stores/marketplace-store';
import {
  DollarSign,
  Coins,
  Users,
  Clock,
  ShieldCheck,
  MapPin,
  Target,
  Star,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Send,
  Plus,
  Loader2,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Briefcase,
  FileText,
  UserCheck,
  UserX,
  ArrowRight,
  BadgeCheck,
  Award,
  CalendarDays,
  MessageSquare,
  BarChart3,
  CircleDollarSign,
  Sparkles,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────

interface PollsMarketplaceViewProps {
  onNavigate: (view: string) => void;
}

// ─── Animation Variants ────────────────────────────────────────────

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// ─── Helpers ───────────────────────────────────────────────────────

function formatTimeRemaining(closesAt: string | null): string {
  if (!closesAt) return 'No deadline';
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return 'Closed';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m remaining`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusColor(status: ApplicationStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case 'accepted':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'declined':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    case 'completed':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getListingStatusColor(status: ListingStatus): string {
  switch (status) {
    case 'open':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'paused':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case 'closed':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    case 'completed':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function buildQualificationBadges(criteria: QualificationCriteria): { label: string; color: string }[] {
  const badges: { label: string; color: string }[] = [];
  if (criteria.minScore) {
    badges.push({
      label: `${criteria.minScore}+ Score`,
      color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    });
  }
  if (criteria.verifiedOnly) {
    badges.push({
      label: 'Verified Only',
      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    });
  }
  if (criteria.minPollResponses) {
    badges.push({
      label: `${criteria.minPollResponses}+ Polls`,
      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    });
  }
  if (criteria.location) {
    badges.push({
      label: criteria.location,
      color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    });
  }
  if (criteria.ageRange && criteria.ageRange !== 'All') {
    badges.push({
      label: `Age ${criteria.ageRange}`,
      color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    });
  }
  if (criteria.gender && criteria.gender !== 'All') {
    badges.push({
      label: criteria.gender,
      color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
    });
  }
  if (criteria.interests && criteria.interests.length > 0) {
    badges.push({
      label: `${criteria.interests.length} interest${criteria.interests.length > 1 ? 's' : ''}`,
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    });
  }
  return badges;
}

// ─── Component ─────────────────────────────────────────────────────

export function PollsMarketplaceView({ onNavigate }: PollsMarketplaceViewProps) {
  const { currentUser } = useAuthStore();
  const store = useMarketplaceStore();

  const [activeTab, setActiveTab] = useState('available');

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);

  // Apply dialog
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyListingId, setApplyListingId] = useState<string | null>(null);
  const [coverMessage, setCoverMessage] = useState('');

  // Review dialog
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewListingId, setReviewListingId] = useState<string | null>(null);

  // Expanded my-listings
  const [expandedListingId, setExpandedListingId] = useState<string | null>(null);

  // ─── Create form state ─────────────────────────────────────────

  const [createForm, setCreateForm] = useState<CreateListingInput>({
    title: '',
    description: '',
    rewardPerResponse: 0,
    totalSlots: 0,
    qualificationCriteria: {
      minScore: null,
      verifiedOnly: false,
      minPollResponses: null,
      location: null,
      ageRange: null,
      gender: null,
      interests: null,
    },
    closesAt: null,
  });

  const [interestsInput, setInterestsInput] = useState('');

  const totalBudget = useMemo(
    () => (createForm.rewardPerResponse ?? 0) * (createForm.totalSlots ?? 0),
    [createForm.rewardPerResponse, createForm.totalSlots]
  );

  // ─── Data fetching ─────────────────────────────────────────────

  const fetchListings = useCallback(async () => {
    await store.fetchListings();
  }, [store]);

  const fetchMyApplications = useCallback(async () => {
    if (currentUser?.id) {
      await store.fetchMyApplications(currentUser.id);
    }
  }, [store, currentUser]);

  const fetchMyListings = useCallback(async () => {
    if (currentUser?.id) {
      await store.fetchMyListings(currentUser.id);
    }
  }, [store, currentUser]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (activeTab === 'my-applications') {
      fetchMyApplications();
    }
  }, [activeTab, fetchMyApplications]);

  useEffect(() => {
    if (activeTab === 'my-listings') {
      fetchMyListings();
    }
  }, [activeTab, fetchMyListings]);

  // ─── Qualification checks ──────────────────────────────────────

  useEffect(() => {
    if (store.listings.length > 0 && currentUser) {
      store.listings.forEach((listing) => {
        if (!store.qualificationChecks[listing.id]) {
          store.checkQualification(listing.id, listing.qualificationCriteria);
        }
      });
    }
  }, [store.listings, currentUser]);

  // ─── Handlers ──────────────────────────────────────────────────

  const handleOpenDetail = async (listing: MarketplaceListing) => {
    setSelectedListing(listing);
    setDetailOpen(true);
    await store.fetchListing(listing.id);
    if (store.currentListing) {
      store.checkQualification(listing.id, store.currentListing.qualificationCriteria);
    }
  };

  const handleOpenApply = (listingId: string) => {
    setApplyListingId(listingId);
    setCoverMessage('');
    setApplyOpen(true);
  };

  const handleApply = async () => {
    if (!applyListingId || !coverMessage.trim()) {
      toast.error('Please write a cover message');
      return;
    }
    const success = await store.applyToListing(applyListingId, coverMessage.trim());
    if (success) {
      toast.success('Application submitted! You will be notified when reviewed.');
      setApplyOpen(false);
      setCoverMessage('');
      fetchMyApplications();
    } else {
      toast.error('Failed to submit application. You may have already applied.');
    }
  };

  const handleOpenReview = async (listingId: string) => {
    setReviewListingId(listingId);
    setReviewOpen(true);
    await store.fetchApplications(listingId);
  };

  const handleReview = async (applicationId: string, action: 'accept' | 'decline') => {
    const success = await store.reviewApplication(applicationId, action);
    if (success) {
      toast.success(action === 'accept' ? 'Application accepted!' : 'Application declined.');
      fetchMyListings();
    } else {
      toast.error('Failed to review application.');
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('Please sign in to create a listing');
      return;
    }
    if (!createForm.title.trim() || !createForm.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    if ((createForm.rewardPerResponse ?? 0) <= 0) {
      toast.error('Reward per response must be greater than $0.00');
      return;
    }
    if ((createForm.totalSlots ?? 0) <= 0) {
      toast.error('Total slots must be greater than 0');
      return;
    }

    const parsedInterests = interestsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const data: CreateListingInput = {
      ...createForm,
      qualificationCriteria: {
        ...createForm.qualificationCriteria,
        interests: parsedInterests.length > 0 ? parsedInterests : null,
      },
    };

    const listing = await store.createListing(data);
    if (listing) {
      toast.success('Listing published successfully! 🎉');
      setCreateForm({
        title: '',
        description: '',
        rewardPerResponse: 0,
        totalSlots: 0,
        qualificationCriteria: {
          minScore: null,
          verifiedOnly: false,
          minPollResponses: null,
          location: null,
          ageRange: null,
          gender: null,
          interests: null,
        },
        closesAt: null,
      });
      setInterestsInput('');
      setActiveTab('available');
    } else {
      toast.error('Failed to create listing. Please try again.');
    }
  };

  // ─── Stats computation ─────────────────────────────────────────

  const stats = useMemo(() => {
    const listings = store.listings;
    if (listings.length === 0) {
      return { total: 0, avgReward: 0, highestReward: 0 };
    }
    const total = listings.length;
    const avgReward = listings.reduce((sum, l) => sum + l.rewardPerResponse, 0) / total;
    const highestReward = Math.max(...listings.map((l) => l.rewardPerResponse));
    return { total, avgReward, highestReward };
  }, [store.listings]);

  // ─── Skeleton renderers ────────────────────────────────────────

  const renderListingSkeletons = (count: number) =>
    Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="overflow-hidden">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    ));

  const renderApplicationSkeletons = (count: number) =>
    Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </CardContent>
      </Card>
    ));

  // ─── Listing Card ──────────────────────────────────────────────

  const renderListingCard = (listing: MarketplaceListing) => {
    const qualBadges = buildQualificationBadges(listing.qualificationCriteria);
    const qualCheck = store.qualificationChecks[listing.id];
    const isQualified = qualCheck?.qualified !== false;
    const fillPercent = listing.totalSlots > 0
      ? Math.round((listing.filledSlots / listing.totalSlots) * 100)
      : 0;
    const timeRemaining = formatTimeRemaining(listing.closesAt);
    const isExpired = timeRemaining === 'Closed';

    return (
      <motion.div
        key={listing.id}
        variants={staggerItem}
        whileHover={{ y: -3 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Card
          className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border-0 bg-card h-full flex flex-col"
          onClick={() => handleOpenDetail(listing)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base font-bold line-clamp-1 leading-tight">
                {listing.title}
              </CardTitle>
              {isExpired ? (
                <Badge variant="outline" className="text-red-500 border-red-300 dark:border-red-700 shrink-0 text-[10px]">
                  Closed
                </Badge>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="shrink-0 text-[10px] gap-1">
                        <Clock className="w-3 h-3" />
                        {timeRemaining}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{listing.closesAt ? `Closes ${formatDate(listing.closesAt)}` : 'No deadline'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <CardDescription className="line-clamp-2 text-xs mt-1">
              {listing.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 space-y-3 pt-0">
            {/* ── Reward (most prominent) ── */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Coins className="w-5 h-5 text-emerald-500" />
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  ${listing.rewardPerResponse.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/60 font-medium">
                per response
              </p>
            </div>

            {/* ── Qualification badges ── */}
            {qualBadges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {qualBadges.map((badge) => (
                  <Badge
                    key={badge.label}
                    className={`${badge.color} text-[10px] px-2 py-0 border-0 font-medium`}
                  >
                    {badge.label}
                  </Badge>
                ))}
              </div>
            )}

            {/* ── Progress bar ── */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{listing.filledSlots}/{listing.totalSlots} filled</span>
                <span className="font-medium">{fillPercent}%</span>
              </div>
              <Progress value={fillPercent} className="h-1.5" />
            </div>

            {/* ── Creator info ── */}
            <div className="flex items-center gap-2 pt-1">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-[9px] font-bold overflow-hidden shrink-0">
                {listing.creatorAvatarUrl ? (
                  <img src={listing.creatorAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  (listing.creatorUsername ?? '?').charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-[11px] text-muted-foreground truncate">
                by @{listing.creatorUsername ?? 'unknown'}
              </span>
              {listing.creatorId === currentUser?.id && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                  Yours
                </Badge>
              )}
            </div>
          </CardContent>

          <CardFooter className="pt-0">
            {isExpired || listing.status === 'closed' || listing.status === 'completed' ? (
              <Button
                size="sm"
                className="w-full text-xs"
                variant="outline"
                disabled
                onClick={(e) => e.stopPropagation()}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                No longer accepting
              </Button>
            ) : isQualified ? (
              <Button
                size="sm"
                className="w-full text-xs bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-sm shadow-emerald-500/20 font-semibold"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenApply(listing.id);
                }}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Apply Now
              </Button>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs text-muted-foreground border-dashed"
                        disabled
                        onClick={(e) => e.stopPropagation()}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                        You don&apos;t qualify
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{qualCheck?.reasons?.join('. ') ?? 'You do not meet the requirements.'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    );
  };

  // ─── Main render ───────────────────────────────────────────────

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="min-h-screen px-4 py-8 max-w-6xl mx-auto"
    >
      {/* ── Header ── */}
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
              <CircleDollarSign className="w-6 h-6 text-emerald-500" />
              <h1 className="text-2xl font-bold">Polls Marketplace</h1>
            </div>
            <p className="text-sm text-muted-foreground">Get paid for your opinions & find quality respondents</p>
          </div>
        </div>
      </motion.div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="available" className="gap-1.5">
            <TrendingUp className="w-4 h-4" />
            Available
          </TabsTrigger>
          <TabsTrigger value="my-applications" className="gap-1.5">
            <FileText className="w-4 h-4" />
            My Applications
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Create Listing
          </TabsTrigger>
          <TabsTrigger value="my-listings" className="gap-1.5">
            <Briefcase className="w-4 h-4" />
            My Listings
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════
            TAB 1 — Available Listings
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="available">
          {/* Stats banner */}
          <motion.div
            variants={staggerItem}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
          >
            <Card className="bg-gradient-to-br from-emerald-50/80 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/10 border-emerald-200 dark:border-emerald-800/40">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Listings</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 border-amber-200 dark:border-amber-800/40">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Avg. Reward</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${stats.avgReward.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-violet-50/80 to-fuchsia-50/50 dark:from-violet-950/20 dark:to-fuchsia-950/10 border-violet-200 dark:border-violet-800/40">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-sm">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Highest Reward</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${stats.highestReward.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Loading */}
          {store.listingsLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderListingSkeletons(6)}
            </div>
          )}

          {/* Empty */}
          {!store.listingsLoading && store.listings.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <CircleDollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">No listings available</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  There are no paid poll opportunities right now. Be the first to post one!
                </p>
                <Button
                  className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                  onClick={() => setActiveTab('create')}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create a Listing
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Grid */}
          {!store.listingsLoading && store.listings.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {store.listings.map((listing) => renderListingCard(listing))}
            </motion.div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            TAB 2 — My Applications
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="my-applications">
          {!currentUser ? (
            <Card>
              <CardContent className="p-12 text-center">
                <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">Sign in required</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sign in to track your poll applications and earnings.
                </p>
                <Button
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  onClick={() => onNavigate('login')}
                >
                  Sign In
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {store.myApplicationsLoading && (
                <div className="space-y-3 max-w-2xl">
                  {renderApplicationSkeletons(4)}
                </div>
              )}

              {!store.myApplicationsLoading && store.myApplications.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-1">You haven&apos;t applied to any polls yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Browse the marketplace and apply to paid poll opportunities to start earning.
                    </p>
                    <Button
                      className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                      onClick={() => setActiveTab('available')}
                    >
                      <TrendingUp className="w-4 h-4 mr-1.5" />
                      Browse Listings
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!store.myApplicationsLoading && store.myApplications.length > 0 && (
                <AnimatePresence mode="wait">
                  <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="space-y-3 max-w-2xl"
                  >
                    {store.myApplications.map((app) => {
                      const statusLabel = app.status.charAt(0).toUpperCase() + app.status.slice(1);
                      return (
                        <motion.div key={app.id} variants={staggerItem} layout>
                          <Card className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-sm line-clamp-1">
                                    {app.listingTitle ?? 'Untitled Listing'}
                                  </h3>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                      ${(app.listingRewardPerResponse ?? 0).toFixed(2)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      Applied {formatDate(app.createdAt)}
                                    </span>
                                  </div>
                                </div>
                                <Badge className={`${getStatusColor(app.status)} text-xs shrink-0 font-medium`}>
                                  {statusLabel}
                                </Badge>
                              </div>

                              {app.status === 'pending' && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Waiting for review...
                                </p>
                              )}

                              <div className="mt-3">
                                {app.status === 'accepted' && (
                                  <Button
                                    size="sm"
                                    className="text-xs bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                                    onClick={() => toast.info('Poll completion coming soon!')}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                    Complete Poll
                                    <ArrowRight className="w-3 h-3 ml-1.5" />
                                  </Button>
                                )}
                                {app.status === 'completed' && (
                                  <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-0 text-xs">
                                    <DollarSign className="w-3 h-3 mr-1" />
                                    Reward earned!
                                  </Badge>
                                )}
                                {app.status === 'declined' && (
                                  <p className="text-xs text-muted-foreground">
                                    This application was not selected. Keep applying to other opportunities!
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              )}
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            TAB 3 — Create Listing
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="create">
          {!currentUser ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">Sign in required</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You need an account to post paid poll opportunities.
                </p>
                <Button
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  onClick={() => onNavigate('login')}
                >
                  Sign In
                </Button>
              </CardContent>
            </Card>
          ) : (
            <motion.div variants={staggerItem} className="max-w-2xl">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Post a Paid Poll Opportunity</CardTitle>
                      <CardDescription>Set your requirements and reward to attract quality respondents</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateListing} className="space-y-6">
                    {/* ── Basic Info ── */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        Listing Details
                      </h3>
                      <div className="space-y-2">
                        <Label htmlFor="listing-title">Title <span className="text-red-500">*</span></Label>
                        <Input
                          id="listing-title"
                          placeholder="e.g., Consumer preferences for streaming services"
                          value={createForm.title}
                          onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                          required
                          maxLength={120}
                        />
                        <p className="text-xs text-muted-foreground">{createForm.title.length}/120 characters</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="listing-desc">Description <span className="text-red-500">*</span></Label>
                        <Textarea
                          id="listing-desc"
                          placeholder="Describe what the poll is about, what kind of respondents you're looking for, and any special instructions..."
                          value={createForm.description}
                          onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                          required
                          rows={4}
                          maxLength={1000}
                        />
                        <p className="text-xs text-muted-foreground">{createForm.description.length}/1000 characters</p>
                      </div>
                    </div>

                    <Separator />

                    {/* ── Qualification Criteria ── */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                        Qualification Criteria
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Set requirements that applicants must meet. Leave blank for no restrictions.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="min-score">Min Member Score</Label>
                          <Input
                            id="min-score"
                            type="number"
                            placeholder="e.g., 500"
                            min={0}
                            max={1000}
                            value={createForm.qualificationCriteria.minScore ?? ''}
                            onChange={(e) =>
                              setCreateForm((p) => ({
                                ...p,
                                qualificationCriteria: {
                                  ...p.qualificationCriteria,
                                  minScore: e.target.value ? Number(e.target.value) : null,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="min-polls">Min Poll Responses</Label>
                          <Input
                            id="min-polls"
                            type="number"
                            placeholder="e.g., 10"
                            min={0}
                            value={createForm.qualificationCriteria.minPollResponses ?? ''}
                            onChange={(e) =>
                              setCreateForm((p) => ({
                                ...p,
                                qualificationCriteria: {
                                  ...p.qualificationCriteria,
                                  minPollResponses: e.target.value ? Number(e.target.value) : null,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            placeholder="e.g., Lagos, Abuja"
                            value={createForm.qualificationCriteria.location ?? ''}
                            onChange={(e) =>
                              setCreateForm((p) => ({
                                ...p,
                                qualificationCriteria: {
                                  ...p.qualificationCriteria,
                                  location: e.target.value.trim() || null,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="interests">Interests</Label>
                          <Input
                            id="interests"
                            placeholder="e.g., tech, music, sports"
                            value={interestsInput}
                            onChange={(e) => setInterestsInput(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">Comma-separated</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Age Range</Label>
                          <Select
                            value={createForm.qualificationCriteria.ageRange ?? 'all'}
                            onValueChange={(val) =>
                              setCreateForm((p) => ({
                                ...p,
                                qualificationCriteria: {
                                  ...p.qualificationCriteria,
                                  ageRange: val === 'all' ? null : val,
                                },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any age" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Any Age</SelectItem>
                              <SelectItem value="18-25">18 – 25</SelectItem>
                              <SelectItem value="25-40">25 – 40</SelectItem>
                              <SelectItem value="40-55">40 – 55</SelectItem>
                              <SelectItem value="55+">55+</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Gender</Label>
                          <Select
                            value={createForm.qualificationCriteria.gender ?? 'All'}
                            onValueChange={(val) =>
                              setCreateForm((p) => ({
                                ...p,
                                qualificationCriteria: {
                                  ...p.qualificationCriteria,
                                  gender: val === 'All' ? null : val,
                                },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All genders" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="All">All</SelectItem>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <Label htmlFor="verified-only" className="text-sm">Verified Only</Label>
                          <p className="text-xs text-muted-foreground">Only verified members can apply</p>
                        </div>
                        <Switch
                          id="verified-only"
                          checked={createForm.qualificationCriteria.verifiedOnly ?? false}
                          onCheckedChange={(checked) =>
                            setCreateForm((p) => ({
                              ...p,
                              qualificationCriteria: {
                                ...p.qualificationCriteria,
                                verifiedOnly: checked,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* ── Compensation ── */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        Compensation
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="reward">
                            Reward Per Response <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
                            <Input
                              id="reward"
                              type="number"
                              placeholder="5.00"
                              min={0.01}
                              step={0.01}
                              className="pl-7"
                              value={createForm.rewardPerResponse || ''}
                              onChange={(e) =>
                                setCreateForm((p) => ({
                                  ...p,
                                  rewardPerResponse: e.target.value ? Number(e.target.value) : 0,
                                }))
                              }
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="slots">
                            Total Slots <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="slots"
                            type="number"
                            placeholder="200"
                            min={1}
                            value={createForm.totalSlots || ''}
                            onChange={(e) =>
                              setCreateForm((p) => ({
                                ...p,
                                totalSlots: e.target.value ? Number(e.target.value) : 0,
                              }))
                            }
                            required
                          />
                        </div>
                      </div>

                      {/* Auto-calculated budget */}
                      <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CircleDollarSign className="w-5 h-5 text-emerald-500" />
                            <span className="text-sm font-medium">Total Budget</span>
                          </div>
                          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            ${totalBudget.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Auto-calculated: ${createForm.rewardPerResponse?.toFixed(2) ?? '0.00'} x {createForm.totalSlots ?? 0} slots
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="closes-at">Closes At (optional)</Label>
                        <Input
                          id="closes-at"
                          type="datetime-local"
                          value={createForm.closesAt ?? ''}
                          onChange={(e) =>
                            setCreateForm((p) => ({
                              ...p,
                              closesAt: e.target.value || null,
                            }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">Leave blank for no deadline</p>
                      </div>
                    </div>

                    {/* ── Submit ── */}
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-md shadow-emerald-500/20 font-semibold"
                      disabled={
                        store.creatingListing ||
                        !createForm.title.trim() ||
                        !createForm.description.trim() ||
                        (createForm.rewardPerResponse ?? 0) <= 0 ||
                        (createForm.totalSlots ?? 0) <= 0
                      }
                    >
                      {store.creatingListing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Coins className="w-4 h-4 mr-2" />
                          Publish Listing — ${totalBudget.toFixed(2)} Budget
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            TAB 4 — My Listings (Creator Dashboard)
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="my-listings">
          {!currentUser ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">Sign in required</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sign in to manage your listings and review applicants.
                </p>
                <Button
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  onClick={() => onNavigate('login')}
                >
                  Sign In
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {store.myListingsLoading && (
                <div className="space-y-3 max-w-3xl">
                  {renderApplicationSkeletons(4)}
                </div>
              )}

              {!store.myListingsLoading && store.myListings.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-1">You haven&apos;t posted any listings yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first paid poll listing to start finding quality respondents.
                    </p>
                    <Button
                      className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                      onClick={() => setActiveTab('create')}
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Create Listing
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!store.myListingsLoading && store.myListings.length > 0 && (
                <AnimatePresence mode="wait">
                  <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="space-y-3 max-w-3xl"
                  >
                    {store.myListings.map((listing) => {
                      const isExpanded = expandedListingId === listing.id;
                      const fillPercent = listing.totalSlots > 0
                        ? Math.round((listing.filledSlots / listing.totalSlots) * 100)
                        : 0;
                      const spent = listing.filledSlots * listing.rewardPerResponse;

                      return (
                        <motion.div key={listing.id} variants={staggerItem} layout>
                          <Card className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              {/* Top row */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold text-sm line-clamp-1">{listing.title}</h3>
                                    <Badge className={`${getListingStatusColor(listing.status)} text-[10px] font-medium`}>
                                      {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 mt-2">
                                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                      ${listing.rewardPerResponse.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">per response</span>
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0"
                                  onClick={() =>
                                    setExpandedListingId(isExpanded ? null : listing.id)
                                  }
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>

                              {/* Stats row */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                <div className="text-center p-2 rounded-lg bg-muted/50">
                                  <p className="text-xs text-muted-foreground">Slots</p>
                                  <p className="text-sm font-bold">{listing.filledSlots}/{listing.totalSlots}</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-muted/50">
                                  <p className="text-xs text-muted-foreground">Applications</p>
                                  <p className="text-sm font-bold">{listing.applicationsCount}</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-muted/50">
                                  <p className="text-xs text-muted-foreground">Total Spent</p>
                                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${spent.toFixed(2)}</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-muted/50">
                                  <p className="text-xs text-muted-foreground">Fill Rate</p>
                                  <p className="text-sm font-bold">{fillPercent}%</p>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="mt-3">
                                <Progress value={fillPercent} className="h-1.5" />
                              </div>

                              {/* Expanded section */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <Separator className="my-4" />
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-sm font-semibold flex items-center gap-2">
                                        <Users className="w-4 h-4 text-muted-foreground" />
                                        Applications
                                        {listing.applicationsCount > 0 && (
                                          <Badge variant="outline" className="text-xs">
                                            {listing.applicationsCount}
                                          </Badge>
                                        )}
                                      </h4>
                                      {listing.applicationsCount > 0 && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs gap-1.5"
                                          onClick={() => handleOpenReview(listing.id)}
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          Review Applicants
                                        </Button>
                                      )}
                                    </div>
                                    {listing.applicationsCount === 0 && (
                                      <p className="text-xs text-muted-foreground text-center py-4">
                                        No applications yet. Share your listing to attract respondents!
                                      </p>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════
          DIALOG — Listing Detail
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedListing && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg line-clamp-2">{selectedListing.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Reward banner */}
                <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Coins className="w-6 h-6 text-white" />
                    <span className="text-3xl font-extrabold text-white">
                      ${selectedListing.rewardPerResponse.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-emerald-100 text-sm mt-1">reward per response</p>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-semibold mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedListing.description}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Slots</p>
                    <p className="text-sm font-bold">{selectedListing.filledSlots}/{selectedListing.totalSlots}</p>
                    <Progress
                      value={
                        selectedListing.totalSlots > 0
                          ? Math.round((selectedListing.filledSlots / selectedListing.totalSlots) * 100)
                          : 0
                      }
                      className="h-1.5 mt-1"
                    />
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground">Total Budget</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      ${selectedListing.totalBudget.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="w-4 h-4" />
                  <span>
                    {selectedListing.closesAt
                      ? `Closes ${formatDate(selectedListing.closesAt)} (${formatTimeRemaining(selectedListing.closesAt)})`
                      : 'No deadline'}
                  </span>
                </div>

                {/* Qualification badges */}
                {buildQualificationBadges(selectedListing.qualificationCriteria).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Requirements</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {buildQualificationBadges(selectedListing.qualificationCriteria).map((b) => (
                        <Badge key={b.label} className={`${b.color} text-xs border-0 font-medium`}>
                          {b.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Qualification check result */}
                {currentUser && store.qualificationChecks[selectedListing.id] && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      store.qualificationChecks[selectedListing.id].qualified
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {store.qualificationChecks[selectedListing.id].qualified ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-medium">You qualify for this listing!</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          <span className="font-medium">You don&apos;t qualify</span>
                        </div>
                        {store.qualificationChecks[selectedListing.id].reasons.map((r, i) => (
                          <p key={i} className="text-xs ml-6">{r}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Creator */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                    {selectedListing.creatorAvatarUrl ? (
                      <img src={selectedListing.creatorAvatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (selectedListing.creatorUsername ?? '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {selectedListing.creatorDisplayName ?? selectedListing.creatorUsername ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Posted {formatDate(selectedListing.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                {selectedListing.status !== 'closed' &&
                  selectedListing.status !== 'completed' &&
                  formatTimeRemaining(selectedListing.closesAt) !== 'Closed' &&
                  store.qualificationChecks[selectedListing.id]?.qualified && (
                    <Button
                      className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                      onClick={() => {
                        setDetailOpen(false);
                        handleOpenApply(selectedListing.id);
                      }}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Apply Now
                    </Button>
                  )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          DIALOG — Apply to Listing
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-500" />
              Apply to Listing
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-lg p-3 text-center">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                ${store.listings.find((l) => l.id === applyListingId)?.rewardPerResponse.toFixed(2) ?? '0.00'}
              </span>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60">per response</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cover-message">Cover Message</Label>
              <Textarea
                id="cover-message"
                placeholder="Introduce yourself and explain why you're a good fit for this poll..."
                value={coverMessage}
                onChange={(e) => setCoverMessage(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{coverMessage.length}/500</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
              disabled={store.applyingToListing || !coverMessage.trim()}
              onClick={handleApply}
            >
              {store.applyingToListing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          DIALOG — Review Applicants
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              Review Applicants
            </DialogTitle>
          </DialogHeader>

          {store.listingApplicationsLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : store.listingApplications.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No applications to review yet.</p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {store.listingApplications.map((app) => {
                const statusLabel = app.status.charAt(0).toUpperCase() + app.status.slice(1);
                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                  >
                    <Card className="overflow-hidden">
                      <CardContent className="p-4 space-y-3">
                        {/* Applicant header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden shrink-0">
                              {app.applicantAvatarUrl ? (
                                <img src={app.applicantAvatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                (app.applicantUsername ?? '?').charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold">
                                  {app.applicantDisplayName ?? app.applicantUsername ?? 'Unknown'}
                                </span>
                                {app.applicantVerified && (
                                  <BadgeCheck className="w-4 h-4 text-emerald-500" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                @{app.applicantUsername ?? 'unknown'}
                              </p>
                            </div>
                          </div>
                          <Badge className={`${getStatusColor(app.status)} text-[10px] font-medium shrink-0`}>
                            {statusLabel}
                          </Badge>
                        </div>

                        {/* Credentials */}
                        <div className="flex flex-wrap gap-2">
                          {app.applicantScore !== undefined && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Star className="w-3 h-3 text-amber-500" />
                              {app.applicantScore} Score
                            </Badge>
                          )}
                          {app.applicantPollResponses !== undefined && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Target className="w-3 h-3" />
                              {app.applicantPollResponses} Polls
                            </Badge>
                          )}
                          {app.applicantFollowers !== undefined && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Users className="w-3 h-3" />
                              {app.applicantFollowers} Followers
                            </Badge>
                          )}
                        </div>

                        {/* Cover message */}
                        {app.coverMessage && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <MessageSquare className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">Cover Message</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {app.coverMessage}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-muted-foreground mr-auto">
                            Applied {formatDate(app.createdAt)}
                          </p>
                          {app.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                                disabled={store.reviewingApplication}
                                onClick={() => handleReview(app.id, 'accept')}
                              >
                                <UserCheck className="w-3.5 h-3.5 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                                disabled={store.reviewingApplication}
                                onClick={() => handleReview(app.id, 'decline')}
                              >
                                <UserX className="w-3.5 h-3.5 mr-1" />
                                Decline
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <motion.div variants={staggerItem} className="text-center py-8">
        <p className="text-xs text-muted-foreground">
          FeedMeForward Polls Marketplace &mdash; Get paid for your opinions
        </p>
      </motion.div>
    </motion.div>
  );
}

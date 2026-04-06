'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2,
  Calendar,
  Video,
  Users,
  MessageCircle,
  Award,
  Target,
  Flame,
  Zap,
  TrendingUp,
  BarChart3,
  UserPlus,
  Crown,
  Loader2,
  MapPin,
  Globe,
  Heart,
  Save,
  Pencil,
  X,
  BookmarkCheck,
  Bookmark,
  QrCode,
  Sparkles,
  ChevronRight,
  UserCheck,
  Clock,
  Briefcase,
  ExternalLink,
  Building2,
  LayoutDashboard,
  Mail,
  DollarSign,
  Layers,
} from 'lucide-react';
import { QRCodeDialog } from '@/components/qr/qr-code-dialog';
import { SubscribeButton } from '@/components/subscribe-button';
import { VideoCard } from '@/components/video-card';
import { FollowButton } from '@/components/follow-button';
import { UserBlockButton } from '@/components/user-block-button';
import { QuickNav } from '@/components/quick-nav';
import { useAuthStore } from '@/stores/auth-store';
import { useFollowStore } from '@/stores/follow-store';
import { useOnlinePresence } from '@/hooks/use-online-presence';
import {
  getScoreLevel,
  getScoreLevelColor,
  getScoreLevelBadge,
  getNextLevelThreshold,
  getPreviousLevelThreshold,
} from '@/types';
import type { Video } from '@/types';
import type { View } from '@/app/page';

interface ProfileViewProps {
  onNavigate: (view: View) => void;
  userId: string;
}

interface ProfileData {
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
  likedCount: number;
  savedCount: number;
  rank: number;
  mutualFollowCount?: number;
  businessName?: string;
  businessCategory?: string;
  businessEmail?: string;
  businessWebsite?: string;
  businessBio?: string;
  breakdown: {
    engagement: number;
    quality: number;
    accuracy: number;
    streak: number;
  };
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function getRoleBadge(role: string): { label: string; className: string } {
  switch (role) {
    case 'admin': return { label: 'Admin', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
    case 'moderator': return { label: 'Moderator', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
    case 'creator': return { label: 'Creator', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' };
    default: return { label: 'Member', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-300' };
  }
}

function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const level = getScoreLevel(score);
  const percentage = Math.min(100, (score / 1000) * 100);
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const strokeColors: Record<string, string> = {
    diamond: '#22d3ee',
    gold: '#f59e0b',
    silver: '#9ca3af',
    bronze: '#ea580c',
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Score ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColors[level] || '#ea580c'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-muted-foreground">/ 1000</span>
        <Badge className={`text-[9px] mt-1 ${getScoreLevelBadge(level).className}`}>
          {getScoreLevelBadge(level).label}
        </Badge>
      </div>
    </div>
  );
}

function ScoreBreakdownBar({
  label,
  value,
  max,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  max: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Icon className={`w-4 h-4 ${color.split(' ')[0]}`} />
          {label}
        </span>
        <span className="font-medium">{Math.round(value)}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
        />
      </div>
    </div>
  );
}

export function ProfileView({ onNavigate, userId }: ProfileViewProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [activeTab, setActiveTab] = useState('videos');
  const [likedVideos, setLikedVideos] = useState<Video[]>([]);
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [loadingLiked, setLoadingLiked] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Follow suggestions state
  const [suggestions, setSuggestions] = useState<Array<{
    id: string; username: string; displayName: string | null; avatarUrl: string | null;
    bio: string | null; memberScore: number; isVerified: boolean; followerCount: number; isFollowing: boolean;
  }>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Recent followers state (own profile only)
  const [recentFollowers, setRecentFollowers] = useState<Array<{
    id: string; username: string; displayName: string | null; avatarUrl: string | null;
    isVerified: boolean; followedAt: string; isFollowing: boolean;
  }>>([]);
  const [loadingRecentFollowers, setLoadingRecentFollowers] = useState(false);

  // Edit profile dialog state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    avatarUrl: '',
    interestsText: '',
    ageRange: '',
    location: '',
    gender: '',
    language: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileQrOpen, setProfileQrOpen] = useState(false);

  // Creator / business profile state
  const [businessProfile, setBusinessProfile] = useState<Record<string, string> | null>(null);
  const [subscriptionTiers, setSubscriptionTiers] = useState<Array<{ id: string; name: string; price: number; benefits: string[]; enabled: boolean }>>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(false);

  // Audience profile form state
  const [audienceForm, setAudienceForm] = useState({
    ageRange: '',
    location: '',
    gender: '',
    language: '',
    interestsText: '',
  });
  const [savingAudience, setSavingAudience] = useState(false);

  const isOwnProfile = currentUser?.id === userId;
  const isCreatorProfile = profileData?.role === 'creator';
  const canSubscribe = !isOwnProfile && isCreatorProfile && !!currentUser;

  // Fetch creator business profile data (for creator profiles)
  useEffect(() => {
    if (!profileData || profileData.role !== 'creator') return;
    setLoadingBusiness(true);
    Promise.all([
      fetch('/api/creator/business-profile', {
        headers: { 'X-User-Id': profileData.id },
 }).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/creator/tiers`, {
        headers: { 'X-User-Id': profileData.id },
      }).then((r) => r.json()).catch(() => ({})),
      currentUser && !isOwnProfile
        ? fetch(`/api/subscriptions?creatorId=${userId}`, {
            headers: { 'X-User-Id': currentUser.id },
          }).then((r) => r.json()).catch(() => ({}))
        : Promise.resolve({}),
    ]).then(([bpRes, tiersRes, subRes]) => {
      if (bpRes.profile) setBusinessProfile(bpRes.profile);
      if (tiersRes.tiers) setSubscriptionTiers(tiersRes.tiers);
      if (subRes.subscription) setCurrentSubscription(subRes.subscription);
 }).finally(() => setLoadingBusiness(false));
  }, [profileData, userId, currentUser, isOwnProfile]);

  // Online presence for other users' profiles
  const { isUserOnline } = useOnlinePresence(isOwnProfile ? [] : [userId]);
  const isOnline = !isOwnProfile && isUserOnline(userId);

  // Populate edit form when profile data loads
  useEffect(() => {
    if (profileData) {
      let interestsText = '';
      if ((profileData as Record<string, unknown>).interests) {
        try {
          const raw = (profileData as Record<string, unknown>).interests;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          interestsText = Array.isArray(parsed) ? parsed.join(', ') : '';
        } catch {
          interestsText = '';
        }
      }
      setEditForm({
        displayName: profileData.displayName || '',
        bio: profileData.bio || '',
        avatarUrl: profileData.avatarUrl || '',
        interestsText,
        ageRange: audienceForm.ageRange || '',
        location: audienceForm.location || '',
        gender: audienceForm.gender || '',
        language: audienceForm.language || '',
      });
    }
  }, [profileData, audienceForm.ageRange, audienceForm.location, audienceForm.gender, audienceForm.language]);

  const handleEditProfileOpen = (open: boolean) => {
    if (open && profileData) {
      let interestsText = '';
      if ((profileData as Record<string, unknown>).interests) {
        try {
          const raw = (profileData as Record<string, unknown>).interests;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          interestsText = Array.isArray(parsed) ? parsed.join(', ') : '';
        } catch {
          interestsText = '';
        }
      }
      setEditForm({
        displayName: profileData.displayName || '',
        bio: profileData.bio || '',
        avatarUrl: profileData.avatarUrl || '',
        interestsText,
        ageRange: audienceForm.ageRange || '',
        location: audienceForm.location || '',
        gender: audienceForm.gender || '',
        language: audienceForm.language || '',
      });
    }
    setEditProfileOpen(open);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setSavingProfile(true);
    try {
      const interestsArray = editForm.interestsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const body: Record<string, unknown> = {
        displayName: editForm.displayName,
        bio: editForm.bio,
        avatarUrl: editForm.avatarUrl,
        ageRange: editForm.ageRange,
        location: editForm.location,
        gender: editForm.gender,
        language: editForm.language,
        interests: interestsArray,
      };
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: 'Profile updated!', description: 'Your profile has been saved.' });
        useAuthStore.getState().refreshUser();
        // Refresh profile data
        setLoading(true);
        fetch(`/api/users/${userId}`)
          .then((r) => r.json())
          .then((j) => { if (j.success) setProfileData(j.data); })
          .catch(() => {})
          .finally(() => setLoading(false));
        setEditProfileOpen(false);
      } else {
        toast({ title: 'Update failed', description: json.error || 'Something went wrong', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', description: 'Failed to save profile', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setProfileData(json.data);
        } else {
          setError(json.error || 'Failed to load profile');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoadingVideos(true);
    fetch(`/api/videos?creatorId=${userId}&limit=30`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setVideos(json.data || []);
      })
      .catch(() => {})
      .finally(() => setLoadingVideos(false));
  }, [userId]);

  // Fetch liked videos (own profile only)
  useEffect(() => {
    if (!isOwnProfile) return;
    setLoadingLiked(true);
    fetch(`/api/users/${userId}/liked-videos?limit=30`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setLikedVideos(json.data || []); })
      .catch(() => {})
      .finally(() => setLoadingLiked(false));
  }, [userId, isOwnProfile]);

  // Fetch saved videos (own profile only)
  useEffect(() => {
    if (!isOwnProfile) return;
    setLoadingSaved(true);
    fetch(`/api/users/${userId}/saved-videos?limit=30`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setSavedVideos(json.data || []); })
      .catch(() => {})
      .finally(() => setLoadingSaved(false));
  }, [userId, isOwnProfile]);

  // Fetch audience profile data when profile loads
  useEffect(() => {
    if (!profileData) return;
    // Try to get audience fields from the profile data if available
    // These fields come from the extended user API
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          const d = json.data;
          let interestsText = '';
          if (d.interests) {
            try {
              const parsed = typeof d.interests === 'string' ? JSON.parse(d.interests) : d.interests;
              interestsText = Array.isArray(parsed) ? parsed.join(', ') : '';
            } catch {
              interestsText = '';
            }
          }
          setAudienceForm({
            ageRange: d.ageRange || '',
            location: d.location || '',
            gender: d.gender || '',
            language: d.language || '',
            interestsText,
          });
        }
      })
      .catch(() => {});
  }, [profileData, userId]);

  // Fetch follow suggestions (for other profiles)
  useEffect(() => {
    if (isOwnProfile || !currentUser) return;
    setLoadingSuggestions(true);
    fetch('/api/users/suggestions', {
      headers: { 'X-User-Id': currentUser.id },
    })
      .then((r) => r.json())
      .then((json) => { if (json.suggestions) setSuggestions(json.suggestions); })
      .catch(() => {})
      .finally(() => setLoadingSuggestions(false));
  }, [userId, isOwnProfile, currentUser]);

  // Fetch recent followers (own profile only)
  useEffect(() => {
    if (!isOwnProfile || !currentUser) return;
    setLoadingRecentFollowers(true);
    fetch(`/api/users/${userId}/recent-followers`, {
      headers: { 'X-User-Id': currentUser.id },
    })
      .then((r) => r.json())
      .then((json) => { if (json.followers) setRecentFollowers(json.followers); })
      .catch(() => {})
      .finally(() => setLoadingRecentFollowers(false));
  }, [userId, isOwnProfile, currentUser]);

  const handleSaveAudience = async () => {
    if (!currentUser) return;
    setSavingAudience(true);
    try {
      const interestsArray = audienceForm.interestsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const body: Record<string, unknown> = {};
      if (audienceForm.ageRange) body.ageRange = audienceForm.ageRange;
      if (audienceForm.location) body.location = audienceForm.location;
      if (audienceForm.gender) body.gender = audienceForm.gender;
      if (audienceForm.language) body.language = audienceForm.language;
      if (interestsArray.length > 0) body.interests = interestsArray;

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: 'Audience profile updated', description: 'Your preferences have been saved.' });
        // Refresh user data
        useAuthStore.getState().refreshUser();
      } else {
        toast({ title: 'Update failed', description: json.error || 'Something went wrong', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', description: 'Failed to save audience profile', variant: 'destructive' });
    } finally {
      setSavingAudience(false);
    }
  };

  const handleVideoClick = (videoId: string) => {
    window.dispatchEvent(new CustomEvent('navigate-video', { detail: { videoId } }));
  };

  const handleRefreshProfile = () => {
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setProfileData(j.data);
      })
      .catch(() => {});
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-32 mb-6" />
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="w-28 h-28 rounded-full" />
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex-1 space-y-4">
            <Skeleton className="h-52 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Profile not found</h2>
          <p className="text-muted-foreground mb-4">{error || 'This user profile is unavailable.'}</p>
          <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="shrink-0">
            <span className="text-sm">Back to Dashboard</span>
          </Button>
        </div>
      </div>
    );
  }

  const level = getScoreLevel(profileData.memberScore);
  const badge = getScoreLevelBadge(level);
  const gradientColor = getScoreLevelColor(level);
  const nextThreshold = getNextLevelThreshold(profileData.memberScore);
  const prevThreshold = getPreviousLevelThreshold(profileData.memberScore);
  const roleBadge = getRoleBadge(profileData.role);

  const leadVideos = videos.filter((v) => v.type === 'lead');
  const responseVideos = videos.filter((v) => v.type === 'response');

  const joinedDate = new Date(profileData.createdAt);
  const joinedAgo = timeAgo(profileData.createdAt);

  return (
    <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="shrink-0">
          <span className="text-sm">Back to Dashboard</span>
        </Button>
        <h1 className="text-2xl font-bold">Profile</h1>
      </motion.div>

      <QuickNav onNavigate={onNavigate} activeView="profile" />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:w-80 shrink-0"
        >
          <Card>
            <CardContent className="p-6 text-center">
              {/* Avatar */}
              <div className="relative inline-block mb-4">
                {profileData.avatarUrl ? (
                  <img
                    src={profileData.avatarUrl}
                    alt={profileData.username}
                    className="w-28 h-28 rounded-full object-cover border-4 border-background shadow-lg"
                  />
                ) : (
                  <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${gradientColor} flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
                    {profileData.username.charAt(0).toUpperCase()}
                  </div>
                )}
                {profileData.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-md border-2 border-background">
                    <CheckCircle2 className="w-5 h-5 text-white fill-white" />
                  </div>
                )}
              </div>

              {/* Name & Handle */}
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                {profileData.displayName || profileData.username}
                {profileData.isVerified && (
                  <CheckCircle2 className="w-5 h-5 text-amber-500 fill-amber-500" />
                )}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center justify-center gap-1.5">
                @{profileData.username}
                {/* Online presence indicator */}
                {!isOwnProfile && (
                  <span className={`inline-flex items-center gap-1.5 text-xs ${isOnline ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                    {isOnline ? 'Online now' : 'Offline'}
                  </span>
                )}
              </p>

              {/* Bio */}
              {profileData.bio && (
                <p className="text-sm mt-3 text-muted-foreground leading-relaxed">{profileData.bio}</p>
              )}

              {/* Role Badge */}
              <div className="mt-3 flex items-center justify-center gap-2">
                <Badge className={`text-xs ${roleBadge.className}`}>
                  {roleBadge.label}
                </Badge>
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-7 text-xs border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-600 dark:text-orange-400"
                    onClick={() => handleEditProfileOpen(true)}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit Profile
                  </Button>
                )}
              </div>

              {/* Joined */}
              <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3" />
                Joined {joinedAgo}
              </p>

              <Separator className="my-4" />

              {/* Conspicuous Follower/Following Count Cards */}
              <div className="flex gap-3 justify-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-1 cursor-pointer rounded-xl p-3 text-center transition-all ${profileData.followerCount > 0 ? 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border border-orange-200/60 dark:border-orange-800/30' : 'bg-muted/30 border border-transparent'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('navigate-users-list', {
                      detail: { userId: profileData.id, tab: 'followers', username: profileData.username },
                    }));
                  }}
                >
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{profileData.followerCount}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Followers</p>
                  {profileData.mutualFollowCount && profileData.mutualFollowCount > 0 && !isOwnProfile && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 mt-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      {profileData.mutualFollowCount} mutual
                    </Badge>
                  )}
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-1 cursor-pointer rounded-xl p-3 text-center transition-all ${profileData.followingCount > 0 ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-800/30' : 'bg-muted/30 border border-transparent'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('navigate-users-list', {
                      detail: { userId: profileData.id, tab: 'following', username: profileData.username },
                    }));
                  }}
                >
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{profileData.followingCount}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Following</p>
                </motion.div>
              </div>

              {/* Small Stats Row */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center">
                  <p className="text-sm font-bold">{profileData.videoCount}</p>
                  <p className="text-[10px] text-muted-foreground">Videos</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">{profileData.responseCount}</p>
                  <p className="text-[10px] text-muted-foreground">Responses</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">{isOwnProfile ? profileData.likedCount || 0 : profileData.savedCount || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{isOwnProfile ? 'Liked' : 'Saved'}</p>
                </div>
              </div>

              {/* Creator Studio Button (own profile, creator role) */}
              {isOwnProfile && isCreatorProfile && (
                <div className="w-full mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-xs border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-600 dark:text-orange-400"
                    onClick={() => onNavigate('creator-dashboard')}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Creator Studio
                    <ChevronRight className="w-3 h-3 ml-auto" />
                  </Button>
                </div>
              )}

              {/* QR Code Profile Share */}
              <div className="w-full mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={() => setProfileQrOpen(true)}
                >
                  <QrCode className="w-3.5 h-3.5 text-violet-500" />
                  Share Profile QR Code
                </Button>
              </div>

              {/* Follow/Subscribe Button (for other creator profiles) */}
              {!isOwnProfile && currentUser && isCreatorProfile && (
                <div className="w-full mt-4 space-y-2">
                  <SubscribeButton
                    creatorId={userId}
                    creatorName={profileData.username}
                    tiers={subscriptionTiers}
                    currentSubscription={currentSubscription}
                    onSuccess={handleRefreshProfile}
                  />
                  <FollowButton
                    targetUserId={userId}
                    targetUsername={profileData.username}
                    size="lg"
                    variant="full"
                    className="w-full"
                  />
                  <UserBlockButton
                    targetUserId={userId}
                    targetUsername={profileData.username}
                    size="sm"
                  />
                </div>
              )}

              {/* Business Profile Section (for creator profiles) */}
              {(isCreatorProfile || isOwnProfile) && (
                <div className="mt-4">
                  <Separator className="mb-4" />
                  {businessProfile && (businessProfile.businessName || businessProfile.category || businessProfile.businessEmail) && (
                    <div className="space-y-3">
                      {businessProfile.businessName && (
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="w-4 h-4 text-orange-500 shrink-0" />
                          <span className="font-medium">{businessProfile.businessName}</span>
                          {businessProfile.category && (
                            <Badge className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                              {businessProfile.category}
                            </Badge>
                          )}
                        </div>
                      )}
                      {(businessProfile.businessEmail || businessProfile.websiteUrl) && (
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {businessProfile.businessEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              {businessProfile.businessEmail}
                            </span>
                          )}
                          {businessProfile.websiteUrl && (
                            <a
                              href={businessProfile.websiteUrl.startsWith('http') ? businessProfile.websiteUrl : `https://${businessProfile.websiteUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-orange-600 dark:text-orange-400 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Website
                            </a>
                          )}
                        </div>
                      )}
                      {businessProfile.bio && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{businessProfile.bio}</p>
                      )}
                    </div>
                  )}
                  {isOwnProfile && !businessProfile?.businessName && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Set up your business profile to showcase your brand
                    </p>
                  )}

                  {/* Subscription Tiers (for creator profiles) */}
                  {subscriptionTiers.filter((t) => t.enabled).length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-orange-500" />
                        Subscription Tiers
                      </p>
                      <div className="space-y-2">
                        {subscriptionTiers
                          .filter((t) => t.enabled)
                          .map((tier) => (
                            <div
                              key={tier.id}
                              className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-orange-50/80 to-amber-50/50 dark:from-orange-950/30 dark:to-amber-950/10 border border-orange-200/60 dark:border-orange-800/30"
                            >
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shrink-0">
                                <Crown className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{tier.name}</span>
                                  <Badge className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                                    ${tier.price.toFixed(2)}/mo
                                  </Badge>
                                </div>
                                {tier.benefits.length > 0 && (
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {tier.benefits.slice(0, 3).join(' · ')}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Follow Button (for other non-creator profiles) */}
              {!isOwnProfile && currentUser && !isCreatorProfile && (
                <div className="w-full mt-4 space-y-2">
                  <FollowButton
                    targetUserId={userId}
                    targetUsername={profileData.username}
                    size="lg"
                    variant="full"
                    className="w-full"
                  />
                  <UserBlockButton
                    targetUserId={userId}
                    targetUsername={profileData.username}
                    size="sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Profile Dialog */}
          <Dialog open={editProfileOpen} onOpenChange={handleEditProfileOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-orange-500" />
                  Edit Profile
                </DialogTitle>
                <DialogDescription>Update your profile information below.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="edit-display-name">Display Name</Label>
                  <Input
                    id="edit-display-name"
                    placeholder="Your display name"
                    value={editForm.displayName}
                    onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="edit-bio">Bio</Label>
                  <Textarea
                    id="edit-bio"
                    placeholder="Tell us about yourself..."
                    value={editForm.bio}
                    onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value.slice(0, 200) }))}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">{editForm.bio.length}/200</p>
                </div>

                {/* Avatar URL */}
                <div className="space-y-2">
                  <Label htmlFor="edit-avatar-url">Avatar URL</Label>
                  <Input
                    id="edit-avatar-url"
                    placeholder="https://example.com/avatar.jpg"
                    value={editForm.avatarUrl}
                    onChange={(e) => setEditForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Paste a link to an image for your profile picture.</p>
                </div>

                {/* Interests */}
                <div className="space-y-2">
                  <Label htmlFor="edit-interests">Interests</Label>
                  <Input
                    id="edit-interests"
                    placeholder="e.g. tech, music, sports (comma-separated)"
                    value={editForm.interestsText}
                    onChange={(e) => setEditForm((f) => ({ ...f, interestsText: e.target.value }))}
                  />
                  {editForm.interestsText && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {editForm.interestsText.split(',').map((s) => s.trim()).filter(Boolean).map((interest) => (
                        <Badge
                          key={interest}
                          variant="secondary"
                          className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                        >
                          {interest}
                          <button
                            type="button"
                            onClick={() => setEditForm((f) => ({
                              ...f,
                              interestsText: f.interestsText
                                .split(',')
                                .filter((t) => t.trim() !== interest)
                                .join(', '),
                            }))}
                            className="ml-1 hover:text-orange-900 dark:hover:text-orange-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Age Range & Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Age Range</Label>
                    <Select
                      value={editForm.ageRange}
                      onValueChange={(val) => setEditForm((f) => ({ ...f, ageRange: val }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select age range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="18-24">18-24</SelectItem>
                        <SelectItem value="25-34">25-34</SelectItem>
                        <SelectItem value="35-44">35-44</SelectItem>
                        <SelectItem value="45-54">45-54</SelectItem>
                        <SelectItem value="55+">55+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                      value={editForm.gender}
                      onValueChange={(val) => setEditForm((f) => ({ ...f, gender: val }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Location & Language */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-location">Location</Label>
                    <Input
                      id="edit-location"
                      placeholder="e.g. Lagos, Nigeria"
                      value={editForm.location}
                      onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-language">Language</Label>
                    <Input
                      id="edit-language"
                      placeholder="e.g. en, fr, es"
                      value={editForm.language}
                      onChange={(e) => setEditForm((f) => ({ ...f, language: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleEditProfileOpen(false)} disabled={savingProfile}>Cancel</Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white gap-2"
                >
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Profile
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Profile QR Code Dialog */}
          <QRCodeDialog
            open={profileQrOpen}
            onOpenChange={setProfileQrOpen}
            url={typeof window !== 'undefined' ? `${window.location.origin}?profile=${userId}` : ''}
            title={profileData.displayName || profileData.username}
            subtitle={`Share @${profileData.username}'s profile`}
          />
        </motion.div>

        {/* Score & Activity */}
        <div className="flex-1 space-y-6">
          {/* Score Breakdown Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Member Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Score Ring */}
                  <ScoreRing score={profileData.memberScore} size={140} />

                  {/* Level & Progress */}
                  <div className="flex-1 text-center sm:text-left space-y-3">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <Badge className={badge.className}>
                        {badge.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">Rank #{profileData.rank}</span>
                    </div>

                    {/* Verified Status */}
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      {profileData.isVerified ? (
                        <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Verified Member
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Target className="w-4 h-4" />
                          {Math.max(0, 500 - profileData.memberScore)} points to Verified
                        </span>
                      )}
                    </div>

                    {/* Next Level Progress */}
                    {nextThreshold !== null ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Points to next level</span>
                          <span>{nextThreshold - profileData.memberScore} pts to {getScoreLevelBadge(getScoreLevel(nextThreshold - 1)).label}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-500"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${((profileData.memberScore - prevThreshold) / (nextThreshold - prevThreshold)) * 100}%`,
                            }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Maximum level reached!
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Score Component Bars */}
                <div className="space-y-4">
                  <ScoreBreakdownBar
                    label="Engagement"
                    value={profileData.breakdown.engagement}
                    max={300}
                    icon={Zap}
                    color="from-orange-400 to-amber-500"
                  />
                  <ScoreBreakdownBar
                    label="Content Quality"
                    value={profileData.breakdown.quality}
                    max={400}
                    icon={TrendingUp}
                    color="from-amber-400 to-yellow-500"
                  />
                  <ScoreBreakdownBar
                    label="Poll Accuracy"
                    value={profileData.breakdown.accuracy}
                    max={200}
                    icon={BarChart3}
                    color="from-orange-500 to-red-500"
                  />
                  <ScoreBreakdownBar
                    label="Streak Bonus"
                    value={profileData.breakdown.streak}
                    max={100}
                    icon={Flame}
                    color="from-rose-400 to-orange-500"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Audience Profile Card (own profile only) */}
          {isOwnProfile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="border-2 border-orange-200 dark:border-orange-800/40 bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-500" />
                    Audience Profile
                  </CardTitle>
                  <CardDescription>Help us personalize your experience and show you relevant polls</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Age Range */}
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        Age Range
                      </Label>
                      <Select
                        value={audienceForm.ageRange}
                        onValueChange={(val) => setAudienceForm((f) => ({ ...f, ageRange: val }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select age range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="18-24">18-24</SelectItem>
                          <SelectItem value="25-34">25-34</SelectItem>
                          <SelectItem value="35-44">35-44</SelectItem>
                          <SelectItem value="45-54">45-54</SelectItem>
                          <SelectItem value="55+">55+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Gender */}
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        Gender
                      </Label>
                      <Select
                        value={audienceForm.gender}
                        onValueChange={(val) => setAudienceForm((f) => ({ ...f, gender: val }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non-binary">Non-binary</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        Location
                      </Label>
                      <Input
                        placeholder="e.g. Lagos, Nigeria"
                        value={audienceForm.location}
                        onChange={(e) => setAudienceForm((f) => ({ ...f, location: e.target.value }))}
                      />
                    </div>

                    {/* Language */}
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                        Language
                      </Label>
                      <Input
                        placeholder="e.g. en, fr, es"
                        value={audienceForm.language}
                        onChange={(e) => setAudienceForm((f) => ({ ...f, language: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Interests */}
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-muted-foreground" />
                      Interests
                    </Label>
                    <Input
                      placeholder="e.g. tech, music, sports (comma-separated)"
                      value={audienceForm.interestsText}
                      onChange={(e) => setAudienceForm((f) => ({ ...f, interestsText: e.target.value }))}
                    />
                    {audienceForm.interestsText && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {audienceForm.interestsText
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .map((interest) => (
                            <Badge
                              key={interest}
                              variant="secondary"
                              className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                            >
                              {interest}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={handleSaveAudience}
                    disabled={savingAudience}
                    className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  >
                    {savingAudience ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Audience Profile
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Follow Suggestions (other profiles only) */}
          {!isOwnProfile && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    People You May Know
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                    {suggestions.map((user) => (
                      <div key={user.id} className="flex-shrink-0 w-44 rounded-xl border border-border/60 p-3 bg-gradient-to-br from-orange-50/50 to-amber-50/30 dark:from-orange-950/10 dark:to-amber-950/5">
                        <div className="flex flex-col items-center text-center gap-2">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.username} className="w-10 h-10 rounded-full object-cover border-2 border-background" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-sm font-bold">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 w-full">
                            <p className="text-xs font-semibold truncate">{user.displayName || user.username}</p>
                            <p className="text-[10px] text-muted-foreground truncate">@{user.username}</p>
                            <p className="text-[10px] text-muted-foreground">{user.followerCount} followers</p>
                          </div>
                          <FollowButton targetUserId={user.id} targetUsername={user.username} initialFollowing={user.isFollowing} variant="compact" size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Recent Followers (own profile only) */}
          {isOwnProfile && (recentFollowers.length > 0 || loadingRecentFollowers) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-500" />
                      Recent Followers
                    </CardTitle>
                    <button
                      className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('navigate-users-list', {
                          detail: { userId, tab: 'followers', username: currentUser?.username },
                        }));
                      }}
                    >
                      See All <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingRecentFollowers ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {recentFollowers.map((follower) => (
                        <div key={follower.id} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-orange-50/60 dark:hover:bg-orange-950/20 transition-colors group">
                          {follower.avatarUrl ? (
                            <img src={follower.avatarUrl} alt={follower.username} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                              {follower.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                              {follower.displayName || follower.username}
                              {follower.isVerified && <UserCheck className="w-3 h-3 text-amber-500 inline ml-1" />}
                            </p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              followed you {timeAgo(follower.followedAt)}
                            </p>
                          </div>
                          <FollowButton targetUserId={follower.id} targetUsername={follower.username} initialFollowing={follower.isFollowing} variant="compact" size="sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Video Compartments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="overflow-x-auto -mx-1 px-1">
                <TabsList className="w-full min-w-max inline-flex">
                  <TabsTrigger value="videos" className="flex-1 min-w-[100px] gap-1.5">
                    <Video className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Lead Clips</span>
                    <span className="sm:hidden">Clips</span>
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">{leadVideos.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="responses" className="flex-1 min-w-[100px] gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Responses
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">{responseVideos.length}</Badge>
                  </TabsTrigger>
                  {isOwnProfile && (
                    <TabsTrigger value="liked" className="flex-1 min-w-[80px] gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      Liked
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">{likedVideos.length}</Badge>
                    </TabsTrigger>
                  )}
                  {isOwnProfile && (
                    <TabsTrigger value="saved" className="flex-1 min-w-[80px] gap-1.5">
                      <BookmarkCheck className="w-3.5 h-3.5 text-blue-500" />
                      Saved
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">{savedVideos.length}</Badge>
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="all" className="flex-1 min-w-[60px] gap-1.5">
                    <Crown className="w-3.5 h-3.5" />
                    All
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">{videos.length}</Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Lead Clips Tab */}
              <TabsContent value="videos" className="mt-4">
                {loadingVideos ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="aspect-video rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : leadVideos.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <Video className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">No lead clips yet</p>
                      <p className="text-xs text-muted-foreground">Create your first lead clip to start a conversation</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {leadVideos.map((v) => (
                      <VideoCard key={v.id} video={v} onClick={handleVideoClick} showSave={isOwnProfile} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Responses Tab */}
              <TabsContent value="responses" className="mt-4">
                {loadingVideos ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="aspect-video rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : responseVideos.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">No response clips yet</p>
                      <p className="text-xs text-muted-foreground">Respond to lead clips with your opinion</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {responseVideos.map((v) => (
                      <VideoCard key={v.id} video={v} onClick={handleVideoClick} showSave={isOwnProfile} />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Liked Tab (own profile only) */}
              {isOwnProfile && (
                <TabsContent value="liked" className="mt-4">
                  {loadingLiked ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="space-y-2">
                          <Skeleton className="aspect-video rounded-lg" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : likedVideos.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-8 text-center">
                        <Heart className="w-10 h-10 text-rose-300 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-1">No liked videos yet</p>
                        <p className="text-xs text-muted-foreground">Videos you like will appear here</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {likedVideos.map((v) => (
                        <VideoCard key={v.id} video={v} onClick={handleVideoClick} showSave={isOwnProfile} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              )}

              {/* Saved Tab (own profile only) */}
              {isOwnProfile && (
                <TabsContent value="saved" className="mt-4">
                  {loadingSaved ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="space-y-2">
                          <Skeleton className="aspect-video rounded-lg" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : savedVideos.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="p-8 text-center">
                        <BookmarkCheck className="w-10 h-10 text-blue-300 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-1">No saved videos yet</p>
                        <p className="text-xs text-muted-foreground">Bookmark videos to watch later</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {savedVideos.map((v) => (
                        <VideoCard key={v.id} video={v} onClick={handleVideoClick} showSave={isOwnProfile} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              )}

              {/* All Tab */}
              <TabsContent value="all" className="mt-4">
                {loadingVideos ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="aspect-video rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : videos.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <Video className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">No videos yet</p>
                      <p className="text-xs text-muted-foreground">Get started by creating your first video</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {videos.map((v) => (
                      <VideoCard key={v.id} video={v} onClick={handleVideoClick} showSave={isOwnProfile} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

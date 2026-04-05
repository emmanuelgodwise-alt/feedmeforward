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
} from 'lucide-react';
import { VideoCard } from '@/components/video-card';
import { FollowButton } from '@/components/follow-button';
import { QuickNav } from '@/components/quick-nav';
import { useAuthStore } from '@/stores/auth-store';
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
  rank: number;
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

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold">{profileData.videoCount}</p>
                  <p className="text-xs text-muted-foreground">Videos</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{profileData.responseCount}</p>
                  <p className="text-xs text-muted-foreground">Responses</p>
                </div>
                <div
                  className="text-center cursor-pointer hover:text-orange-500 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('navigate-users-list', {
                      detail: { userId: profileData.id, tab: 'followers' },
                    }));
                  }}
                >
                  <p className="text-lg font-bold">{profileData.followerCount}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div
                  className="text-center cursor-pointer hover:text-orange-500 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('navigate-users-list', {
                      detail: { userId: profileData.id, tab: 'following' },
                    }));
                  }}
                >
                  <p className="text-lg font-bold">{profileData.followingCount}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
              </div>

              {/* Follow Button (for other profiles) */}
              {!isOwnProfile && currentUser && (
                <div className="w-full mt-4">
                  <FollowButton
                    targetUserId={userId}
                    targetUsername={profileData.username}
                    size="lg"
                    variant="full"
                    className="w-full"
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

          {/* Activity Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="videos" className="flex-1 gap-1">
                  <Video className="w-3.5 h-3.5" />
                  Videos ({leadVideos.length})
                </TabsTrigger>
                <TabsTrigger value="responses" className="flex-1 gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Responses ({responseVideos.length})
                </TabsTrigger>
                <TabsTrigger value="all" className="flex-1 gap-1">
                  <Crown className="w-3.5 h-3.5" />
                  All ({videos.length})
                </TabsTrigger>
              </TabsList>

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
                      <p className="text-sm text-muted-foreground">No lead clips yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {leadVideos.map((v) => (
                      <VideoCard key={v.id} video={v} onClick={handleVideoClick} />
                    ))}
                  </div>
                )}
              </TabsContent>

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
                      <p className="text-sm text-muted-foreground">No response clips yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {responseVideos.map((v) => (
                      <VideoCard key={v.id} video={v} onClick={handleVideoClick} />
                    ))}
                  </div>
                )}
              </TabsContent>

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
                      <p className="text-sm text-muted-foreground">No videos yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {videos.map((v) => (
                      <VideoCard key={v.id} video={v} onClick={handleVideoClick} />
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

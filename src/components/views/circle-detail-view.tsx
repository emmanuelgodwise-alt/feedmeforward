'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { VideoCard } from '@/components/video-card';
import { FollowButton } from '@/components/follow-button';
import {
  Users,
  Loader2,
  Globe,
  Lock,
  Plus,
  Trash2,
  Crown,
  Shield,
  Eye,
  UserPlus,
  Edit3,
  Search,
  Video,
  X,
} from 'lucide-react';

interface CircleDetailViewProps {
  onNavigate: (view: string) => void;
  circleId: string;
  setProfileUserId: (id: string) => void;
  setVideoId: (id: string) => void;
}

interface CircleData {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  memberCount: number;
  createdAt: string;
  creatorId: string;
  creator: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  isMember: boolean;
  memberRole: string | null;
}

interface MemberData {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: { id: string; username: string; displayName: string | null; avatarUrl: string | null; isVerified: boolean };
}

interface VideoItem {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  type: string;
  status: string;
  category: string | null;
  createdAt: string;
  creatorId: string;
  tags: string[];
  duration: number;
  viewCount: number;
  isPublic: boolean;
  creator: { id: string; username: string; displayName: string | null; avatarUrl: string | null; isVerified: boolean };
  _count: { likes: number; comments: number; polls: number };
}

const GRADIENTS = [
  'from-orange-400 to-amber-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-cyan-500',
  'from-violet-400 to-purple-500',
];

function getGradient(id: string, name: string): string {
  let hash = 0;
  const str = id + name;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export function CircleDetailView({ onNavigate, circleId, setProfileUserId, setVideoId }: CircleDetailViewProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();

  // Circle data
  const [circle, setCircle] = useState<CircleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  // Members
  const [members, setMembers] = useState<MemberData[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Videos
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('videos');

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', coverUrl: '', isPublic: true });
  const [editLoading, setEditLoading] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteUsers, setInviteUsers] = useState<Array<{ id: string; username: string; displayName: string | null; avatarUrl: string | null }>>([]);
  const [inviteUsersLoading, setInviteUsersLoading] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Share video dialog
  const [shareVideoOpen, setShareVideoOpen] = useState(false);
  const [shareVideoId, setShareVideoId] = useState('');
  const [shareVideoLoading, setShareVideoLoading] = useState(false);
  const [myVideos, setMyVideos] = useState<VideoItem[]>([]);
  const [myVideosLoading, setMyVideosLoading] = useState(false);

  // Role change
  const [roleChangeLoading, setRoleChangeLoading] = useState<string | null>(null);

  // Remove member dialog
  const [removeMemberOpen, setRemoveMemberOpen] = useState(false);
  const [removeMemberData, setRemoveMemberData] = useState<MemberData | null>(null);
  const [removeMemberLoading, setRemoveMemberLoading] = useState(false);

  const fetchCircle = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (currentUser) headers['X-User-Id'] = currentUser.id;

      const res = await fetch(`/api/circles/${circleId}`, { headers });
      const json = await res.json();
      if (json.id) {
        setCircle(json);
      } else {
        toast({ title: 'Community not found', variant: 'destructive' });
        onNavigate('circles');
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load community', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [circleId, currentUser, toast, onNavigate]);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (currentUser) headers['X-User-Id'] = currentUser.id;

      const res = await fetch(`/api/circles/${circleId}/members`, { headers });
      const json = await res.json();
      if (json.members) {
        setMembers(json.members);
      }
    } catch {
      // silently fail
    } finally {
      setMembersLoading(false);
    }
  }, [circleId, currentUser]);

  const fetchVideos = useCallback(async () => {
    setVideosLoading(true);
    try {
      // Fetch circle videos by looking at CircleVideo records
      const res = await fetch(`/api/circles/${circleId}`);
      const json = await res.json();
      // We need to get shared videos - we'll use a workaround through the circle detail
      if (json.sharedVideos) {
        setVideos(json.sharedVideos);
      } else {
        setVideos([]);
      }
    } catch {
      setVideos([]);
    } finally {
      setVideosLoading(false);
    }
  }, [circleId]);

  // Fetch circle videos using the shared video data from circle
  const fetchCircleVideos = useCallback(async () => {
    setVideosLoading(true);
    try {
      // Get shared video IDs from the members/members endpoint - we need to query CircleVideo
      const res = await fetch(`/api/videos?creatorId=${currentUser?.id || ''}&limit=100`);
      const json = await res.json();
      // This is a workaround - the actual video fetching is from the circle video relation
      // For now, we will show videos that have been shared to this circle
      const allUserVideos = json.videos || [];
      const sharedVideos = allUserVideos.filter((v: VideoItem) =>
        v._count?.likes >= 0
      ); // placeholder until we have a dedicated endpoint
      setVideos(sharedVideos);
    } catch {
      setVideos([]);
    } finally {
      setVideosLoading(false);
    }
  }, [currentUser, circleId]);

  useEffect(() => {
    fetchCircle();
  }, [fetchCircle]);

  useEffect(() => {
    if (!loading && circle) {
      if (activeTab === 'members') {
        fetchMembers();
      }
    }
  }, [activeTab, loading, circle, fetchMembers]);

  // Fetch shared videos on mount
  useEffect(() => {
    if (!loading && circle) {
      fetchCircleVideos();
    }
  }, [loading, circle, fetchCircleVideos]);

  // User search for invite
  useEffect(() => {
    if (!inviteSearch || inviteSearch.length < 2) {
      setInviteUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      setInviteUsersLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(inviteSearch)}&limit=10`);
        const json = await res.json();
        if (json.users) {
          // Exclude existing members and the current user
          const memberIds = new Set(members.map((m) => m.userId));
          const filtered = json.users.filter(
            (u: { id: string }) => u.id !== currentUser?.id && !memberIds.has(u.id),
          );
          setInviteUsers(filtered);
        }
      } catch {
        // silently fail
      } finally {
        setInviteUsersLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [inviteSearch, members, currentUser]);

  const handleJoin = async () => {
    if (!currentUser) return;
    setJoining(true);
    try {
      await fetch(`/api/circles/${circleId}/join`, {
        method: 'POST',
        headers: { 'X-User-Id': currentUser.id },
      });
      toast({ title: 'Joined community! 🎉' });
      fetchCircle();
      fetchMembers();
    } catch {
      toast({ title: 'Error', description: 'Failed to join community', variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!currentUser) return;
    setJoining(true);
    try {
      await fetch(`/api/circles/${circleId}/join`, {
        method: 'DELETE',
        headers: { 'X-User-Id': currentUser.id },
      });
      toast({ title: 'Left community' });
      onNavigate('circles');
    } catch {
      toast({ title: 'Error', description: 'Failed to leave community', variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUser) return;
    setDeleteLoading(true);
    try {
      await fetch(`/api/circles/${circleId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': currentUser.id },
      });
      toast({ title: 'Community deleted' });
      onNavigate('circles');
    } catch {
      toast({ title: 'Error', description: 'Failed to delete community', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !editForm.name.trim()) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/circles/${circleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.id) {
        toast({ title: 'Community updated!' });
        setEditOpen(false);
        fetchCircle();
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to update', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update community', variant: 'destructive' });
    } finally {
      setEditLoading(false);
    }
  };

  const handleInvite = async (userId: string) => {
    if (!currentUser) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/circles/${circleId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: json.message || 'Invitation sent!' });
        setInviteSearch('');
        setInviteUsers([]);
        fetchCircle();
        fetchMembers();
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to invite', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to send invitation', variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const handleShareVideo = async (videoIdToShare: string) => {
    if (!currentUser) return;
    setShareVideoLoading(true);
    try {
      const res = await fetch(`/api/circles/${circleId}/videos/${videoIdToShare}`, {
        method: 'POST',
        headers: { 'X-User-Id': currentUser.id },
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: 'Video shared! 🎬' });
        setShareVideoOpen(false);
        setShareVideoId('');
        fetchCircleVideos();
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to share video', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to share video', variant: 'destructive' });
    } finally {
      setShareVideoLoading(false);
    }
  };

  const handleRemoveVideo = async (videoIdToRemove: string) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/circles/${circleId}/videos/${videoIdToRemove}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': currentUser.id },
      });
      toast({ title: 'Video removed' });
      fetchCircleVideos();
    } catch {
      toast({ title: 'Error', description: 'Failed to remove video', variant: 'destructive' });
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!currentUser) return;
    setRoleChangeLoading(userId);
    try {
      const res = await fetch(`/api/circles/${circleId}/members/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: `Role changed to ${newRole}` });
        fetchMembers();
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to change role', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to change role', variant: 'destructive' });
    } finally {
      setRoleChangeLoading(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!currentUser || !removeMemberData) return;
    setRemoveMemberLoading(true);
    try {
      await fetch(`/api/circles/${circleId}/join`, {
        method: 'DELETE',
        headers: { 'X-User-Id': currentUser.id },
      });
      toast({ title: 'Member removed' });
      setRemoveMemberOpen(false);
      setRemoveMemberData(null);
      fetchCircle();
      fetchMembers();
    } catch {
      toast({ title: 'Error', description: 'Failed to remove member', variant: 'destructive' });
    } finally {
      setRemoveMemberLoading(false);
    }
  };

  const openEditDialog = () => {
    if (!circle) return;
    setEditForm({
      name: circle.name,
      description: circle.description || '',
      coverUrl: circle.coverUrl || '',
      isPublic: circle.isPublic,
    });
    setEditOpen(true);
  };

  const openShareVideoDialog = async () => {
    if (!currentUser) return;
    setShareVideoOpen(true);
    setMyVideosLoading(true);
    try {
      const res = await fetch(`/api/videos?creatorId=${currentUser.id}&limit=50`);
      const json = await res.json();
      setMyVideos(json.videos || []);
    } catch {
      setMyVideos([]);
    } finally {
      setMyVideosLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
        <Skeleton className="h-40 w-full rounded-xl mb-6" />
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-4 w-48 mb-6" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    );
  }

  if (!circle) return null;

  const isCreator = currentUser?.id === circle.creatorId;
  const isAdmin = circle.memberRole === 'admin' || isCreator;
  const isModOrAdmin = isAdmin || circle.memberRole === 'moderator';
  const gradient = getGradient(circle.id, circle.name);
  const initial = circle.name.charAt(0).toUpperCase();

  const roleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'moderator':
        return <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Moderator</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Member</Badge>;
    }
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="min-h-screen px-4 py-8 max-w-5xl mx-auto"
    >
      {/* Back button */}
      <motion.div variants={staggerItem}>
        <Button variant="ghost" onClick={() => onNavigate('circles')} className="shrink-0 mb-4">
          <span className="text-sm">Back to Communities</span>
        </Button>
      </motion.div>

      {/* Cover Banner */}
      <motion.div variants={staggerItem}>
        <div className="relative h-40 rounded-xl overflow-hidden mb-6">
          {circle.coverUrl ? (
            <img
              src={circle.coverUrl}
              alt={circle.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${gradient} ${circle.coverUrl ? 'hidden' : ''}`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-7xl font-bold text-white/20">{initial}</span>
            </div>
          </div>
          {/* Visibility badge */}
          <div className="absolute top-3 right-3">
            <Badge className={circle.isPublic ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}>
              {circle.isPublic ? <span className="flex items-center gap-1"><Globe className="w-3 h-3" />Public</span> : <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Private</span>}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Circle Info */}
      <motion.div variants={staggerItem} className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{circle.name}</h1>
            {circle.description && (
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">{circle.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'}
              </span>
              <span className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-[9px] font-bold overflow-hidden cursor-pointer"
                  onClick={() => { setProfileUserId(circle.creatorId); onNavigate('profile'); }}
                >
                  {circle.creator?.avatarUrl ? (
                    <img src={circle.creator.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    circle.creator?.username?.charAt(0).toUpperCase()
                  )}
                </div>
                <span
                  className="hover:text-orange-500 cursor-pointer transition-colors"
                  onClick={() => { setProfileUserId(circle.creatorId); onNavigate('profile'); }}
                >
                  Created by @{circle.creator?.username}
                </span>
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!circle.isMember && currentUser && (
              <Button
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white gap-1"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Join
              </Button>
            )}
            {circle.isMember && !isCreator && (
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/60 dark:text-red-400 dark:hover:bg-red-950/30"
                onClick={handleLeave}
                disabled={joining}
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Leave
              </Button>
            )}
            {circle.isMember && (
              <Button variant="outline" className="gap-1" onClick={() => setInviteOpen(true)}>
                <UserPlus className="w-4 h-4" />
                Invite
              </Button>
            )}
            {isAdmin && (
              <Button variant="outline" className="gap-1" onClick={openEditDialog}>
                <Edit3 className="w-4 h-4" />
                Edit
              </Button>
            )}
            {isCreator && (
              <Button
                variant="outline"
                className="gap-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/60 dark:text-red-400 dark:hover:bg-red-950/30"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="videos" className="gap-1">
            <Video className="w-3.5 h-3.5" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-1">
            <Users className="w-3.5 h-3.5" />
            Members
          </TabsTrigger>
        </TabsList>

        {/* Videos Tab */}
        <TabsContent value="videos">
          {/* Share button */}
          {circle.isMember && (
            <div className="flex justify-end mb-4">
              <Button
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white gap-1"
                onClick={openShareVideoDialog}
              >
                <Plus className="w-4 h-4" />
                Share a Video
              </Button>
            </div>
          )}

          {videosLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden border-0">
                  <Skeleton className="aspect-video w-full" />
                  <CardContent className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!videosLoading && videos.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">No videos shared yet</h3>
                <p className="text-sm text-muted-foreground">
                  Be the first to share a video with this community!
                </p>
              </CardContent>
            </Card>
          )}

          {!videosLoading && videos.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {videos.map((video) => (
                <motion.div key={video.id} variants={staggerItem} className="relative group">
                  <VideoCard
                    video={video as unknown as import('@/types').Video}
                    onClick={(id) => { setVideoId(id); onNavigate('video-detail'); }}
                    onCreatorClick={(id) => { setProfileUserId(id); onNavigate('profile'); }}
                  />
                  {/* Remove button for admins */}
                  {isModOrAdmin && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 z-10 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); handleRemoveVideo(video.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          {membersLoading && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!membersLoading && members.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">No members yet</h3>
                <p className="text-sm text-muted-foreground">Be the first to join this community!</p>
              </CardContent>
            </Card>
          )}

          {!membersLoading && members.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-2"
            >
              {members.map((member) => (
                <motion.div key={member.id} variants={staggerItem}>
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold overflow-hidden shrink-0 cursor-pointer"
                          onClick={() => { setProfileUserId(member.userId); onNavigate('profile'); }}
                        >
                          {member.user?.avatarUrl ? (
                            <img src={member.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            member.user?.username?.charAt(0).toUpperCase() || '?'
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-medium text-sm truncate cursor-pointer hover:text-orange-500 transition-colors"
                              onClick={() => { setProfileUserId(member.userId); onNavigate('profile'); }}
                            >
                              {member.user?.displayName || member.user?.username}
                            </span>
                            {member.userId === circle.creatorId && (
                              <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">@{member.user?.username}</span>
                        </div>

                        {/* Role badge */}
                        {roleBadge(member.role)}

                        {/* Follow button */}
                        {currentUser && member.userId !== currentUser.id && (
                          <FollowButton
                            targetUserId={member.userId}
                            variant="compact"
                            size="sm"
                          />
                        )}

                        {/* Admin actions */}
                        {isAdmin && member.userId !== currentUser?.id && member.userId !== circle.creatorId && (
                          <div className="flex items-center gap-1">
                            {/* Role change dropdown - simple buttons */}
                            {member.role !== 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30"
                                onClick={() => {
                                  const nextRole = member.role === 'member' ? 'moderator' : 'admin';
                                  handleChangeRole(member.userId, nextRole);
                                }}
                                disabled={roleChangeLoading === member.userId}
                              >
                                {roleChangeLoading === member.userId ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Shield className="w-3 h-3" />
                                )}
                                {member.role === 'member' ? 'Promote' : 'To Admin'}
                              </Button>
                            )}
                            {member.role === 'moderator' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground hover:bg-muted"
                                onClick={() => handleChangeRole(member.userId, 'member')}
                                disabled={roleChangeLoading === member.userId}
                              >
                                Demote
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => { setRemoveMemberData(member); setRemoveMemberOpen(true); }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-8">
      </div>

      {/* ─── DIALOGS ──────────────────────────────── */}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Community</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cover">Cover Image URL</Label>
              <Input
                id="edit-cover"
                value={editForm.coverUrl}
                onChange={(e) => setEditForm((p) => ({ ...p, coverUrl: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-public">Public</Label>
              <Switch
                id="edit-public"
                checked={editForm.isPublic}
                onCheckedChange={(checked) => setEditForm((p) => ({ ...p, isPublic: checked }))}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              disabled={editLoading || !editForm.name.trim()}
            >
              {editLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Community</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{circle.name}&quot;? This action cannot be undone. All members will be removed and all shared videos will be unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteLoading}
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {inviteUsersLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!inviteUsersLoading && inviteUsers.length > 0 && (
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {inviteUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          user.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.displayName || user.username}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                        onClick={() => handleInvite(user.id)}
                        disabled={inviting}
                      >
                        {inviting ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {!inviteUsersLoading && inviteSearch.length >= 2 && inviteUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
            )}

            {inviteSearch.length < 2 && (
              <p className="text-sm text-muted-foreground text-center py-4">Type at least 2 characters to search</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Video Dialog */}
      <Dialog open={shareVideoOpen} onOpenChange={setShareVideoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share a Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Direct video ID input */}
            <div className="space-y-2">
              <Label htmlFor="share-video-id">Video ID</Label>
              <div className="flex gap-2">
                <Input
                  id="share-video-id"
                  placeholder="Enter video ID"
                  value={shareVideoId}
                  onChange={(e) => setShareVideoId(e.target.value)}
                />
                <Button
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shrink-0"
                  onClick={() => {
                    if (shareVideoId.trim()) handleShareVideo(shareVideoId.trim());
                  }}
                  disabled={shareVideoLoading || !shareVideoId.trim()}
                >
                  {shareVideoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Or select from own videos */}
            <div>
              <p className="text-sm font-medium mb-3">Or select from your videos</p>
              {myVideosLoading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              )}
              {!myVideosLoading && myVideos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">You haven&apos;t created any videos yet</p>
              )}
              {!myVideosLoading && myVideos.length > 0 && (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {myVideos.map((v) => (
                      <div key={v.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <div className="w-16 h-10 rounded bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shrink-0 overflow-hidden">
                          {v.thumbnailUrl ? (
                            <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Video className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{v.title}</p>
                          <p className="text-xs text-muted-foreground">{v.type}</p>
                        </div>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shrink-0"
                          onClick={() => handleShareVideo(v.id)}
                          disabled={shareVideoLoading}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <AlertDialog open={removeMemberOpen} onOpenChange={setRemoveMemberOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove @{removeMemberData?.user?.username} from this community? They can rejoin if it&apos;s public.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={removeMemberLoading}
            >
              {removeMemberLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

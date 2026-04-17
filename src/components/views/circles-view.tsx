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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Search,
  Plus,
  Loader2,
  Globe,
  Lock,
  ChevronRight,
} from 'lucide-react';

interface CirclesViewProps {
  onNavigate: (view: string) => void;
  setCircleId: (id: string) => void;
}

interface CircleItem {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  memberCount: number;
  createdAt: string;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  isMember: boolean;
}

const GRADIENTS = [
  'from-orange-400 to-amber-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-cyan-500',
  'from-violet-400 to-purple-500',
  'from-fuchsia-400 to-pink-500',
  'from-orange-500 to-red-500',
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

export function CirclesView({ onNavigate, setCircleId }: CirclesViewProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();

  const [discoverCircles, setDiscoverCircles] = useState<CircleItem[]>([]);
  const [myCircles, setMyCircles] = useState<CircleItem[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('discover');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', coverUrl: '', isPublic: true });
  const [createLoading, setCreateLoading] = useState(false);

  // Pagination
  const [discoverOffset, setDiscoverOffset] = useState(0);
  const [discoverHasMore, setDiscoverHasMore] = useState(false);
  const [discoverTotal, setDiscoverTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const LIMIT = 12;

  const fetchDiscover = useCallback(async (reset = false) => {
    const offset = reset ? 0 : discoverOffset;
    if (reset) {
      setDiscoverLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(offset),
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/circles?${params}`);
      const json = await res.json();

      if (json.circles) {
        if (reset) {
          setDiscoverCircles(json.circles);
        } else {
          setDiscoverCircles((prev) => [...prev, ...json.circles]);
        }
        setDiscoverTotal(json.total || 0);
        setDiscoverHasMore(offset + LIMIT < json.total);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load communities', variant: 'destructive' });
    } finally {
      setDiscoverLoading(false);
      setLoadingMore(false);
    }
  }, [discoverOffset, search, toast]);

  const fetchMyCircles = useCallback(async () => {
    if (!currentUser) return;
    setMyLoading(true);
    try {
      const res = await fetch(`/api/circles?mine=true&userId=${currentUser.id}&limit=50`);
      const json = await res.json();
      if (json.circles) {
        setMyCircles(json.circles);
      }
    } catch {
      // silently fail
    } finally {
      setMyLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchDiscover(true);
    fetchMyCircles();
  }, [fetchDiscover, fetchMyCircles]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDiscoverOffset(0);
      fetchDiscover(true);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleLoadMore = () => {
    const next = discoverOffset + LIMIT;
    setDiscoverOffset(next);
    fetchDiscover(false);
  };

  const handleJoin = async (e: React.MouseEvent, circleId: string, isMember: boolean) => {
    e.stopPropagation();
    if (!currentUser) {
      toast({ title: 'Sign in required', description: 'Please sign in to join communities' });
      return;
    }

    try {
      if (isMember) {
        await fetch(`/api/circles/${circleId}/join`, {
          method: 'DELETE',
          headers: { 'X-User-Id': currentUser.id },
        });
        toast({ title: 'Left community' });
      } else {
        await fetch(`/api/circles/${circleId}/join`, {
          method: 'POST',
          headers: { 'X-User-Id': currentUser.id },
        });
        toast({ title: 'Joined community!' });
      }

      // Refresh both lists
      fetchDiscover(true);
      fetchMyCircles();
    } catch {
      toast({ title: 'Error', description: 'Failed to update membership', variant: 'destructive' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !createForm.name.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch('/api/circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();

      if (json.id) {
        toast({ title: 'Community created! 🎉', description: json.name });
        setCreateForm({ name: '', description: '', coverUrl: '', isPublic: true });
        setCreateOpen(false);
        fetchDiscover(true);
        fetchMyCircles();
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to create community', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create community', variant: 'destructive' });
    } finally {
      setCreateLoading(false);
    }
  };

  const renderCard = (circle: CircleItem, showLeave = false) => {
    const gradient = getGradient(circle.id, circle.name);
    const initial = circle.name.charAt(0).toUpperCase();

    return (
      <motion.div
        key={circle.id}
        variants={staggerItem}
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Card
          className="cursor-pointer overflow-hidden shadow-md hover:shadow-lg transition-shadow border-0 bg-card h-full"
          onClick={() => {
            setCircleId(circle.id);
            onNavigate('circle-detail');
          }}
        >
          {/* Cover */}
          <div className="relative h-32 overflow-hidden">
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
                <span className="text-5xl font-bold text-white/30">{initial}</span>
              </div>
            </div>
            {/* Visibility badge */}
            <div className="absolute top-2 right-2">
              <Badge className={`text-xs font-medium ${circle.isPublic ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                {circle.isPublic ? (
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" />Public</span>
                ) : (
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Private</span>
                )}
              </Badge>
            </div>
          </div>

          <CardContent className="p-4 space-y-3">
            {/* Name */}
            <h3 className="font-bold text-base line-clamp-1">{circle.name}</h3>

            {/* Description */}
            {circle.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{circle.description}</p>
            )}

            {/* Member count */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'}</span>
            </div>

            {/* Creator */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden">
                {circle.creator?.avatarUrl ? (
                  <img src={circle.creator.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  circle.creator?.username?.charAt(0).toUpperCase() || '?'
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                by @{circle.creator?.username || 'unknown'}
              </span>
            </div>

            {/* Action button */}
            {currentUser && (
              <div className="pt-1">
                {!circle.isPublic && !circle.isMember && !showLeave ? (
                  <Button size="sm" variant="outline" className="w-full text-xs" disabled>
                    <Lock className="w-3 h-3 mr-1" />
                    Private
                  </Button>
                ) : showLeave && circle.isMember ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/60 dark:text-red-400 dark:hover:bg-red-950/30"
                    onClick={(e) => handleJoin(e, circle.id, true)}
                  >
                    Leave
                  </Button>
                ) : circle.isMember ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs border-orange-200 text-orange-600 dark:border-orange-800/60 dark:text-orange-400"
                    onClick={(e) => handleJoin(e, circle.id, true)}
                  >
                    Joined ✓
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full text-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                    onClick={(e) => handleJoin(e, circle.id, false)}
                  >
                    Join
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderSkeletons = (count: number) =>
    Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="overflow-hidden border-0">
        <Skeleton className="h-32 w-full" />
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-full mt-2" />
        </CardContent>
      </Card>
    ));

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="min-h-screen px-4 py-8 max-w-6xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="shrink-0">
            <span className="text-sm">Back to Dashboard</span>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-orange-500" />
              <h1 className="text-2xl font-bold">Communities</h1>
            </div>
            <p className="text-sm text-muted-foreground">Discover and join communities</p>
          </div>
        </div>

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 gap-2">
              <Plus className="w-4 h-4" />
              Create Community
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Community</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="circle-name">Name *</Label>
                <Input
                  id="circle-name"
                  placeholder="My awesome community"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="circle-desc">Description</Label>
                <Textarea
                  id="circle-desc"
                  placeholder="What is this community about?"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="circle-cover">Cover Image URL</Label>
                <Input
                  id="circle-cover"
                  placeholder="https://example.com/cover.jpg"
                  value={createForm.coverUrl}
                  onChange={(e) => setCreateForm((p) => ({ ...p, coverUrl: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="circle-public">Public</Label>
                <Switch
                  id="circle-public"
                  checked={createForm.isPublic}
                  onCheckedChange={(checked) => setCreateForm((p) => ({ ...p, isPublic: checked }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {createForm.isPublic
                  ? 'Anyone can discover and join this community.'
                  : 'Only invited members can join.'}
              </p>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                disabled={createLoading || !createForm.name.trim()}
              >
                {createLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Community'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="my">My Communities</TabsTrigger>
        </TabsList>

        {/* Discover Tab */}
        <TabsContent value="discover">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search communities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Loading */}
          {discoverLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderSkeletons(6)}
            </div>
          )}

          {/* Empty State */}
          {!discoverLoading && discoverCircles.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">No communities found</h3>
                <p className="text-sm text-muted-foreground">
                  {search
                    ? `No results for "${search}". Try a different search.`
                    : 'Be the first to create a community!'}
                </p>
                {!search && (
                  <Button
                    className="mt-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create Community
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Grid */}
          {!discoverLoading && discoverCircles.length > 0 && (
            <>
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {discoverCircles.map((circle) => renderCard(circle))}
              </motion.div>

              {/* Load More */}
              {discoverHasMore && (
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="gap-2"
                  >
                    {loadingMore ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    Load More {discoverTotal > 0 && `(${discoverCircles.length}/${discoverTotal})`}
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* My Communities Tab */}
        <TabsContent value="my">
          {myLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderSkeletons(4)}
            </div>
          )}

          {!myLoading && myCircles.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-1">You haven&apos;t joined any communities yet</h3>
                <p className="text-sm text-muted-foreground">
                  Discover and join communities to start collaborating with others.
                </p>
                <Button
                  className="mt-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  onClick={() => setActiveTab('discover')}
                >
                  <Search className="w-4 h-4 mr-1" />
                  Discover Communities
                </Button>
              </CardContent>
            </Card>
          )}

          {!myLoading && myCircles.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {myCircles.map((circle) => renderCard(circle, true))}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-8">
      </div>
    </motion.div>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { usePlebisciteStore, type Plebiscite } from '@/stores/plebiscite-store';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import {
  Vote,
  Plus,
  Loader2,
  Clock,
  Users,
  Play,
  Upload,
  X,
  Check,
  ChevronLeft,
  Share2,
  Lock,
  ShieldCheck,
  Trophy,
  Flame,
  Timer,
  Video,
  Sparkles,
  Eye,
  Ban,
} from 'lucide-react';

// ─── Props ──────────────────────────────────────────────────────────
interface PlebisciteViewProps {
  onNavigate: (view: string) => void;
}

// ─── Animation Variants ─────────────────────────────────────────────
const staggerContainer = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const cardHover = {
  whileHover: { y: -4, scale: 1.01 },
  transition: { type: 'spring', stiffness: 300, damping: 20 },
};

const pulseGlow = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(251, 146, 60, 0)',
      '0 0 20px 4px rgba(251, 146, 60, 0.3)',
      '0 0 0 0 rgba(251, 146, 60, 0)',
    ],
    transition: { repeat: Infinity, duration: 2.5 },
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────
function getTimeRemaining(closesAt: string | null): string {
  if (!closesAt) return 'No deadline';
  const now = Date.now();
  const end = new Date(closesAt).getTime();
  const diff = end - now;

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

function getPercentage(votes: number, total: number): number {
  if (total === 0) return 50;
  return Math.round((votes / total) * 100);
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs font-medium">
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3" /> Active
          </span>
        </Badge>
      );
    case 'closed':
      return (
        <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 text-xs font-medium">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3" /> Closed
          </span>
        </Badge>
      );
    case 'draft':
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-medium">
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3" /> Draft
          </span>
        </Badge>
      );
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  }
}

// ─── Video Thumbnail Component ──────────────────────────────────────
function VideoThumbnail({
  videoUrl,
  thumbnailUrl,
  label,
  large = false,
}: {
  videoUrl: string | null;
  thumbnailUrl: string | null;
  label: string;
  large?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    if (!videoUrl) return;
    if (playing && videoRef.current) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      setPlaying(true);
    }
  };

  if (!videoUrl && !thumbnailUrl) {
    return (
      <div
        className={`rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center ${
          large ? 'h-64 sm:h-80' : 'h-36'
        }`}
      >
        <Video className="w-8 h-8 text-gray-600" />
      </div>
    );
  }

  if (playing && videoUrl) {
    return (
      <div className={`relative rounded-xl overflow-hidden ${large ? 'h-64 sm:h-80' : 'h-36'}`}>
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          autoPlay
          controls
          onEnded={() => setPlaying(false)}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePlay}
      className={`relative group rounded-xl overflow-hidden w-full ${
        large ? 'h-64 sm:h-80' : 'h-36'
      }`}
      aria-label={`Play ${label}`}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={label}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-orange-900/80 to-amber-900/80 flex items-center justify-center">
          <Video className="w-10 h-10 text-orange-300/60" />
        </div>
      )}
      {videoUrl && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-gray-900 ml-0.5" />
          </div>
        </div>
      )}
    </button>
  );
}

// ─── Upload Zone Component ──────────────────────────────────────────
function UploadZone({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { videoUrl: string; thumbnailUrl: string };
  onChange: (v: { videoUrl: string; thumbnailUrl: string }) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', file);
      const res = await fetch('/api/videos/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.videoUrl) {
        onChange({ videoUrl: json.videoUrl, thumbnailUrl: json.thumbnailUrl || '' });
        toast.success('Video uploaded successfully');
      } else {
        toast.error(json.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed — check your connection');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleRemove = () => {
    onChange({ videoUrl: '', thumbnailUrl: '' });
  };

  if (value.videoUrl) {
    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label} — Video Preview
        </Label>
        <div className="relative rounded-xl overflow-hidden">
          <VideoThumbnail
            videoUrl={value.videoUrl}
            thumbnailUrl={value.thumbnailUrl}
            label={label}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
            aria-label={`Remove ${label} video`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label} — Video (optional)
      </Label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/20'
            : 'border-muted-foreground/25 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-950/10'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag & drop a video, or <span className="text-orange-500 font-medium">browse</span>
            </p>
            <p className="text-xs text-muted-foreground/60">MP4, MOV, WebM — max 50MB</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export function PlebisciteView({ onNavigate }: PlebisciteViewProps) {
  const { currentUser } = useAuthStore();
  const {
    plebiscites,
    currentPlebiscite,
    isLoading,
    fetchPlebiscites,
    fetchPlebiscite,
    createPlebiscite,
    vote,
    closePlebiscite,
    clearCurrentPlebiscite,
  } = usePlebisciteStore();

  const [activeTab, setActiveTab] = useState('browse');
  const [votingTab, setVotingTab] = useState<string | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    optionALabel: '',
    optionBLabel: '',
    optionAVideoUrl: '',
    optionAThumbnail: '',
    optionBVideoUrl: '',
    optionBThumbnail: '',
    verifiedOnly: false,
    closesAt: '',
  });
  const [creating, setCreating] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  // Fetch plebiscites on mount
  useEffect(() => {
    fetchPlebiscites();
  }, [fetchPlebiscites]);

  // Refresh timer for time remaining
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render for time countdown
      if (activeTab === 'browse' || activeTab === 'vote') {
        fetchPlebiscites();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [activeTab, fetchPlebiscites]);

  // ─── Handlers ──────────────────────────────────────────────────────
  const handleCardClick = async (plebiscite: Plebiscite) => {
    await fetchPlebiscite(plebiscite.id);
    setVotingTab(plebiscite.id);
    setActiveTab('vote');
  };

  const handleVote = async (choice: 'A' | 'B') => {
    if (!currentUser) {
      toast.error('Please sign in to vote');
      return;
    }
    if (!currentPlebiscite) return;
    if (currentPlebiscite.verifiedOnly && !currentUser.isVerified) {
      toast.error('This plebiscite is for verified users only');
      return;
    }
    if (currentPlebiscite.status === 'closed') {
      toast.error('Voting has ended for this plebiscite');
      return;
    }

    await vote(currentPlebiscite.id, choice);
    toast.success(`Vote cast for ${choice === 'A' ? currentPlebiscite.optionALabel : currentPlebiscite.optionBLabel}!`);
  };

  const handleClose = async (id: string) => {
    setClosingId(id);
    const success = await closePlebiscite(id);
    if (success) {
      toast.success('Plebiscite closed — results are final!');
    } else {
      toast.error('Failed to close plebiscite');
    }
    setClosingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('Please sign in to create a plebiscite');
      return;
    }
    if (!createForm.title.trim() || !createForm.optionALabel.trim() || !createForm.optionBLabel.trim()) {
      toast.error('Title and both option labels are required');
      return;
    }

    setCreating(true);
    try {
      const result = await createPlebiscite({
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
        optionALabel: createForm.optionALabel.trim(),
        optionAVideoUrl: createForm.optionAVideoUrl || null,
        optionAThumbnail: createForm.optionAThumbnail || null,
        optionBLabel: createForm.optionBLabel.trim(),
        optionBVideoUrl: createForm.optionBVideoUrl || null,
        optionBThumbnail: createForm.optionBThumbnail || null,
        verifiedOnly: createForm.verifiedOnly,
        closesAt: createForm.closesAt || null,
      });

      if (result) {
        toast.success('Plebiscite created successfully! 🎉');
        setCreateForm({
          title: '',
          description: '',
          optionALabel: '',
          optionBLabel: '',
          optionAVideoUrl: '',
          optionAThumbnail: '',
          optionBVideoUrl: '',
          optionBThumbnail: '',
          verifiedOnly: false,
          closesAt: '',
        });
        setActiveTab('browse');
        fetchPlebiscites();
      } else {
        toast.error('Failed to create plebiscite');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const handleShare = (plebiscite: Plebiscite) => {
    const text = `🗳️ ${plebiscite.title}\n${plebiscite.optionALabel} vs ${plebiscite.optionBLabel}\nVote now on FeedMeForward!`;
    if (navigator.share) {
      navigator.share({ title: plebiscite.title, text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    }
  };

  const myPlebiscites = plebiscites.filter((p) => p.creatorId === currentUser?.id);
  const activePlebiscites = plebiscites.filter((p) => p.status === 'active');

  // ─── Browse Tab ──────────────────────────────────────────────────
  const renderBrowse = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-0 shadow-md">
              <Skeleton className="h-40 w-full" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (plebiscites.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/40 dark:to-amber-950/40 flex items-center justify-center mx-auto mb-6">
            <Vote className="w-10 h-10 text-orange-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Plebiscites Yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Be the first to create a community vote! Ask a compelling question with two options and let the community decide.
          </p>
          <Button
            onClick={() => setActiveTab('create')}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 gap-2"
          >
            <Plus className="w-4 h-4" />
            Create First Plebiscite
          </Button>
        </motion.div>
      );
    }

    return (
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {plebiscites.map((p) => {
          const timeRemaining = getTimeRemaining(p.closesAt);
          const isClosed = p.status === 'closed';
          const aPct = getPercentage(p.optionAVotes, p.totalVotes);
          const bPct = getPercentage(p.optionBVotes, p.totalVotes);

          return (
            <motion.div key={p.id} variants={staggerItem} {...cardHover}>
              <Card
                className="cursor-pointer overflow-hidden border-0 shadow-md hover:shadow-xl transition-all bg-card h-full flex flex-col"
                onClick={() => handleCardClick(p)}
              >
                {/* Header visual: mini vote comparison */}
                <div className="relative h-40 flex overflow-hidden">
                  {/* Option A side */}
                  <div
                    className="flex-1 bg-gradient-to-br from-orange-900/90 to-orange-800/90 flex flex-col items-center justify-center p-3 relative"
                    style={{ width: `${aPct}%`, minWidth: '30%' }}
                  >
                    {p.optionAThumbnail && (
                      <img
                        src={p.optionAThumbnail}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-30"
                      />
                    )}
                    <span className="text-white font-bold text-xs sm:text-sm text-center relative z-10 line-clamp-2">
                      {p.optionALabel}
                    </span>
                    <span className="text-white/70 text-[10px] relative z-10 mt-1">
                      {aPct}%
                    </span>
                  </div>
                  {/* Option B side */}
                  <div
                    className="flex-1 bg-gradient-to-br from-amber-900/90 to-amber-800/90 flex flex-col items-center justify-center p-3 relative"
                    style={{ width: `${bPct}%`, minWidth: '30%' }}
                  >
                    {p.optionBThumbnail && (
                      <img
                        src={p.optionBThumbnail}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-30"
                      />
                    )}
                    <span className="text-white font-bold text-xs sm:text-sm text-center relative z-10 line-clamp-2">
                      {p.optionBLabel}
                    </span>
                    <span className="text-white/70 text-[10px] relative z-10 mt-1">
                      {bPct}%
                    </span>
                  </div>
                  {/* VS badge */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-black/70 border-2 border-white/30 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">VS</span>
                    </div>
                  </div>
                  {/* Status badge */}
                  <div className="absolute top-2 left-2">{getStatusBadge(p.status)}</div>
                  {/* Winner badge */}
                  {isClosed && p.winnerLabel && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-amber-500 text-white text-xs gap-1">
                        <Trophy className="w-3 h-3" /> {p.winnerLabel === 'A' ? p.optionALabel : p.optionBLabel}
                      </Badge>
                    </div>
                  )}
                </div>

                <CardContent className="p-4 flex flex-col flex-1 gap-3">
                  {/* Title */}
                  <h3 className="font-bold text-base line-clamp-2 leading-snug">{p.title}</h3>

                  {/* Description */}
                  {p.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {p.totalVotes} votes
                      </span>
                      {p.closesAt && !isClosed && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {timeRemaining}
                        </span>
                      )}
                    </div>
                    {p.verifiedOnly && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <ShieldCheck className="w-4 h-4 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>Verified users only</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  {/* Creator */}
                  {p.creator && (
                    <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-[8px] font-bold overflow-hidden shrink-0">
                        {p.creator.avatarUrl ? (
                          <img src={p.creator.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          p.creator.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate">
                        by {p.creator.displayName || `@${p.creator.username}`}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    );
  };

  // ─── Vote Tab ────────────────────────────────────────────────────
  const renderVote = () => {
    if (!currentPlebiscite) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/40 dark:to-amber-950/40 flex items-center justify-center mx-auto mb-6">
            <Eye className="w-10 h-10 text-orange-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Plebiscite Selected</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Browse active plebiscites and click one to vote, or create your own!
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => setActiveTab('browse')}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Browse
            </Button>
            <Button
              onClick={() => setActiveTab('create')}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Create
            </Button>
          </div>
        </motion.div>
      );
    }

    const p = currentPlebiscite;
    const isClosed = p.status === 'closed';
    const hasVoted = !!p.userVoted;
    const showResults = hasVoted || isClosed;
    const aPct = getPercentage(p.optionAVotes, p.totalVotes);
    const bPct = getPercentage(p.optionBVotes, p.totalVotes);
    const aWins = p.optionAVotes > p.optionBVotes;
    const bWins = p.optionBVotes > p.optionAVotes;
    const isTie = p.optionAVotes === p.optionBVotes && p.totalVotes > 0;
    const isCreator = currentUser?.id === p.creatorId;

    return (
      <motion.div
        key={p.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-4xl mx-auto"
      >
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearCurrentPlebiscite();
            setActiveTab('browse');
          }}
          className="mb-4 gap-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Browse
        </Button>

        {/* Title section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            {getStatusBadge(p.status)}
            {p.verifiedOnly && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified Only
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">{p.title}</h1>
          {p.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">{p.description}</p>
          )}
          {p.creator && (
            <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden">
                {p.creator.avatarUrl ? (
                  <img src={p.creator.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  p.creator.username.charAt(0).toUpperCase()
                )}
              </div>
              <span>Created by {p.creator.displayName || `@${p.creator.username}`}</span>
            </div>
          )}
        </div>

        {/* Main voting area — dramatic binary choice */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-0 mb-8">
          {/* Option A */}
          <motion.div
            className={`relative rounded-2xl overflow-hidden border-4 transition-colors ${
              showResults && aWins
                ? 'border-amber-400 shadow-lg shadow-amber-500/20'
                : showResults && p.userChoice === 'A'
                ? 'border-orange-400 shadow-lg shadow-orange-500/20'
                : 'border-transparent'
            }`}
            whileHover={!hasVoted && !isClosed ? { scale: 1.02 } : {}}
          >
            <VideoThumbnail
              videoUrl={p.optionAVideoUrl}
              thumbnailUrl={p.optionAThumbnail}
              label={p.optionALabel}
              large
            />
            {/* Overlay */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded">OPTION A</span>
                {showResults && aWins && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1"
                  >
                    <Trophy className="w-3 h-3" /> WINNER
                  </motion.span>
                )}
                {!showResults && hasVoted && p.userChoice === 'A' && (
                  <Badge className="bg-orange-500 text-white text-xs gap-1">
                    <Check className="w-3 h-3" /> Your Vote
                  </Badge>
                )}
              </div>
              <h2 className="text-white text-xl sm:text-2xl font-extrabold mb-1">{p.optionALabel}</h2>
              {showResults && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${aPct}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                >
                  <div className="flex items-center justify-between text-sm text-white/80 mb-1">
                    <span>{p.optionAVotes.toLocaleString()} votes</span>
                    <span className="font-bold text-white">{aPct}%</span>
                  </div>
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${aPct}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Divider (desktop) */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2 z-10" style={{ position: 'relative' }}>
            <div
              className="w-14 h-14 rounded-full bg-background border-4 border-orange-400 flex items-center justify-center shadow-xl z-10"
              style={{ position: 'absolute', left: '-50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            >
              <span className="font-black text-orange-500 text-sm">VS</span>
            </div>
          </div>

          {/* Option B */}
          <motion.div
            className={`relative rounded-2xl overflow-hidden border-4 transition-colors ${
              showResults && bWins
                ? 'border-amber-400 shadow-lg shadow-amber-500/20'
                : showResults && p.userChoice === 'B'
                ? 'border-orange-400 shadow-lg shadow-orange-500/20'
                : 'border-transparent'
            }`}
            whileHover={!hasVoted && !isClosed ? { scale: 1.02 } : {}}
          >
            <VideoThumbnail
              videoUrl={p.optionBVideoUrl}
              thumbnailUrl={p.optionBThumbnail}
              label={p.optionBLabel}
              large
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded">OPTION B</span>
                {showResults && bWins && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1"
                  >
                    <Trophy className="w-3 h-3" /> WINNER
                  </motion.span>
                )}
                {!showResults && hasVoted && p.userChoice === 'B' && (
                  <Badge className="bg-orange-500 text-white text-xs gap-1">
                    <Check className="w-3 h-3" /> Your Vote
                  </Badge>
                )}
              </div>
              <h2 className="text-white text-xl sm:text-2xl font-extrabold mb-1">{p.optionBLabel}</h2>
              {showResults && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${bPct}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                >
                  <div className="flex items-center justify-between text-sm text-white/80 mb-1">
                    <span>{p.optionBVotes.toLocaleString()} votes</span>
                    <span className="font-bold text-white">{bPct}%</span>
                  </div>
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${bPct}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* VS badge mobile */}
        <div className="flex md:hidden items-center justify-center -mt-12 mb-4 z-10">
          <div className="w-14 h-14 rounded-full bg-background border-4 border-orange-400 flex items-center justify-center shadow-xl">
            <span className="font-black text-orange-500 text-sm">VS</span>
          </div>
        </div>

        {/* Time remaining & total votes */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {p.totalVotes.toLocaleString()} total votes
          </span>
          {p.closesAt && !isClosed && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {getTimeRemaining(p.closesAt)}
            </span>
          )}
          {isClosed && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="w-3 h-3" /> Voting Closed
            </Badge>
          )}
        </div>

        {/* Tie indicator */}
        {showResults && isTie && !isClosed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-6"
          >
            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 text-sm px-4 py-1">
              <Sparkles className="w-4 h-4 mr-1" /> It's a tie! Every vote counts.
            </Badge>
          </motion.div>
        )}

        {/* Vote buttons (if not voted and not closed) */}
        {!hasVoted && !isClosed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <Separator className="mb-6" />
            <h3 className="text-center font-bold text-lg mb-4">Cast Your Vote</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <motion.div {...pulseGlow}>
                <Button
                  size="lg"
                  className="w-full h-16 text-lg font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30 gap-2 transition-all"
                  onClick={() => handleVote('A')}
                  disabled={!currentUser}
                >
                  <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded mr-1">A</span>
                  {p.optionALabel}
                </Button>
              </motion.div>
              <motion.div {...pulseGlow}>
                <Button
                  size="lg"
                  className="w-full h-16 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30 gap-2 transition-all"
                  onClick={() => handleVote('B')}
                  disabled={!currentUser}
                >
                  <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded mr-1">B</span>
                  {p.optionBLabel}
                </Button>
              </motion.div>
            </div>
            {!currentUser && (
              <p className="text-center text-sm text-muted-foreground mt-3">
                <button type="button" onClick={() => onNavigate('login')} className="text-orange-500 hover:underline font-medium">
                  Sign in
                </button>{' '}
                to cast your vote
              </p>
            )}
          </motion.div>
        )}

        {/* Already voted message */}
        {hasVoted && !isClosed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mb-6"
          >
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-sm px-4 py-1 gap-1">
              <Check className="w-4 h-4" /> You voted for Option {p.userChoice} ({p.userChoice === 'A' ? p.optionALabel : p.optionBLabel})
            </Badge>
          </motion.div>
        )}

        {/* Closed results message */}
        {isClosed && p.winnerLabel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-6"
          >
            <Card className="inline-flex items-center gap-3 px-6 py-3 border-2 border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
              <Trophy className="w-6 h-6 text-amber-500" />
              <div className="text-left">
                <p className="text-xs text-muted-foreground font-medium">Winner</p>
                <p className="font-bold text-lg">
                  {p.winnerLabel === 'A' ? p.optionALabel : p.optionBLabel}
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Results progress bars (always show if results visible) */}
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <Card className="border-0 shadow-md bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
              <CardContent className="p-6">
                <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wide mb-4 text-center">
                  Live Results
                </h4>
                {/* A bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm">{p.optionALabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{p.optionAVotes.toLocaleString()}</span>
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{aPct}%</span>
                    </div>
                  </div>
                  <div className="h-4 bg-white dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${aPct}%` }}
                      transition={{ duration: 1.5, ease: 'easeOut', delay: 0.6 }}
                    />
                  </div>
                </div>
                {/* B bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm">{p.optionBLabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{p.optionBVotes.toLocaleString()}</span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{bPct}%</span>
                    </div>
                  </div>
                  <div className="h-4 bg-white dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${bPct}%` }}
                      transition={{ duration: 1.5, ease: 'easeOut', delay: 0.7 }}
                    />
                  </div>
                </div>
                {/* Participation */}
                <p className="text-xs text-muted-foreground text-center mt-4">
                  {p.totalVotes.toLocaleString()} total votes cast
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => handleShare(p)}
          >
            <Share2 className="w-4 h-4" />
            Share This Plebiscite
          </Button>
          {isCreator && !isClosed && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="gap-2" disabled={closingId === p.id}>
                  {closingId === p.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Ban className="w-4 h-4" />
                  )}
                  Close Voting
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Close This Plebiscite?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. The current standings will become the final result.
                    <br />
                    <strong>{p.optionALabel}</strong>: {aPct}% ({p.optionAVotes} votes)
                    <br />
                    <strong>{p.optionBLabel}</strong>: {bPct}% ({p.optionBVotes} votes)
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="destructive"
                    onClick={() => handleClose(p.id)}
                    disabled={closingId === p.id}
                    className="gap-2"
                  >
                    {closingId === p.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Ban className="w-4 h-4" />
                    )}
                    Yes, Close Now
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </motion.div>
    );
  };

  // ─── Create Tab ──────────────────────────────────────────────────
  const renderCreate = () => {
    if (!currentUser) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Sign In Required</h3>
          <p className="text-muted-foreground mb-6">Create an account to start community votes</p>
          <Button
            onClick={() => onNavigate('login')}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
          >
            Sign In
          </Button>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Create a Plebiscite</CardTitle>
                <CardDescription>
                  Ask the community to decide between two options
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="pleb-title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pleb-title"
                  placeholder="e.g., Who should be Governor?"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  className="text-base"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="pleb-desc">Description</Label>
                <Textarea
                  id="pleb-desc"
                  placeholder="Add context or background for this vote..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <Separator />

              {/* Option A section */}
              <div className="space-y-3 p-4 rounded-xl border-2 border-orange-200 dark:border-orange-800/40 bg-orange-50/50 dark:bg-orange-950/10">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">A</span>
                  <Label className="font-bold">Option A</Label>
                </div>
                <Input
                  placeholder="Label for Option A"
                  value={createForm.optionALabel}
                  onChange={(e) => setCreateForm((f) => ({ ...f, optionALabel: e.target.value }))}
                  required
                />
                <UploadZone
                  label="Option A"
                  value={{
                    videoUrl: createForm.optionAVideoUrl,
                    thumbnailUrl: createForm.optionAThumbnail,
                  }}
                  onChange={(v) =>
                    setCreateForm((f) => ({ ...f, optionAVideoUrl: v.videoUrl, optionAThumbnail: v.thumbnailUrl }))
                  }
                />
              </div>

              {/* Option B section */}
              <div className="space-y-3 p-4 rounded-xl border-2 border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/10">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">B</span>
                  <Label className="font-bold">Option B</Label>
                </div>
                <Input
                  placeholder="Label for Option B"
                  value={createForm.optionBLabel}
                  onChange={(e) => setCreateForm((f) => ({ ...f, optionBLabel: e.target.value }))}
                  required
                />
                <UploadZone
                  label="Option B"
                  value={{
                    videoUrl: createForm.optionBVideoUrl,
                    thumbnailUrl: createForm.optionBThumbnail,
                  }}
                  onChange={(v) =>
                    setCreateForm((f) => ({ ...f, optionBVideoUrl: v.videoUrl, optionBThumbnail: v.thumbnailUrl }))
                  }
                />
              </div>

              <Separator />

              {/* Settings */}
              <div className="space-y-4">
                {/* Verified only toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-medium flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-500" />
                      Verified users only
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Only verified users will be able to cast a vote
                    </p>
                  </div>
                  <Switch
                    checked={createForm.verifiedOnly}
                    onCheckedChange={(c) => setCreateForm((f) => ({ ...f, verifiedOnly: c }))}
                  />
                </div>

                {/* Closes At */}
                <div className="space-y-2">
                  <Label htmlFor="pleb-closes" className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                    Closing Date & Time (optional)
                  </Label>
                  <Input
                    id="pleb-closes"
                    type="datetime-local"
                    value={createForm.closesAt}
                    onChange={(e) => setCreateForm((f) => ({ ...f, closesAt: e.target.value }))}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank for an open-ended vote
                  </p>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 text-base font-semibold"
                disabled={
                  creating ||
                  !createForm.title.trim() ||
                  !createForm.optionALabel.trim() ||
                  !createForm.optionBLabel.trim()
                }
              >
                {creating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Creating Plebiscite...
                  </>
                ) : (
                  <>
                    <Vote className="w-5 h-5 mr-2" />
                    Create Plebiscite
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // ─── My Plebiscites Tab ──────────────────────────────────────────
  const renderMine = () => {
    if (!currentUser) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Sign In Required</h3>
          <p className="text-muted-foreground mb-6">Sign in to see your plebiscites</p>
          <Button
            onClick={() => onNavigate('login')}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
          >
            Sign In
          </Button>
        </motion.div>
      );
    }

    if (isLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (myPlebiscites.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/40 dark:to-amber-950/40 flex items-center justify-center mx-auto mb-6">
            <Plus className="w-10 h-10 text-orange-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Plebiscites Created</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            You haven&apos;t created any plebiscites yet. Start one now and let the community decide!
          </p>
          <Button
            onClick={() => setActiveTab('create')}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Your First
          </Button>
        </motion.div>
      );
    }

    return (
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-3 max-w-3xl mx-auto"
      >
        {/* Stats bar */}
        <motion.div variants={staggerItem} className="grid grid-cols-3 gap-3 mb-4">
          <Card className="border-0 shadow-sm bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {myPlebiscites.filter((p) => p.status === 'active').length}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {myPlebiscites.filter((p) => p.status === 'closed').length}
              </p>
              <p className="text-xs text-muted-foreground">Closed</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-950/20">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {myPlebiscites.reduce((sum, p) => sum + p.totalVotes, 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Votes</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* List */}
        {myPlebiscites.map((p) => {
          const aPct = getPercentage(p.optionAVotes, p.totalVotes);
          const bPct = getPercentage(p.optionBVotes, p.totalVotes);

          return (
            <motion.div key={p.id} variants={staggerItem} {...cardHover}>
              <Card
                className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                onClick={() => handleCardClick(p)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Mini vote visual */}
                    <div className="hidden sm:flex w-16 h-16 rounded-xl overflow-hidden shrink-0">
                      <div className="w-1/2 bg-gradient-to-b from-orange-500 to-orange-600" style={{ height: `${aPct}%`, alignSelf: 'flex-end' }} />
                      <div className="w-1/2 bg-gradient-to-b from-amber-500 to-amber-600" style={{ height: `${bPct}%`, alignSelf: 'flex-end' }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-sm truncate">{p.title}</h3>
                        {getStatusBadge(p.status)}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {p.optionALabel} vs {p.optionBLabel}
                      </p>
                      {/* Mini progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500"
                            style={{ width: `${aPct}%` }}
                          />
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                            style={{ width: `${bPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {p.totalVotes} votes
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(p);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      {p.status === 'active' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="text-xs h-8 gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClose(p.id);
                          }}
                          disabled={closingId === p.id}
                        >
                          {closingId === p.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Ban className="w-3 h-3" />
                          )}
                          Close
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="min-h-screen px-4 py-8 max-w-6xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => onNavigate('dashboard')}
              className="shrink-0"
            >
              <span className="text-sm">Back</span>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                  <Vote className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Plebiscites</h1>
                  <p className="text-sm text-muted-foreground">
                    Community votes — let the people decide
                  </p>
                </div>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setActiveTab('create')}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Plebiscite
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="browse" className="gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            Browse
            {activePlebiscites.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 h-5">
                {activePlebiscites.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vote" className="gap-1.5">
            <Vote className="w-3.5 h-3.5" />
            Vote
            {currentPlebiscite && (
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Create
          </TabsTrigger>
          <TabsTrigger value="mine" className="gap-1.5">
            <Users className="w-3.5 h-3.5" />
            My Plebiscites
            {currentUser && myPlebiscites.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 h-5">
                {myPlebiscites.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TabsContent value="browse" className="mt-0">
              {renderBrowse()}
            </TabsContent>
            <TabsContent value="vote" className="mt-0">
              {renderVote()}
            </TabsContent>
            <TabsContent value="create" className="mt-0">
              {renderCreate()}
            </TabsContent>
            <TabsContent value="mine" className="mt-0">
              {renderMine()}
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </motion.div>
  );
}

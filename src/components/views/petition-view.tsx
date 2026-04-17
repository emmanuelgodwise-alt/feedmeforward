'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { usePetitionStore, Petition, PetitionSignature } from '@/stores/petition-store';
import { useAuthStore } from '@/stores/auth-store';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  PenLine,
  FileSignature,
  Megaphone,
  UserCircle,
  Play,
  CheckCircle2,
  Clock,
  Users,
  Target,
  Share2,
  Upload,
  X,
  ChevronLeft,
  Loader2,
  Send,
  Video,
  MessageSquare,
  Eye,
  AlertCircle,
  Flame,
  Sparkles,
  Award,
  ArrowRight,
  Handshake,
  CircleCheck,
  Bell,
  RefreshCw,
  Plus,
  GripVertical,
  Check,
} from 'lucide-react';

// ─── View Props ──────────────────────────────────────────────────────

interface ViewProps {
  onNavigate: (view: string) => void;
}

// ─── Animation Variants ──────────────────────────────────────────────

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

// ─── Helper Functions ────────────────────────────────────────────────

function getProgressColor(pct: number): string {
  if (pct >= 100) return 'from-emerald-500 to-green-400';
  if (pct >= 75) return 'from-green-500 to-emerald-400';
  if (pct >= 50) return 'from-blue-500 to-cyan-400';
  if (pct >= 25) return 'from-amber-500 to-yellow-400';
  return 'from-orange-500 to-amber-400';
}

function getProgressBgColor(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  if (pct >= 75) return 'bg-green-500/15 text-green-700 dark:text-green-300';
  if (pct >= 50) return 'bg-blue-500/15 text-blue-700 dark:text-blue-300';
  if (pct >= 25) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
  return 'bg-orange-500/15 text-orange-700 dark:text-orange-300';
}

function getProgressBadgeClass(pct: number): string {
  if (pct >= 100) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40';
  if (pct >= 75) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800/40';
  if (pct >= 50) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/40';
  if (pct >= 25) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40';
  return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800/40';
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800/40',
      };
    case 'delivered':
      return {
        label: 'Delivered',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/40',
      };
    case 'responded':
      return {
        label: 'Responded',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
      };
    case 'resolved':
      return {
        label: 'Resolved',
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
      };
    default:
      return {
        label: status,
        className: 'bg-muted text-muted-foreground',
      };
  }
}

function getTimeRemaining(closesAt: string | null): string | null {
  if (!closesAt) return null;
  const now = Date.now();
  const end = new Date(closesAt).getTime();
  const diff = end - now;
  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trimEnd() + '...';
}

// ─── Status Timeline ─────────────────────────────────────────────────

const statusSteps = [
  { key: 'active', label: 'Active', icon: Megaphone, color: 'text-orange-500', bgColor: 'bg-orange-500', ringColor: 'ring-orange-500/30' },
  { key: 'delivered', label: 'Delivered', icon: Send, color: 'text-blue-500', bgColor: 'bg-blue-500', ringColor: 'ring-blue-500/30' },
  { key: 'responded', label: 'Responded', icon: MessageSquare, color: 'text-amber-500', bgColor: 'bg-amber-500', ringColor: 'ring-amber-500/30' },
  { key: 'resolved', label: 'Resolved', icon: CircleCheck, color: 'text-emerald-500', bgColor: 'bg-emerald-500', ringColor: 'ring-emerald-500/30' },
];

function StatusTimeline({ petition }: { petition: Petition }) {
  const currentIdx = statusSteps.findIndex((s) => s.key === petition.status);
  return (
    <div className="flex items-center justify-between py-2">
      {statusSteps.map((step, idx) => {
        const isReached = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isReached
                    ? `${step.bgColor} text-white shadow-lg`
                    : 'bg-muted text-muted-foreground'
                } ${isCurrent ? `ring-4 ${step.ringColor}` : ''}`}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              >
                <Icon className="w-5 h-5" />
              </motion.div>
              <span className={`text-xs mt-1.5 font-medium ${isReached ? step.color : 'text-muted-foreground'}`}>
                {step.label}
              </span>
              {isCurrent && petition.deliveredAt && idx === 1 && (
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(petition.deliveredAt).toLocaleDateString()}
                </span>
              )}
            </div>
            {idx < statusSteps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mb-5">
                <motion.div
                  className={`h-full rounded-full ${idx < currentIdx ? 'bg-primary' : 'bg-muted'}`}
                  initial={{ width: '0%' }}
                  animate={{ width: idx < currentIdx ? '100%' : '0%' }}
                  transition={{ duration: 0.5, delay: idx * 0.2 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Petition Card ───────────────────────────────────────────────────

function PetitionCard({
  petition,
  onClick,
}: {
  petition: Petition;
  onClick: () => void;
}) {
  const pct = petition.goalSignatures
    ? Math.min(Math.round((petition.currentSignatures / petition.goalSignatures) * 100), 100)
    : petition.currentSignatures > 0
      ? Math.min(petition.currentSignatures * 10, 100)
      : 0;
  const statusBadge = getStatusBadge(petition.status);
  const timeRemaining = getTimeRemaining(petition.closesAt);

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      variants={staggerItem}
    >
      <Card
        className="cursor-pointer hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 border-border/60 overflow-hidden group"
        onClick={onClick}
      >
        {/* Thumbnail or Gradient Header */}
        <div className="relative h-32 overflow-hidden">
          {petition.thumbnailUrl ? (
            <img
              src={petition.thumbnailUrl}
              alt={petition.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getProgressColor(pct)} opacity-20`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge className={`border text-[11px] ${statusBadge.className}`}>
              {statusBadge.label}
            </Badge>
            {petition.userSigned && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40 text-[11px]">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Signed
              </Badge>
            )}
          </div>
          {timeRemaining && (
            <div className="absolute top-3 right-3">
              <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-[11px]">
                <Clock className="w-3 h-3 mr-1" />
                {timeRemaining}
              </Badge>
            </div>
          )}
          {petition.videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-background/90 flex items-center justify-center shadow-lg">
                <Play className="w-5 h-5 text-orange-500 ml-0.5" />
              </div>
            </div>
          )}
        </div>

        <CardContent className="p-4 pt-3">
          <h3 className="font-semibold text-base leading-snug mb-1.5 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
            {petition.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {petition.description}
          </p>

          {/* Target */}
          {petition.targetName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <Target className="w-3.5 h-3.5" />
              <span>Directed to: {petition.targetName}{petition.targetTitle ? `, ${petition.targetTitle}` : ''}</span>
            </div>
          )}

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium px-2 py-0.5 rounded-full ${getProgressBgColor(pct)}`}>
                {pct}% of goal
              </span>
              <span className="text-muted-foreground">
                {petition.currentSignatures}{petition.goalSignatures ? ` / ${petition.goalSignatures}` : ''} signatures
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${getProgressColor(pct)} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Creator */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                {petition.creator?.avatarUrl && <AvatarImage src={petition.creator.avatarUrl} />}
                <AvatarFallback className="text-[10px] bg-orange-100 text-orange-600">
                  {(petition.creator?.displayName || petition.creator?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {petition.creator?.displayName || petition.creator?.username || 'Anonymous'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatRelativeDate(petition.createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Sign Petition Dialog ────────────────────────────────────────────

function SignPetitionDialog({
  petition,
  open,
  onOpenChange,
  onSign,
}: {
  petition: Petition;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSign: (comment: string, videoFile: File | null) => void;
}) {
  const [comment, setComment] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    onSign(comment, videoFile);
    setComment('');
    removeVideo();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-orange-500" />
            Sign This Petition
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            You&apos;re signing: <span className="font-medium text-foreground">{petition.title}</span>
          </p>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="sign-comment" className="text-sm font-medium">
              <MessageSquare className="w-4 h-4 inline mr-1.5" />
              Why are you signing? (optional)
            </Label>
            <Textarea
              id="sign-comment"
              placeholder="Share your reason for supporting this petition..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Video Signature */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              <Video className="w-4 h-4 inline mr-1.5" />
              Video Signature (optional)
            </Label>
            <p className="text-xs text-muted-foreground">Attach a short video explaining why you support this cause.</p>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideoSelect}
            />
            {videoPreview ? (
              <div className="relative rounded-lg overflow-hidden border">
                <video src={videoPreview} className="w-full h-32 object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 w-7 h-7"
                  onClick={removeVideo}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-dashed gap-2"
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {isUploading ? 'Uploading...' : 'Attach Video'}
              </Button>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-lg shadow-orange-500/20"
              onClick={handleSubmit}
            >
              <PenLine className="w-4 h-4 mr-2" />
              Sign Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Response Dialog ─────────────────────────────────────────────────

function ResponseDialog({
  petitionId,
  open,
  onOpenChange,
  onSubmit,
}: {
  petitionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, text: string) => void;
}) {
  const [responseText, setResponseText] = useState('');

  const handleSubmit = () => {
    if (!responseText.trim()) return;
    onSubmit(petitionId, responseText.trim());
    setResponseText('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            Add Target Response
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="response-text" className="text-sm font-medium">
              Response from target
            </Label>
            <Textarea
              id="response-text"
              placeholder="Enter the response from the petition target..."
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold"
              onClick={handleSubmit}
              disabled={!responseText.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Response
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function PetitionView({ onNavigate }: ViewProps) {
  const { currentUser } = useAuthStore();
  const {
    petitions,
    currentPetition,
    isLoading,
    error,
    fetchPetitions,
    fetchPetition,
    createPetition,
    signPetition,
    deliverPetition,
    respondPetition,
    resolvePetition,
    clearCurrentPetition,
  } = usePetitionStore();

  const [activeTab, setActiveTab] = useState('browse');
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);

  // ─── Create Petition Form State ──────────────────────────────────
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createVideoFile, setCreateVideoFile] = useState<File | null>(null);
  const [createVideoPreview, setCreateVideoPreview] = useState<string | null>(null);
  const [createThumbnail, setCreateThumbnail] = useState<string | null>(null);
  const [createTargetName, setCreateTargetName] = useState('');
  const [createTargetTitle, setCreateTargetTitle] = useState('');
  const [createGoalSignatures, setCreateGoalSignatures] = useState('');
  const [createClosesAt, setCreateClosesAt] = useState('');
  const [createTags, setCreateTags] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const createVideoInputRef = useRef<HTMLInputElement>(null);

  // ─── My Petitions Filter ─────────────────────────────────────────
  const myPetitions = currentUser
    ? petitions.filter((p) => p.creatorId === currentUser.id)
    : [];

  // ─── Fetch petitions on mount ────────────────────────────────────
  useEffect(() => {
    fetchPetitions();
  }, [fetchPetitions]);

  // ─── Tab change handler ──────────────────────────────────────────
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'view' && currentPetition) {
      clearCurrentPetition();
    }
  };

  // ─── Select a petition to view ───────────────────────────────────
  const handleSelectPetition = useCallback(
    async (petition: Petition) => {
      await fetchPetition(petition.id);
      setActiveTab('view');
    },
    [fetchPetition]
  );

  // ─── Sign a petition ─────────────────────────────────────────────
  const handleSignPetition = useCallback(
    async (comment: string, videoFile: File | null) => {
      if (!currentPetition || !currentUser) return;

      let videoUrl: string | null = null;
      let thumbnailUrl: string | null = null;

      if (videoFile) {
        setIsUploadingVideo(true);
        try {
          const formData = new FormData();
          formData.append('video', videoFile);
          const res = await fetch('/api/videos/upload', {
            method: 'POST',
            headers: { 'X-User-Id': currentUser.id },
            body: formData,
          });
          const json = await res.json();
          if (json.success) {
            videoUrl = json.videoUrl;
            thumbnailUrl = json.thumbnailUrl;
          } else {
            toast.error('Failed to upload video signature');
          }
        } catch {
          toast.error('Failed to upload video');
        } finally {
          setIsUploadingVideo(false);
        }
      }

      await signPetition(currentPetition.id, {
        videoUrl,
        comment: comment || null,
      });

      toast.success('Petition signed successfully!', {
        description: 'Thank you for your support.',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      });
    },
    [currentPetition, currentUser, signPetition]
  );

  // ─── Create a petition ───────────────────────────────────────────
  const handleCreatePetition = useCallback(async () => {
    if (!createTitle.trim() || !createDescription.trim()) {
      toast.error('Please fill in required fields', {
        description: 'Title and description are required.',
      });
      return;
    }
    if (!currentUser) {
      toast.error('Please sign in to create a petition');
      return;
    }

    setIsCreating(true);
    let videoUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    if (createVideoFile) {
      try {
        const formData = new FormData();
        formData.append('video', createVideoFile);
        const res = await fetch('/api/videos/upload', {
          method: 'POST',
          headers: { 'X-User-Id': currentUser.id },
          body: formData,
        });
        const json = await res.json();
        if (json.success) {
          videoUrl = json.videoUrl;
          thumbnailUrl = json.thumbnailUrl;
        } else {
          toast.error('Failed to upload lead clip');
        }
      } catch {
        toast.error('Failed to upload video');
      }
    }

    const goalSignatures = createGoalSignatures ? parseInt(createGoalSignatures, 10) : null;

    const petition = await createPetition({
      title: createTitle.trim(),
      description: createDescription.trim(),
      videoUrl,
      thumbnailUrl,
      targetName: createTargetName.trim() || null,
      targetTitle: createTargetTitle.trim() || null,
      goalSignatures: goalSignatures && goalSignatures > 0 ? goalSignatures : null,
      closesAt: createClosesAt || null,
      tags: createTags.trim() || null,
    });

    if (petition) {
      toast.success('Petition created!', {
        description: 'Your petition is now live and ready for signatures.',
        icon: <Sparkles className="w-5 h-5 text-orange-500" />,
      });
      setCreateTitle('');
      setCreateDescription('');
      setCreateVideoFile(null);
      setCreateVideoPreview(null);
      setCreateThumbnail(null);
      setCreateTargetName('');
      setCreateTargetTitle('');
      setCreateGoalSignatures('');
      setCreateClosesAt('');
      setCreateTags('');
      setActiveTab('browse');
    } else {
      toast.error('Failed to create petition');
    }
    setIsCreating(false);
  }, [
    createTitle,
    createDescription,
    createVideoFile,
    createTargetName,
    createTargetTitle,
    createGoalSignatures,
    createClosesAt,
    createTags,
    currentUser,
    createPetition,
  ]);

  // ─── Video upload for create form ────────────────────────────────
  const handleCreateVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCreateVideoFile(file);
      setCreateVideoPreview(URL.createObjectURL(file));
    }
  };

  const removeCreateVideo = () => {
    setCreateVideoFile(null);
    setCreateVideoPreview(null);
    setCreateThumbnail(null);
    if (createVideoInputRef.current) createVideoInputRef.current.value = '';
  };

  // ─── Deliver petition handler ────────────────────────────────────
  const handleDeliver = useCallback(
    async (id: string) => {
      const ok = await deliverPetition(id);
      if (ok) {
        toast.success('Petition marked as delivered!', {
          icon: <Send className="w-5 h-5 text-blue-500" />,
        });
        if (currentPetition?.id === id) {
          await fetchPetition(id);
        }
      } else {
        toast.error('Failed to mark as delivered');
      }
    },
    [deliverPetition, currentPetition, fetchPetition]
  );

  // ─── Respond petition handler ────────────────────────────────────
  const handleRespond = useCallback(
    async (id: string, responseText: string) => {
      const ok = await respondPetition(id, responseText);
      if (ok) {
        toast.success('Response added!', {
          icon: <MessageSquare className="w-5 h-5 text-amber-500" />,
        });
        if (currentPetition?.id === id) {
          await fetchPetition(id);
        }
      } else {
        toast.error('Failed to add response');
      }
    },
    [respondPetition, currentPetition, fetchPetition]
  );

  // ─── Resolve petition handler ────────────────────────────────────
  const handleResolve = useCallback(
    async (id: string) => {
      const ok = await resolvePetition(id);
      if (ok) {
        toast.success('Petition marked as resolved!', {
          icon: <CircleCheck className="w-5 h-5 text-emerald-500" />,
        });
        if (currentPetition?.id === id) {
          await fetchPetition(id);
        }
      } else {
        toast.error('Failed to resolve petition');
      }
    },
    [resolvePetition, currentPetition, fetchPetition]
  );

  // ─── Share petition handler ──────────────────────────────────────
  const handleShare = useCallback((petition: Petition) => {
    if (navigator.share) {
      navigator.share({
        title: petition.title,
        text: `Sign this petition: ${petition.title}`,
        url: window.location.origin,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${petition.title} — Sign at ${window.location.origin}`);
      toast.success('Link copied to clipboard!');
    }
  }, []);

  // ─── Current petition progress ───────────────────────────────────
  const currentPct = currentPetition
    ? currentPetition.goalSignatures
      ? Math.min(Math.round((currentPetition.currentSignatures / currentPetition.goalSignatures) * 100), 100)
      : currentPetition.currentSignatures > 0
        ? Math.min(currentPetition.currentSignatures * 10, 100)
        : 0
    : 0;

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="min-h-screen px-4 py-6 max-w-5xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={staggerItem} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')} className="shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20">
                  <FileSignature className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold">Petitions</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Amplify your voice, drive real change</p>
            </div>
          </div>
          {currentUser && (
            <Button
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 gap-2"
              onClick={() => setActiveTab('create')}
            >
              <Plus className="w-4 h-4" />
              New Petition
            </Button>
          )}
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full sm:w-auto grid grid-cols-4 mb-6">
            <TabsTrigger value="browse" className="gap-1.5 text-xs sm:text-sm">
              <Megaphone className="w-4 h-4 hidden sm:block" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="view" className="gap-1.5 text-xs sm:text-sm" disabled={!currentPetition}>
              <Eye className="w-4 h-4 hidden sm:block" />
              View
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-1.5 text-xs sm:text-sm">
              <Plus className="w-4 h-4 hidden sm:block" />
              Create
            </TabsTrigger>
            <TabsTrigger value="mine" className="gap-1.5 text-xs sm:text-sm">
              <UserCircle className="w-4 h-4 hidden sm:block" />
              My Petitions
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════ BROWSE TAB ═══════════════════ */}
          <TabsContent value="browse">
            <AnimatePresence mode="wait">
              {isLoading && petitions.length === 0 ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center py-20"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-20"
                >
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <p className="text-lg font-medium text-destructive mb-2">Something went wrong</p>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                  <Button variant="outline" onClick={fetchPetitions} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </Button>
                </motion.div>
              ) : petitions.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-20"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center mx-auto mb-4">
                    <FileSignature className="w-8 h-8 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Petitions Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                    Be the first to raise your voice! Create a petition and rally support for your cause.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 gap-2"
                    onClick={() => setActiveTab('create')}
                  >
                    <Plus className="w-4 h-4" />
                    Create First Petition
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="grid"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {/* Featured / Stats Banner */}
                  <motion.div variants={staggerItem} className="mb-6">
                    <div className="rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-5 text-white shadow-lg shadow-orange-500/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold flex items-center gap-2">
                            <Flame className="w-5 h-5" />
                            Active Petitions
                          </h2>
                          <p className="text-orange-100 text-sm mt-1">
                            {petitions.filter((p) => p.status === 'active').length} active &middot;{' '}
                            {petitions.reduce((sum, p) => sum + p.currentSignatures, 0).toLocaleString()} total signatures
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-bold">{petitions.length}</span>
                          <p className="text-orange-100 text-xs">Total Petitions</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Petition Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {petitions.map((petition) => (
                      <PetitionCard
                        key={petition.id}
                        petition={petition}
                        onClick={() => handleSelectPetition(petition)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ═══════════════════ VIEW TAB ═══════════════════ */}
          <TabsContent value="view">
            <AnimatePresence mode="wait">
              {currentPetition ? (
                <motion.div
                  key={currentPetition.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Back Button */}
                  <Button
                    variant="ghost"
                    className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
                    onClick={() => handleTabChange('browse')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Browse
                  </Button>

                  {/* Hero Section */}
                  <Card className="overflow-hidden border-2 border-orange-200/60 dark:border-orange-800/30">
                    {/* Video or Gradient Header */}
                    {currentPetition.videoUrl ? (
                      <div className="relative aspect-video max-h-[400px]">
                        <video
                          src={currentPetition.videoUrl}
                          poster={currentPetition.thumbnailUrl || undefined}
                          controls
                          className="w-full h-full object-cover"
                          preload="metadata"
                        />
                      </div>
                    ) : currentPetition.thumbnailUrl ? (
                      <div className="relative h-48">
                        <img
                          src={currentPetition.thumbnailUrl}
                          alt={currentPetition.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                      </div>
                    ) : (
                      <div className={`h-32 bg-gradient-to-r ${getProgressColor(currentPct)} opacity-30`} />
                    )}

                    <CardContent className="p-6">
                      {/* Status + Share Row */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {(() => {
                            const sb = getStatusBadge(currentPetition.status);
                            return <Badge className={`border ${sb.className}`}>{sb.label}</Badge>;
                          })()}
                          {currentPetition.tags && (
                            currentPetition.tags.split(',').map((tag) => (
                              <Badge key={tag.trim()} variant="outline" className="text-xs">
                                #{tag.trim()}
                              </Badge>
                            ))
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleShare(currentPetition)}>
                                <Share2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Share</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Share this petition</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Title */}
                      <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-3">
                        {currentPetition.title}
                      </h1>

                      {/* Description */}
                      <p className="text-muted-foreground leading-relaxed mb-4 whitespace-pre-wrap">
                        {currentPetition.description}
                      </p>

                      {/* Target Info */}
                      {currentPetition.targetName && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/30 mb-5">
                          <Target className="w-5 h-5 text-orange-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                              Directed to: {currentPetition.targetName}
                            </p>
                            {currentPetition.targetTitle && (
                              <p className="text-xs text-muted-foreground">{currentPetition.targetTitle}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Creator */}
                      <div className="flex items-center gap-3 mb-5">
                        <Avatar className="w-8 h-8">
                          {currentPetition.creator?.avatarUrl && (
                            <AvatarImage src={currentPetition.creator.avatarUrl} />
                          )}
                          <AvatarFallback className="text-xs bg-orange-100 text-orange-600">
                            {(currentPetition.creator?.displayName || currentPetition.creator?.username || 'U')
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="text-sm font-medium">
                            {currentPetition.creator?.displayName || currentPetition.creator?.username || 'Anonymous'}
                          </span>
                          {currentPetition.creator?.isVerified && (
                            <Badge className="ml-2 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 border-0 text-[10px] px-1.5 py-0">
                              Verified
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Created {formatRelativeDate(currentPetition.createdAt)}
                          </p>
                        </div>
                      </div>

                      <Separator className="mb-5" />

                      {/* Signature Progress */}
                      <div className="space-y-4 mb-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Users className="w-5 h-5 text-orange-500" />
                            Signature Progress
                          </h3>
                          <Badge className={getProgressBadgeClass(currentPct)}>
                            {currentPct}%
                          </Badge>
                        </div>

                        {/* Large Progress Bar */}
                        <div className="space-y-2">
                          <div className="w-full h-4 bg-muted rounded-full overflow-hidden shadow-inner">
                            <motion.div
                              className={`h-full bg-gradient-to-r ${getProgressColor(currentPct)} rounded-full relative`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(currentPct, 100)}%` }}
                              transition={{ duration: 1.2, ease: 'easeOut' }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                            </motion.div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-lg text-foreground">
                              {currentPetition.currentSignatures.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground">
                              of {currentPetition.goalSignatures?.toLocaleString() || '∞'} signatures
                            </span>
                          </div>
                        </div>

                        {/* Sign Button */}
                        {currentUser ? (
                          currentPetition.userSigned ? (
                            <Button
                              disabled
                              className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20"
                            >
                              <CheckCircle2 className="w-6 h-6 mr-2" />
                              You Have Signed This Petition
                            </Button>
                          ) : (
                            <motion.div
                              className="relative"
                              animate={currentPetition.status === 'active' ? { scale: [1, 1.02, 1] } : {}}
                              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                            >
                              <Button
                                className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:via-amber-600 hover:to-orange-600 text-white font-bold shadow-xl shadow-orange-500/25 gap-2"
                                onClick={() => setSignDialogOpen(true)}
                                disabled={currentPetition.status !== 'active' || isUploadingVideo}
                              >
                                {isUploadingVideo ? (
                                  <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                  <>
                                    <PenLine className="w-6 h-6" />
                                    Sign This Petition
                                  </>
                                )}
                              </Button>
                              {currentPetition.status === 'active' && (
                                <div className="absolute inset-0 rounded-lg ring-4 ring-orange-500/20 pointer-events-none animate-pulse" />
                              )}
                            </motion.div>
                          )
                        ) : (
                          <Button
                            className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold shadow-xl shadow-orange-500/25 gap-2"
                            onClick={() => onNavigate('login')}
                          >
                            Sign In to Sign This Petition
                          </Button>
                        )}
                      </div>

                      {/* Status Timeline */}
                      <div className="mb-5 p-4 rounded-xl bg-muted/50 border border-border/40">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-muted-foreground" />
                          Petition Status
                        </h4>
                        <StatusTimeline petition={currentPetition} />
                      </div>

                      {/* Response Section */}
                      {currentPetition.responseText && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30"
                        >
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
                            <Handshake className="w-4 h-4" />
                            Response from Target
                          </h4>
                          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{currentPetition.responseText}</p>
                        </motion.div>
                      )}

                      {/* Creator Controls */}
                      {currentUser && currentUser.id === currentPetition.creatorId && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mb-5 p-4 rounded-xl bg-muted/40 border border-border/40"
                        >
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Award className="w-4 h-4 text-orange-500" />
                            Creator Controls
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {currentPetition.status === 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/50"
                                onClick={() => handleDeliver(currentPetition.id)}
                              >
                                <Send className="w-4 h-4" />
                                Mark as Delivered
                              </Button>
                            )}
                            {(currentPetition.status === 'delivered' || currentPetition.status === 'responded') && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/50"
                                  onClick={() => setResponseDialogOpen(true)}
                                >
                                  <MessageSquare className="w-4 h-4" />
                                  {currentPetition.responseText ? 'Update Response' : 'Add Response'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                                  onClick={() => handleResolve(currentPetition.id)}
                                >
                                  <CircleCheck className="w-4 h-4" />
                                  Mark as Resolved
                                </Button>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}

                      <Separator className="mb-5" />

                      {/* Signatures List */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5 text-orange-500" />
                          Latest Signatures
                          <Badge variant="secondary" className="text-xs">
                            {currentPetition.currentSignatures}
                          </Badge>
                        </h3>

                        {!currentPetition.signatures || currentPetition.signatures.length === 0 ? (
                          <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border/60">
                            <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                              No signatures yet. Be the first to sign!
                            </p>
                          </div>
                        ) : (
                          <ScrollArea className="max-h-96">
                            <div className="space-y-3 pr-4">
                              {currentPetition.signatures.map((sig: PetitionSignature, idx: number) => (
                                <motion.div
                                  key={sig.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/30"
                                >
                                  <Avatar className="w-9 h-9 mt-0.5 shrink-0">
                                    {sig.user?.avatarUrl && <AvatarImage src={sig.user.avatarUrl} />}
                                    <AvatarFallback className="text-xs bg-orange-100 text-orange-600">
                                      {(sig.user?.displayName || sig.user?.username || 'U')
                                        .charAt(0)
                                        .toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium truncate">
                                        {sig.user?.displayName || sig.user?.username || 'Anonymous'}
                                      </span>
                                      <span className="text-xs text-muted-foreground shrink-0">
                                        {formatRelativeDate(sig.createdAt)}
                                      </span>
                                    </div>
                                    {sig.comment && (
                                      <p className="text-sm text-muted-foreground mt-1 break-words">
                                        {sig.comment}
                                      </p>
                                    )}
                                    {sig.videoUrl && (
                                      <div className="mt-2">
                                        <div className="relative rounded-lg overflow-hidden border w-32 h-20">
                                          <video
                                            src={sig.videoUrl}
                                            className="w-full h-full object-cover"
                                            preload="metadata"
                                          />
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                            <Play className="w-5 h-5 text-white" />
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sign & Response Dialogs */}
                  {currentUser && (
                    <SignPetitionDialog
                      petition={currentPetition}
                      open={signDialogOpen}
                      onOpenChange={setSignDialogOpen}
                      onSign={handleSignPetition}
                    />
                  )}
                  <ResponseDialog
                    petitionId={currentPetition.id}
                    open={responseDialogOpen}
                    onOpenChange={setResponseDialogOpen}
                    onSubmit={handleRespond}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="no-selection"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <Eye className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Petition Selected</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Browse active petitions and click one to view details.
                  </p>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => handleTabChange('browse')}
                  >
                    <Megaphone className="w-4 h-4" />
                    Browse Petitions
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ═══════════════════ CREATE TAB ═══════════════════ */}
          <TabsContent value="create">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {!currentUser ? (
                <Card className="max-w-lg mx-auto">
                  <CardContent className="p-8 text-center">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-md shadow-orange-500/20">
                      <PenLine className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Sign In Required</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Please sign in to create a petition and make your voice heard.
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
                <Card className="max-w-2xl mx-auto border-2 border-orange-200/60 dark:border-orange-800/30">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Create New Petition</CardTitle>
                        <CardDescription>Rally support and drive meaningful change</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Title */}
                    <div className="space-y-2">
                      <Label htmlFor="petition-title" className="text-sm font-medium">
                        Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="petition-title"
                        placeholder="What are you petitioning for?"
                        value={createTitle}
                        onChange={(e) => setCreateTitle(e.target.value)}
                        className="h-11"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="petition-desc" className="text-sm font-medium">
                        Description <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="petition-desc"
                        placeholder="Explain your cause in detail. Why is this important? What change are you seeking?"
                        value={createDescription}
                        onChange={(e) => setCreateDescription(e.target.value)}
                        className="min-h-[120px] resize-none"
                      />
                    </div>

                    {/* Video Upload */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        <Video className="w-4 h-4 inline mr-1.5" />
                        Lead Video Clip (optional)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Upload a video to introduce your petition and make it more compelling.
                      </p>
                      <input
                        ref={createVideoInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleCreateVideoSelect}
                      />
                      {createVideoPreview ? (
                        <div className="relative rounded-lg overflow-hidden border">
                          <video src={createVideoPreview} className="w-full max-h-48 object-cover" controls />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 w-7 h-7"
                            onClick={removeCreateVideo}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors"
                          onClick={() => createVideoInputRef.current?.click()}
                        >
                          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            MP4, MOV, or WebM up to 50MB
                          </p>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Target Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="target-name" className="text-sm font-medium">
                          <Target className="w-4 h-4 inline mr-1.5" />
                          Target Name
                        </Label>
                        <Input
                          id="target-name"
                          placeholder="Who is this directed to?"
                          value={createTargetName}
                          onChange={(e) => setCreateTargetName(e.target.value)}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="target-title" className="text-sm font-medium">
                          Target Title/Role
                        </Label>
                        <Input
                          id="target-title"
                          placeholder="Their role or position"
                          value={createTargetTitle}
                          onChange={(e) => setCreateTargetTitle(e.target.value)}
                          className="h-11"
                        />
                      </div>
                    </div>

                    {/* Goal & Closing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="goal-signatures" className="text-sm font-medium">
                          <Users className="w-4 h-4 inline mr-1.5" />
                          Goal Signatures
                        </Label>
                        <Input
                          id="goal-signatures"
                          type="number"
                          placeholder="e.g. 1000"
                          min="1"
                          value={createGoalSignatures}
                          onChange={(e) => setCreateGoalSignatures(e.target.value)}
                          className="h-11"
                        />
                        <p className="text-xs text-muted-foreground">Leave empty for unlimited</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="closes-at" className="text-sm font-medium">
                          <Clock className="w-4 h-4 inline mr-1.5" />
                          Closing Date
                        </Label>
                        <Input
                          id="closes-at"
                          type="datetime-local"
                          value={createClosesAt}
                          onChange={(e) => setCreateClosesAt(e.target.value)}
                          className="h-11"
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <Label htmlFor="tags" className="text-sm font-medium">
                        Tags
                      </Label>
                      <Input
                        id="tags"
                        placeholder="e.g. environment, community, policy (comma separated)"
                        value={createTags}
                        onChange={(e) => setCreateTags(e.target.value)}
                        className="h-11"
                      />
                    </div>

                    {/* Submit */}
                    <div className="pt-2">
                      <Button
                        className="w-full h-12 text-base bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold shadow-lg shadow-orange-500/20 gap-2"
                        onClick={handleCreatePetition}
                        disabled={isCreating || !createTitle.trim() || !createDescription.trim()}
                      >
                        {isCreating ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Publish Petition
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>

          {/* ═══════════════════ MY PETITIONS TAB ═══════════════════ */}
          <TabsContent value="mine">
            <AnimatePresence mode="wait">
              {!currentUser ? (
                <motion.div
                  key="auth-required"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-20"
                >
                  <UserCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sign in to manage your petitions.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                    onClick={() => onNavigate('login')}
                  >
                    Sign In
                  </Button>
                </motion.div>
              ) : myPetitions.length === 0 ? (
                <motion.div
                  key="no-petitions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-20"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center mx-auto mb-4">
                    <FileSignature className="w-8 h-8 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Petitions Created</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                    You haven&apos;t created any petitions yet. Start one now and rally support for your cause.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 gap-2"
                    onClick={() => setActiveTab('create')}
                  >
                    <Plus className="w-4 h-4" />
                    Create Your First Petition
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="my-list"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <UserCircle className="w-5 h-5 text-orange-500" />
                      Your Petitions
                    </h2>
                    <Badge variant="secondary">{myPetitions.length}</Badge>
                  </div>

                  {myPetitions.map((petition) => {
                    const pct = petition.goalSignatures
                      ? Math.min(Math.round((petition.currentSignatures / petition.goalSignatures) * 100), 100)
                      : petition.currentSignatures > 0
                        ? Math.min(petition.currentSignatures * 10, 100)
                        : 0;
                    const statusBadge = getStatusBadge(petition.status);

                    return (
                      <motion.div
                        key={petition.id}
                        variants={staggerItem}
                        whileHover={{ x: 4 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <Card className="border-border/60 overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                              {/* Thumbnail */}
                              <div
                                className="w-full sm:w-28 h-20 rounded-lg overflow-hidden cursor-pointer shrink-0"
                                onClick={() => handleSelectPetition(petition)}
                              >
                                {petition.thumbnailUrl ? (
                                  <img
                                    src={petition.thumbnailUrl}
                                    alt={petition.title}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className={`w-full h-full bg-gradient-to-br ${getProgressColor(pct)} opacity-30 flex items-center justify-center`}>
                                    <FileSignature className="w-6 h-6 text-orange-400" />
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleSelectPetition(petition)}>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={`border text-[11px] ${statusBadge.className}`}>
                                    {statusBadge.label}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatRelativeDate(petition.createdAt)}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-sm leading-snug mb-1 truncate">
                                  {petition.title}
                                </h3>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />
                                    {petition.currentSignatures}{petition.goalSignatures ? ` / ${petition.goalSignatures}` : ''} signatures
                                  </span>
                                  {petition.targetName && (
                                    <span className="flex items-center gap-1 truncate">
                                      <Target className="w-3.5 h-3.5" />
                                      {petition.targetName}
                                    </span>
                                  )}
                                </div>
                                {/* Mini Progress */}
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                                  <motion.div
                                    className={`h-full bg-gradient-to-r ${getProgressColor(pct)} rounded-full`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(pct, 100)}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                  />
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex sm:flex-col gap-2 shrink-0">
                                {petition.status === 'active' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/50 gap-1"
                                        onClick={() => handleDeliver(petition.id)}
                                      >
                                        <Send className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Deliver</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Mark as delivered</TooltipContent>
                                  </Tooltip>
                                )}
                                {(petition.status === 'delivered' || petition.status === 'responded') && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/50 gap-1"
                                          onClick={() => {
                                            if (currentPetition?.id !== petition.id) {
                                              fetchPetition(petition.id).then(() => setResponseDialogOpen(true));
                                            } else {
                                              setResponseDialogOpen(true);
                                            }
                                          }}
                                        >
                                          <MessageSquare className="w-3.5 h-3.5" />
                                          <span className="hidden sm:inline">Respond</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Add/Update response</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50 gap-1"
                                          onClick={() => handleResolve(petition.id)}
                                        >
                                          <CircleCheck className="w-3.5 h-3.5" />
                                          <span className="hidden sm:inline">Resolve</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Mark as resolved</TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="gap-1"
                                      onClick={() => handleShare(petition)}
                                    >
                                      <Share2 className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Share</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Share petition</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <motion.div variants={staggerItem} className="text-center py-6 mt-4">
          <p className="text-xs text-muted-foreground">
            FeedMeForward Petitions &mdash; Amplify Your Voice, Drive Change
          </p>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  );
}

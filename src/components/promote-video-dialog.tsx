'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import {
  Megaphone,
  Loader2,
  Wallet,
  Sparkles,
  Video,
  Clock,
  Users,
  Globe,
  Check,
  AlertTriangle,
  Zap,
} from 'lucide-react';

interface PromoteVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorVideos?: any[];
  onSuccess?: () => void;
}

const BUDGET_PRESETS = [10, 25, 50, 100, 250];
const DURATION_OPTIONS = [
  { days: 3, label: '3 Days' },
  { days: 7, label: '7 Days' },
  { days: 14, label: '14 Days' },
  { days: 30, label: '30 Days' },
];

export function PromoteVideoDialog({
  open,
  onOpenChange,
  creatorVideos: propVideos,
  onSuccess,
}: PromoteVideoDialogProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [videos, setVideos] = useState<any[]>(propVideos || []);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [budget, setBudget] = useState<number | null>(null);
  const [customBudget, setCustomBudget] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [targetingCriteria, setTargetingCriteria] = useState<Record<string, string>>({});
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    if (open && currentUser && (!propVideos || propVideos.length === 0)) {
      setLoading(true);
      fetch(`/api/videos?creatorId=${currentUser.id}&limit=50`, {
        headers: { 'X-User-Id': currentUser.id },
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setVideos(json.data || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else if (propVideos) {
      setVideos(propVideos);
    }
  }, [open, currentUser, propVideos]);

  const resetState = () => {
    setStep(1);
    setSelectedVideoId('');
    setBudget(null);
    setCustomBudget('');
    setDurationDays(7);
    setTargetingCriteria({});
    setIsLaunching(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const effectiveBudget = budget ?? parseFloat(customBudget);
  const dailyBudget = durationDays > 0 ? (effectiveBudget || 0) / durationDays : 0;
  const estimatedReach = Math.round((effectiveBudget || 0) * 120);
  const walletBalance = currentUser?.walletBalance ?? 0;

  const selectedVideo = videos.find((v) => v.id === selectedVideoId);

  const handleLaunch = async () => {
    if (!selectedVideoId || !effectiveBudget || effectiveBudget <= 0) return;
    setIsLaunching(true);
    try {
      const body: Record<string, unknown> = {
        videoId: selectedVideoId,
        budget: effectiveBudget,
        durationDays,
      };
      if (Object.keys(targetingCriteria).length > 0) {
        body.targetingCriteria = targetingCriteria;
      }
      const res = await fetch('/api/creator/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id ?? '',
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: 'Promotion launched! 🚀',
          description: `Your video "${selectedVideo?.title}" is now being promoted`,
        });
        useAuthStore.getState().refreshUser();
        onSuccess?.();
        handleOpenChange(false);
      } else {
        toast({
          title: 'Promotion failed',
          description: json.error || 'Could not launch promotion',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Network error',
        description: 'Failed to launch promotion',
        variant: 'destructive',
      });
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-orange-500" />
            Promote Your Video
          </DialogTitle>
          <DialogDescription>
            Boost your video reach with a paid promotion campaign
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step >= s
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-6 h-0.5 ${step > s ? 'bg-orange-400' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Video */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Select a video to promote</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Choose from your published videos
              </p>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-8">
                <Video className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No videos found. Create a video first to promote it.
                </p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {videos.map((video) => (
                  <button
                    key={video.id}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      selectedVideoId === video.id
                        ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30'
                        : 'border-border hover:border-orange-200 dark:hover:border-orange-800/50'
                    }`}
                    onClick={() => setSelectedVideoId(video.id)}
                  >
                    <div className="w-16 h-10 rounded bg-gradient-to-br from-orange-200 to-amber-200 dark:from-orange-900/40 dark:to-amber-900/40 shrink-0 flex items-center justify-center">
                      <Video className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{video.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {video.viewCount || 0} views · {(video._count?.likes || 0)} likes
                      </p>
                    </div>
                    {selectedVideoId === video.id && (
                      <Check className="w-4 h-4 text-orange-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedVideoId}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Budget */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Set your budget</Label>
              <p className="text-xs text-muted-foreground mt-1">
                How much would you like to spend on this promotion?
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                ${walletBalance.toFixed(2)}
              </span>
              {(effectiveBudget || 0) > walletBalance && (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Insufficient
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {BUDGET_PRESETS.map((preset) => (
                <button
                  key={preset}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    budget === preset
                      ? 'border-orange-400 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                      : 'border-border hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30'
                  }`}
                  onClick={() => {
                    setBudget(preset);
                    setCustomBudget('');
                  }}
                >
                  ${preset}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-budget" className="text-xs text-muted-foreground">
                Or enter custom amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="custom-budget"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Enter custom amount"
                  value={customBudget}
                  onChange={(e) => {
                    setCustomBudget(e.target.value);
                    setBudget(null);
                  }}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!effectiveBudget || effectiveBudget <= 0}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Duration */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Campaign duration</Label>
              <p className="text-xs text-muted-foreground mt-1">
                How long should the promotion run?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  className={`flex flex-col items-center gap-1 p-4 rounded-lg border transition-all ${
                    durationDays === opt.days
                      ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30'
                      : 'border-border hover:border-orange-200 dark:hover:border-orange-800/50'
                  }`}
                  onClick={() => setDurationDays(opt.days)}
                >
                  <Clock className={`w-5 h-5 ${durationDays === opt.days ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">
                    ~${dailyBudget.toFixed(2)}/day
                  </span>
                </button>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Targeting (optional) */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Targeting criteria (optional)</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Focus your promotion on a specific audience
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Location (e.g. Lagos, Nigeria)"
                  value={targetingCriteria.location || ''}
                  onChange={(e) =>
                    setTargetingCriteria((prev) => ({ ...prev, location: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Age range (e.g. 18-34)"
                  value={targetingCriteria.ageRange || ''}
                  onChange={(e) =>
                    setTargetingCriteria((prev) => ({ ...prev, ageRange: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Interests (e.g. tech, gaming)"
                  value={targetingCriteria.interests || ''}
                  onChange={(e) =>
                    setTargetingCriteria((prev) => ({ ...prev, interests: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border border-orange-200 dark:border-orange-800/40 p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                Campaign Summary
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Video</span>
                  <span className="font-medium truncate max-w-[200px]">{selectedVideo?.title || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-medium">${(effectiveBudget || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{durationDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily budget</span>
                  <span className="font-medium">${dailyBudget.toFixed(2)}/day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. reach</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    ~{estimatedReach.toLocaleString()} views
                  </span>
                </div>
              </div>
              {(effectiveBudget || 0) > walletBalance && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Insufficient balance. Deposit ${((effectiveBudget || 0) - walletBalance).toFixed(2)} more to your wallet.</span>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                onClick={handleLaunch}
                disabled={isLaunching || (effectiveBudget || 0) > walletBalance}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white gap-2"
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Launching...
                  </>
                ) : (
                  <>
                    <Megaphone className="w-4 h-4" />
                    Launch Promotion
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

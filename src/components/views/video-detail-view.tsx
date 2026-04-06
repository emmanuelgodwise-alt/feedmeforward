'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Heart,
  Bookmark,
  MessageCircle,
  Share2,
  Play,
  Eye,
  Clock,
  Tag,
  Users,
  Video,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  DollarSign,
  Star,
  TrendingUp,
  Flame,
  Loader2,
  Download,
  Type,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Wallet,
  Mic,
} from 'lucide-react';
import { TipDialog } from '@/components/tip-dialog';
import { TranscribeDialog } from '@/components/transcribe-dialog';
import { ShareDialog } from '@/components/share-dialog';
import { VideoActions } from '@/components/video-actions';
import { QuickNav } from '@/components/quick-nav';
import { HashtagTag } from '@/components/hashtag-tag';
import { useVideoStore } from '@/stores/video-store';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { PollCard } from '@/components/poll-card';
import { PollAnalytics } from '@/components/poll-analytics';
import { CommentSection } from '@/components/comment-section';
import { timeAgo, getGradient } from '@/components/video-card';
import type { Video, VideoDetail } from '@/types';
import type { View } from '@/app/page';
import { STATUS_COLORS } from '@/types';
import { useWalletStore } from '@/stores/wallet-store';

interface VideoDetailViewProps {
  onNavigate: (view: View) => void;
  videoId: string;
  setParentVideoId?: (id: string) => void;
  setProfileUserId?: (id: string) => void;
}

export function VideoDetailView({ onNavigate, videoId, setParentVideoId, setProfileUserId }: VideoDetailViewProps) {
  const { currentVideo, isLoading, fetchVideo, likeVideo, unlikeVideo, clearCurrentVideo } = useVideoStore();
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [responses, setResponses] = useState<Video[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [copied, setCopied] = useState(false);
  const [embedError, setEmbedError] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [claimingReward, setClaimingReward] = useState<string | null>(null);
  const [fundingPoll, setFundingPoll] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [earningRevenue, setEarningRevenue] = useState(false);
  const [videoVersion, setVideoVersion] = useState(0);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [showAllResponses, setShowAllResponses] = useState(false);
  const [transcribeOpen, setTranscribeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [analyticsPollId, setAnalyticsPollId] = useState<string | null>(null);
  const [isTrending, setIsTrending] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { updateWalletBalance } = useAuthStore();
  const pollRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchVideo(videoId);
    setLoadingResponses(true);
    fetch(`/api/videos/${videoId}/responses`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setResponses(json.data);
      })
      .catch(() => {})
      .finally(() => setLoadingResponses(false));

    // Check if video is trending
    fetch(`/api/videos/trending?period=24h&limit=50`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setIsTrending(json.data.some((v: { id: string }) => v.id === videoId));
        }
      })
      .catch(() => {});

    // Check save status
    if (currentUser) {
      fetch(`/api/videos/${videoId}/save-status`, {
        headers: { 'X-User-Id': currentUser.id },
      })
        .then((res) => res.json())
        .then((json) => { if (json.success) setIsSaved(json.saved); })
        .catch(() => {});
    }

    return () => {
      clearCurrentVideo();
    };
  }, [videoId, videoVersion, fetchVideo, clearCurrentVideo]);

  // ─── Auto-refresh poll results every 15s for active polls ─────────
  useEffect(() => {
    if (!currentVideo?.polls?.some((p) => p.status === 'active')) {
      if (pollRefreshRef.current) {
        clearInterval(pollRefreshRef.current);
        pollRefreshRef.current = null;
      }
      return;
    }

    if (pollRefreshRef.current) {
      clearInterval(pollRefreshRef.current);
    }

    pollRefreshRef.current = setInterval(() => {
      fetchVideo(videoId);
    }, 15000);

    return () => {
      if (pollRefreshRef.current) {
        clearInterval(pollRefreshRef.current);
        pollRefreshRef.current = null;
      }
    };
  }, [currentVideo?.polls, videoId, fetchVideo]);

  const triggerScoreRecalc = (userId: string) => {
    fetch('/api/scores/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }).then((r) => r.json()).then((json) => {
      if (json.scores?.[0]) {
        useAuthStore.getState().updateUserScore(json.scores[0].score, json.scores[0].score >= 500);
      }
    }).catch(() => {});
  };

  const handleLike = () => {
    if (!currentUser) {
      toast({ title: 'Sign in required', description: 'Please sign in to like videos', variant: 'destructive' });
      return;
    }
    if (currentVideo?.isLiked) {
      unlikeVideo(videoId);
    } else {
      likeVideo(videoId);
    }
    // Fire-and-forget score recalculation
    triggerScoreRecalc(currentUser.id);
  };

  const handleClaimReward = async (pollId: string) => {
    if (!currentUser) return;
    setClaimingReward(pollId);
    try {
      const res = await fetch(`/api/polls/${pollId}/claim`, {
        method: 'POST',
        headers: { 'X-User-Id': currentUser.id },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({ title: 'Claim failed', description: data.error || 'Could not claim reward', variant: 'destructive' });
        return;
      }
      updateWalletBalance(data.newBalance);
      toast({ title: 'Reward claimed! 🎉', description: `$${data.reward.amount.toFixed(2)} added to your wallet.` });
      useWalletStore.getState().fetchSummary(currentUser.id);
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setClaimingReward(null);
    }
  };

  const handleFundPoll = (pollId: string) => {
    setFundingPoll(pollId);
    setFundAmount('');
    setFundDialogOpen(true);
  };

  const handleFundSubmit = async () => {
    if (!currentUser || !fundingPoll) return;
    const num = parseFloat(fundAmount);
    if (!num || num <= 0) return;
    setFundingPoll(null);
    try {
      const res = await fetch(`/api/polls/${fundingPoll}/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id },
        body: JSON.stringify({ amount: num }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({ title: 'Funding failed', description: data.error || 'Could not fund poll', variant: 'destructive' });
        return;
      }
      updateWalletBalance(data.newBalance);
      toast({ title: 'Poll funded! 💰', description: `$${num.toFixed(2)} added to reward pool.` });
      fetchVideo(videoId);
      useWalletStore.getState().fetchSummary(currentUser.id);
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setFundDialogOpen(false);
    }
  };

  const handleEarnRevenue = async () => {
    if (!currentUser) return;
    setEarningRevenue(true);
    try {
      const res = await fetch('/api/wallet/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser.id },
        body: JSON.stringify({ videoId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({ title: 'Revenue failed', description: data.error || 'Could not calculate revenue', variant: 'destructive' });
        return;
      }
      if (data.revenue > 0) {
        updateWalletBalance(data.newBalance);
        toast({ title: 'Ad Revenue Earned! 💰', description: `$${data.revenue.toFixed(2)} added to your wallet.` });
        useWalletStore.getState().fetchSummary(currentUser.id);
      } else {
        toast({ title: 'No revenue yet', description: 'Not enough engagement for ad revenue. Keep growing!' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setEarningRevenue(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast({ title: 'Link copied!', description: 'Video link has been copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleRespond = () => {
    if (!currentUser) {
      toast({ title: 'Sign in required', description: 'Please sign in to respond', variant: 'destructive' });
      return;
    }
    if (setParentVideoId) setParentVideoId(videoId);
    onNavigate('create-response');
  };

  const handleSave = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/videos/${videoId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const json = await res.json();
      if (json.success) {
        setIsSaved(json.saved);
        toast({
          title: json.saved ? 'Video saved!' : 'Video unsaved',
          description: json.saved ? 'Added to your saved videos' : 'Removed from saved videos',
        });
      }
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  const handleResponseClick = (responseId: string) => {
    window.dispatchEvent(new CustomEvent('navigate-video', { detail: { videoId: responseId } }));
  };

  const handleCreatorClick = () => {
    if (setProfileUserId) {
      setProfileUserId(video.creator.id);
      onNavigate('profile');
    }
  };

  const getEmbedUrl = (url: string): string | null => {
    try {
      const parsed = new URL(url);
      // YouTube
      if (parsed.hostname.includes('youtube.com') && parsed.searchParams.get('v')) {
        return `https://www.youtube.com/embed/${parsed.searchParams.get('v')}`;
      }
      if (parsed.hostname === 'youtu.be') {
        return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
      }
      // Vimeo
      if (parsed.hostname.includes('vimeo.com')) {
        return `https://player.vimeo.com/video/${parsed.pathname.split('/')[1]}`;
      }
      return null;
    } catch {
      return null;
    }
  };

  // ─── Loading state ───────────────────────────────────────────────
  if (isLoading && !currentVideo) {
    return (
      <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-32 mb-6" />
        <Skeleton className="aspect-video rounded-xl mb-6" />
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/3 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  // ─── Not found state ─────────────────────────────────────────────
  if (!currentVideo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Video not found</h2>
          <p className="text-muted-foreground mb-4">This video may have been removed or doesn&apos;t exist.</p>
          <Button variant="ghost" onClick={() => onNavigate('explore')} className="shrink-0">
            <span className="text-sm">Back to Explore</span>
          </Button>
        </div>
      </div>
    );
  }

  const video = currentVideo;
  const embedUrl = getEmbedUrl(video.videoUrl);
  const gradient = getGradient(video.id);
  const isCreator = currentUser?.id === video.creator.id;
  const displayedResponses = showAllResponses ? responses.slice(0, 12) : responses.slice(0, 8);

  return (
    <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
      {/* ─── Header ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-4"
      >
        <Button variant="ghost" onClick={() => onNavigate('explore')} className="shrink-0">
          <span className="text-sm">← Back to Video Polls</span>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs shrink-0">
              {video.type === 'lead' ? 'Lead Clip' : 'Response'}
            </Badge>
            <Badge className={`text-xs ${STATUS_COLORS[video.status] || ''}`}>
              {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
            </Badge>
            {video.isTextOnly && (
              <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700 dark:text-amber-300">
                <Type className="w-3 h-3" />
                Text Only
              </Badge>
            )}
          </div>
        </div>
      </motion.div>

      <QuickNav onNavigate={(v) => onNavigate(v as View)} activeView="video-detail" />

      {/* ─── LEAD CLIP — FULL WIDTH VIDEO PLAYER ─────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-4"
      >
        <div className="aspect-video rounded-xl overflow-hidden bg-black/5 dark:bg-black/20 relative">
          {embedUrl && !embedError ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              onError={() => setEmbedError(true)}
              title={video.title}
            />
          ) : video.videoUrl && !video.isTextOnly ? (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <a
                href={video.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 text-white hover:scale-105 transition-transform"
              >
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-10 h-10 text-white fill-white ml-1" />
                </div>
                <span className="text-sm font-medium flex items-center gap-1">
                  Watch on external site
                  <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            </div>
          ) : video.isTextOnly ? (
            <div className="w-full h-full bg-muted/50 dark:bg-muted/20 flex flex-col items-center justify-center p-4">
              <Type className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground/60">This Is A Text-Only Response</p>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
              <Play className="w-16 h-16 text-white/80" />
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── Download & Transcribe Buttons for local videos ───────── */}
      {video.videoUrl.startsWith('/uploads/') && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-2 flex items-center gap-2 flex-wrap"
        >
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => window.open(`/api/videos/download/${videoId}?userId=${currentUser?.id || ''}`, '_blank')}
          >
            <Download className="w-4 h-4" />
            Download Video
          </Button>
          {!video.isTextOnly && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300"
              onClick={() => setTranscribeOpen(true)}
            >
              <Mic className="w-4 h-4" />
              Transcribe to Text
            </Button>
          )}
        </motion.div>
      )}

      {/* ─── VIDEO INFO ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 space-y-4"
      >
        <div>
          <h1 className="text-2xl font-bold leading-tight">{video.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
            <button
              onClick={handleCreatorClick}
              className="font-medium text-foreground hover:text-orange-500 transition-colors flex items-center gap-1.5"
            >
              @{video.creator.username}
              {video.creator.isVerified && (
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
              )}
            </button>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {video.viewCount} views
            </span>
            {isTrending && (
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs gap-1 border-0">
                <Flame className="w-3 h-3" />
                Trending
              </Badge>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {timeAgo(video.createdAt)}
            </span>
          </div>
        </div>

        {video.description && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {video.description}
          </p>
        )}

        {/* Tags & Category */}
        {(video.tags && video.tags.length > 0) || video.category ? (
          <div className="flex flex-wrap gap-2">
            {video.category && (
              <Badge variant="secondary" className="gap-1">
                <Tag className="w-3 h-3" />
                {video.category}
              </Badge>
            )}
            {video.tags?.map((tag) => (
              <HashtagTag
                key={tag}
                tag={tag}
                size="sm"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('navigate-hashtag', { detail: { tag } }));
                }}
              />
            ))}
          </div>
        ) : null}

        {/* ─── Action Buttons ────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Row 1: Like, Comment, Share, Tip, Edit */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={video.isLiked ? 'default' : 'outline'}
              size="sm"
              className={`gap-2 ${
                video.isLiked
                  ? 'bg-rose-500 hover:bg-rose-600 text-white'
                  : 'hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 hover:border-rose-300'
              }`}
              onClick={handleLike}
            >
              <Heart className={`w-4 h-4 ${video.isLiked ? 'fill-white' : ''}`} />
              {video.likeCount}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-500 hover:border-orange-300"
              onClick={() => setCommentsExpanded(true)}
            >
              <MessageCircle className="w-4 h-4" />
              {video.commentCount}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            {/* Video Actions (edit/delete/report/share) */}
            <VideoActions
              videoId={videoId}
              creatorId={video.creator.id}
              title={video.title}
              currentUserId={currentUser?.id}
              onVideoUpdated={() => setVideoVersion((v) => v + 1)}
            />
            {/* Tip Creator button */}
            {currentUser && !isCreator && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 hover:bg-pink-50 dark:hover:bg-pink-950/30 hover:text-pink-500 hover:border-pink-300"
                onClick={() => setTipOpen(true)}
              >
                <DollarSign className="w-4 h-4" />
                <Heart className="w-3 h-3" />
                Tip
              </Button>
            )}
            {/* Save/Bookmark button */}
            {currentUser && (
              <Button
                variant={isSaved ? 'default' : 'outline'}
                size="sm"
                className={`gap-2 ${
                  isSaved
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-500 hover:border-blue-300'
                }`}
                onClick={handleSave}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </Button>
            )}
          </div>

          {/* Row 2: Respond buttons (only for lead type, only for authenticated) */}
          {video.type === 'lead' && currentUser && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                onClick={handleRespond}
              >
                <Video className="w-4 h-4" />
                Respond with Video Clip
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600 hover:border-amber-300"
                onClick={handleRespond}
              >
                <Type className="w-4 h-4" />
                Respond with Text Only
              </Button>
            </div>
          )}
          {video.type === 'lead' && !currentUser && (
            <p className="text-xs text-muted-foreground">
              <a onClick={() => onNavigate('login' as View)} className="cursor-pointer text-orange-500 hover:underline font-medium">Sign in</a> to respond to this clip
            </p>
          )}
        </div>
      </motion.div>

      {/* ─── RESPONSE CLIPS (PROMINENT) ───────────────────────────── */}
      {video.type === 'lead' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-8 space-y-4"
        >
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Video className="w-5 h-5 text-amber-500" />
            Response Clips ({video.responseCount})
          </h2>
          {loadingResponses ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-video rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : responses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Video className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">No responses yet. Be the first to respond!</p>
                <p className="text-xs text-muted-foreground mb-4">Share your opinion with a video clip or text response</p>
                {currentUser && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      className="gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                      onClick={handleRespond}
                    >
                      <Video className="w-3 h-3" />
                      Respond Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {displayedResponses.map((response) => {
                  const respGradient = getGradient(response.id);
                  const isTextResponse = response.isTextOnly === true;
                  return (
                    <motion.div
                      key={response.id}
                      whileHover={{ scale: 1.03 }}
                      className="cursor-pointer"
                      onClick={() => handleResponseClick(response.id)}
                    >
                      <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
                        {/* Thumbnail or Text-Only Box */}
                        {isTextResponse ? (
                          <div className="aspect-video bg-muted/50 dark:bg-muted/20 flex flex-col items-center justify-center p-3 border border-dashed border-muted-foreground/30">
                            <Type className="w-8 h-8 text-muted-foreground/50 mb-1.5" />
                            <p className="text-[10px] font-medium text-muted-foreground/70 text-center leading-tight">
                              This Is A Text-Only Response
                            </p>
                          </div>
                        ) : (
                          <div className={`aspect-video bg-gradient-to-br ${respGradient} flex items-center justify-center relative`}>
                            <Play className="w-8 h-8 text-white/80" />
                            <Badge className="absolute top-1 left-1 text-[10px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                              Response
                            </Badge>
                          </div>
                        )}
                        <CardContent className="p-2.5">
                          <p className="text-xs font-semibold line-clamp-1">{response.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            @{response.creator?.username}
                            <span className="mx-1">·</span>
                            {timeAgo(response.createdAt)}
                          </p>
                          {isTextResponse && response.description && (
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {response.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
              {/* Show all / See more */}
              {responses.length > 8 && !showAllResponses && (
                <div className="text-center">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-orange-500" onClick={() => setShowAllResponses(true)}>
                    See all {responses.length} responses
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </div>
              )}
              {showAllResponses && responses.length > 8 && (
                <div className="text-center">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={() => setShowAllResponses(false)}>
                    Show less
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* ─── POLLS ────────────────────────────────────────────────── */}
      {video.polls && video.polls.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 space-y-4"
        >
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            Polls ({video.polls.length})
          </h2>
          {video.polls.map((poll) => (
            <div key={poll.id} className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <PollCard poll={poll} />
                {/* Live badge for active polls */}
                {poll.status === 'active' && (
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-xs font-bold text-rose-500 bg-rose-100 dark:bg-rose-950/50 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
                  >
                    LIVE
                  </motion.span>
                )}
                {/* Analytics button */}
                <Button
                  size="sm"
                  variant="outline"
                  className={`gap-1.5 text-xs shrink-0 ${
                    analyticsPollId === poll.id
                      ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-300 text-orange-600 dark:text-orange-400'
                      : 'hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600 hover:border-orange-300'
                  }`}
                  onClick={() => setAnalyticsPollId(analyticsPollId === poll.id ? null : poll.id)}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Analytics
                </Button>
              </div>

              {/* ─── Analytics Panel (expandable) ─── */}
              {analyticsPollId === poll.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border bg-card p-4 mt-2">
                    <PollAnalytics pollId={poll.id} />
                  </div>
                </motion.div>
              )}
              {/* Claim reward for paid polls */}
              {poll.isPaid && poll.rewardPerResponse && poll.rewardPerResponse > 0 && poll.userVoted && currentUser && !isCreator && (
                <div className="flex items-center gap-2 px-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-300"
                    onClick={() => handleClaimReward(poll.id)}
                    disabled={claimingReward === poll.id}
                  >
                    {claimingReward === poll.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Star className="w-4 h-4" />
                    )}
                    Claim Reward (${poll.rewardPerResponse.toFixed(2)})
                  </Button>
                </div>
              )}
              {/* Fund poll for creator */}
              {poll.isPaid && currentUser && isCreator && (
                <div className="flex items-center gap-2 px-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                    onClick={() => handleFundPoll(poll.id)}
                  >
                    <DollarSign className="w-4 h-4" />
                    Fund This Poll
                  </Button>
                  {poll.totalRewardPool && poll.totalRewardPool > 0 && (
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      Pool: ${poll.totalRewardPool.toFixed(2)}
                    </Badge>
                  )}
                </div>
              )}
              {/* Reward display for paid polls */}
              {poll.isPaid && poll.rewardPerResponse && poll.rewardPerResponse > 0 && !poll.userVoted && currentUser && !isCreator && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 px-1">
                  <Star className="w-3 h-3" />
                  Earn ${poll.rewardPerResponse.toFixed(2)} for your response
                </p>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* ─── COMMENTS (SECONDARY, COLLAPSIBLE) ────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-8"
      >
        {!commentsExpanded ? (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCommentsExpanded(true)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-lg font-semibold">
                Text Comments ({video.commentCount})
              </span>
              <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-orange-500" />
                Text Comments ({video.commentCount})
              </h2>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setCommentsExpanded(false)}>
                <ChevronUp className="w-3 h-3 mr-1" />
                Collapse
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2 flex items-center gap-1">
              <Video className="w-3 h-3" />
              Prefer video responses over text for stronger impact
            </p>
            <CommentSection videoId={videoId} />
          </div>
        )}
      </motion.div>

      {/* ─── FOOTER INFO BAR ──────────────────────────────────────── */}
      <Separator className="my-8" />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Creator card (small) */}
              <button
                onClick={handleCreatorClick}
                className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors shrink-0"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {video.creator.username.charAt(0).toUpperCase()}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold flex items-center gap-1.5 hover:text-orange-500 transition-colors truncate">
                    {video.creator.username}
                    {video.creator.isVerified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">Creator</p>
                </div>
              </button>

              {/* Stats row */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground sm:flex-1 sm:justify-center flex-wrap">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {video.viewCount} views
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5" />
                  {video.likeCount} likes
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {video.commentCount} comments
                </span>
                {video.type === 'lead' && (
                  <span className="flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" />
                    {video.responseCount} responses
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {currentUser && isCreator && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                    onClick={handleEarnRevenue}
                    disabled={earningRevenue}
                  >
                    {earningRevenue ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
                    Earn Revenue
                  </Button>
                )}
                {currentUser && !isCreator && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs hover:bg-pink-50 dark:hover:bg-pink-950/30 hover:text-pink-500 hover:border-pink-300"
                    onClick={() => setTipOpen(true)}
                  >
                    <DollarSign className="w-3 h-3" />
                    Tip
                  </Button>
                )}
              </div>
            </div>

            {/* Poll Activity Summary */}
            {video.polls && video.polls.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Poll Activity</span>
                </div>
                <div className="space-y-2">
                  {video.polls.map((poll) => (
                    <div key={poll.id} className="space-y-1">
                      <p className="text-xs text-muted-foreground truncate">{poll.question}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all duration-500"
                            style={{
                              width: poll.responseCount > 0
                                ? `${Math.min(100, (poll.responseCount / (poll.responseCount + 50)) * 100)}%`
                                : '0%',
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-medium shrink-0 text-muted-foreground">{poll.responseCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── DIALOGS ──────────────────────────────────────────────── */}

      {/* Transcribe Dialog */}
      <TranscribeDialog
        open={transcribeOpen}
        onOpenChange={setTranscribeOpen}
        videoId={videoId}
        videoTitle={video.title}
      />

      {/* Share Dialog */}
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        videoId={videoId}
        videoTitle={video.title}
        videoUrl={video.videoUrl}
        isLocalUpload={video.videoUrl.startsWith('/uploads/')}
      />

      {/* Tip Dialog */}
      {currentUser && (
        <TipDialog
          recipientId={video.creator.id}
          recipientUsername={video.creator.username}
          videoId={videoId}
          open={tipOpen}
          onOpenChange={setTipOpen}
          onSuccess={() => {
            if (currentUser) useWalletStore.getState().fetchSummary(currentUser.id);
          }}
        />
      )}

      {/* Fund Poll Dialog */}
      <Dialog open={fundDialogOpen} onOpenChange={(open) => {
        if (!open) { setFundingPoll(null); setFundAmount(''); }
        setFundDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Fund Poll
            </DialogTitle>
            <DialogDescription>Add funds to the poll reward pool</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fund Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm px-3 py-2 rounded-md bg-muted/50">
              <span className="text-muted-foreground">Your Balance</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400">${(currentUser?.walletBalance ?? 0).toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFundDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleFundSubmit}
              disabled={!parseFloat(fundAmount) || parseFloat(fundAmount) <= 0}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Fund Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

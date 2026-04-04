'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Play,
  Eye,
  Clock,
  Tag,
  Users,
  Video,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { useVideoStore } from '@/stores/video-store';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { PollCard } from '@/components/poll-card';
import { CommentSection } from '@/components/comment-section';
import { timeAgo, getGradient } from '@/components/video-card';
import type { VideoDetail, Video } from '@/types';
import type { View } from '@/app/page';
import { STATUS_COLORS } from '@/types';

interface VideoDetailViewProps {
  onNavigate: (view: View) => void;
  videoId: string;
  setParentVideoId?: (id: string) => void;
}

export function VideoDetailView({ onNavigate, videoId, setParentVideoId }: VideoDetailViewProps) {
  const { currentVideo, isLoading, fetchVideo, likeVideo, unlikeVideo, clearCurrentVideo } = useVideoStore();
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [responses, setResponses] = useState<Video[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [copied, setCopied] = useState(false);
  const [embedError, setEmbedError] = useState(false);

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

    return () => {
      clearCurrentVideo();
    };
  }, [videoId, fetchVideo, clearCurrentVideo]);

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

  const handleResponseClick = (responseId: string) => {
    onNavigate('video-detail');
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

  if (!currentVideo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Video not found</h2>
          <p className="text-muted-foreground mb-4">This video may have been removed or doesn&apos;t exist.</p>
          <Button onClick={() => onNavigate('explore')}>Back to Explore</Button>
        </div>
      </div>
    );
  }

  const video = currentVideo;
  const embedUrl = getEmbedUrl(video.videoUrl);
  const gradient = getGradient(video.id);

  return (
    <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <Button variant="ghost" size="icon" onClick={() => onNavigate('explore')} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs shrink-0">
              {video.type === 'lead' ? 'Lead Clip' : 'Response'}
            </Badge>
            <Badge className={`text-xs ${STATUS_COLORS[video.status] || ''}`}>
              {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
            </Badge>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
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
              ) : (
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
              )}
            </div>
          </motion.div>

          {/* Video Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div>
              <h1 className="text-2xl font-bold leading-tight">{video.title}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">@{video.creator.username}</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {video.viewCount} views
                </span>
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
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
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
              >
                <MessageCircle className="w-4 h-4" />
                {video.commentCount}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleShare}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Share'}
              </Button>
              {video.type === 'lead' && (
                <Button
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white ml-auto"
                  onClick={handleRespond}
                >
                  <Video className="w-4 h-4" />
                  Respond with Clip
                </Button>
              )}
            </div>

            <Separator />
          </motion.div>

          {/* Polls */}
          {video.polls && video.polls.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                Polls ({video.polls.length})
              </h2>
              {video.polls.map((poll) => (
                <PollCard key={poll.id} poll={poll} />
              ))}
            </motion.div>
          )}

          {/* Response Clips (only for lead type) */}
          {video.type === 'lead' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Video className="w-5 h-5 text-amber-500" />
                Response Clips ({video.responseCount})
              </h2>
              {loadingResponses ? (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="shrink-0 w-48 space-y-2">
                      <Skeleton className="aspect-video rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : responses.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No responses yet. Be the first to respond!</p>
                    <Button
                      size="sm"
                      className="mt-3 gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                      onClick={handleRespond}
                    >
                      <Video className="w-3 h-3" />
                      Respond Now
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {responses.slice(0, 10).map((response) => {
                    const respGradient = getGradient(response.id);
                    return (
                      <motion.div
                        key={response.id}
                        whileHover={{ scale: 1.03 }}
                        className="shrink-0 w-48 cursor-pointer"
                        onClick={() => handleResponseClick(response.id)}
                      >
                        <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
                          <div className={`aspect-video bg-gradient-to-br ${respGradient} flex items-center justify-center relative`}>
                            <Play className="w-8 h-8 text-white/80" />
                            <Badge className="absolute top-1 left-1 text-[10px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                              Response
                            </Badge>
                          </div>
                          <CardContent className="p-2">
                            <p className="text-xs font-semibold line-clamp-1">{response.title}</p>
                            <p className="text-[10px] text-muted-foreground">@{response.creator?.username}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                  {responses.length > 10 && (
                    <div className="shrink-0 w-48 flex items-center justify-center">
                      <Button variant="ghost" className="text-xs gap-1 text-orange-500">
                        See all {responses.length}
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          <Separator />

          {/* Comments */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-orange-500" />
              Comments ({video.commentCount})
            </h2>
            <CommentSection videoId={videoId} />
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Creator Card */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto mb-3 text-white text-xl font-bold">
                  {video.creator.username.charAt(0).toUpperCase()}
                </div>
                <p className="font-semibold">@{video.creator.username}</p>
                <p className="text-xs text-muted-foreground mt-1">Creator</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Video Stats */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold">Stats</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Views
                    </span>
                    <span className="font-medium">{video.viewCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Heart className="w-4 h-4" /> Likes
                    </span>
                    <span className="font-medium">{video.likeCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" /> Comments
                    </span>
                    <span className="font-medium">{video.commentCount}</span>
                  </div>
                  {video.type === 'lead' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Video className="w-4 h-4" /> Responses
                      </span>
                      <span className="font-medium">{video.responseCount}</span>
                    </div>
                  )}
                  {(video.polls?.length || 0) > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Users className="w-4 h-4" /> Polls
                      </span>
                      <span className="font-medium">{video.polls?.length}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Poll Summary */}
          {video.polls && video.polls.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold">Poll Activity</h3>
                  {video.polls.map((poll) => (
                    <div key={poll.id} className="space-y-1">
                      <p className="text-xs text-muted-foreground truncate">{poll.question}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all duration-500"
                            style={{
                              width: poll.responseCount > 0
                                ? `${Math.min(100, (poll.responseCount / (poll.responseCount + 50)) * 100)}%`
                                : '0%',
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium shrink-0">{poll.responseCount}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

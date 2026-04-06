'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Eye,
  Clock,
  Share2,
  Radio,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { LiveChatPanel } from '@/components/live/live-chat-panel';
import { LivePollPanel } from '@/components/live/live-poll-panel';

interface SessionData {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  viewerCount: number;
  duration?: number | null;
  startedAt?: string | null;
  category?: string | null;
  creator: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    isVerified?: boolean;
  };
  chatEnabled: boolean;
  pollsEnabled: boolean;
}

interface LiveStreamViewProps {
  sessionId: string;
  onNavigate: (view: string) => void;
  onGoBroadcast: (sessionId: string) => void;
}

export function LiveStreamView({ sessionId, onNavigate, onGoBroadcast }: LiveStreamViewProps) {
  const { currentUser } = useAuthStore();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [latestChunkUrl, setLatestChunkUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [joined, setJoined] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinedRef = useRef(false);

  // Fetch session details
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/live/sessions/${sessionId}`);
        const data = await res.json();
        if (data.success) {
          setSession(data.session);
          setViewerCount(data.session.viewerCount);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  // Join as viewer
  useEffect(() => {
    if (!currentUser || joinedRef.current) return;
    joinedRef.current = true;
    setJoined(true);

    const join = async () => {
      try {
        await fetch(`/api/live/sessions/${sessionId}/join`, {
          headers: { 'X-User-Id': currentUser.id },
        });
      } catch {
        // ignore
      }
    };
    join();

    return () => {
      const leave = async () => {
        if (currentUser) {
          try {
            await fetch(`/api/live/sessions/${sessionId}/leave`, {
              headers: { 'X-User-Id': currentUser.id },
            });
          } catch {
            // ignore
          }
        }
      };
      leave();
    };
  }, [sessionId, currentUser]);

  // Poll for stream data
  useEffect(() => {
    if (!session || session.status !== 'live') return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/live/sessions/${sessionId}/stream`);
        const data = await res.json();
        if (data.success) {
          if (data.latestChunkUrl && data.latestChunkUrl !== latestChunkUrl) {
            setLatestChunkUrl(data.latestChunkUrl);
          }
          setViewerCount(data.viewerCount);
        }
      } catch {
        // ignore
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [sessionId, session, latestChunkUrl]);

  // Update video when new chunk arrives
  useEffect(() => {
    if (latestChunkUrl && videoRef.current) {
      const video = videoRef.current;
      const currentTime = video.currentTime;
      video.src = latestChunkUrl;
      video.currentTime = currentTime;
      video.play().catch(() => {
        // Autoplay may be blocked
      });
    }
  }, [latestChunkUrl]);

  // Elapsed time counter
  useEffect(() => {
    if (!session?.startedAt || session.status !== 'live') return;
    const start = new Date(session.startedAt).getTime();
    const timer = setInterval(() => {
      setElapsed(Math.round((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [session?.startedAt, session?.status]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-4xl px-4">
          <Skeleton className="aspect-video rounded-xl" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Session not found</p>
          <Button onClick={() => onNavigate('live')}>Back to Live</Button>
        </div>
      </div>
    );
  }

  const isCreator = currentUser?.id === session.creator.id;
  const isLive = session.status === 'live';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Back button */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('live')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Live
          </Button>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Video Player */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-video bg-black rounded-xl overflow-hidden mb-4"
            >
              {isLive ? (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    autoPlay
                    playsInline
                    muted
                  />
                  {!latestChunkUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3 animate-pulse">
                          <Radio className="w-8 h-8 text-red-500" />
                        </div>
                        <p className="text-white text-sm">Waiting for stream...</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                  <div className="text-center">
                    <Radio className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">
                      {session.status === 'upcoming' ? 'Stream hasn\'t started yet' : 'Stream has ended'}
                    </p>
                    {isCreator && session.status === 'upcoming' && (
                      <Button
                        className="mt-4 bg-gradient-to-r from-red-500 to-orange-500 text-white"
                        onClick={() => onGoBroadcast(sessionId)}
                      >
                        Start Streaming
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Live overlay */}
              {isLive && (
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <Badge className="bg-red-600 text-white border-0 gap-1.5 font-bold text-sm">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    LIVE
                  </Badge>
                  <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">
                    {formatTime(elapsed)}
                  </span>
                </div>
              )}

              {/* Viewer count overlay */}
              {isLive && (
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  <Eye className="w-3 h-3" />
                  <span>{viewerCount}</span>
                </div>
              )}
            </motion.div>

            {/* Stream Info */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h1 className="text-xl font-bold mb-2">{session.title}</h1>
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={session.creator.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-orange-400 to-amber-500 text-white">
                    {session.creator.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{session.creator.displayName || session.creator.username}</p>
                    {session.creator.isVerified && (
                      <span className="text-amber-500 text-xs">✓</span>
                    )}
                    {isCreator && (
                      <Badge variant="secondary" className="text-[10px]">Creator</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {isLive && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {viewerCount} watching
                      </span>
                    )}
                    {session.category && (
                      <Badge variant="secondary" className="text-[10px]">{session.category}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Share2 className="w-3 h-3" />
                    Share
                  </Button>
                </div>
              </div>

              {session.description && (
                <p className="text-sm text-muted-foreground mb-4">{session.description}</p>
              )}

              {/* Live Polls */}
              {session.pollsEnabled && isLive && (
                <div className="mb-4">
                  <LivePollPanel sessionId={sessionId} isCreator={isCreator} />
                </div>
              )}

              {/* Mobile Chat (below video on small screens) */}
              {session.chatEnabled && (
                <div className="lg:hidden">
                  <LiveChatPanel sessionId={sessionId} isCreator={isCreator} />
                </div>
              )}
            </motion.div>
          </div>

          {/* Desktop Chat Sidebar */}
          <div className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-4">
              {session.chatEnabled ? (
                <LiveChatPanel sessionId={sessionId} isCreator={isCreator} />
              ) : (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border p-4 text-center text-sm text-muted-foreground">
                  Chat is disabled for this session
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

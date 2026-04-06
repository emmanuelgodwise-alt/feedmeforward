'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Radio, RefreshCw, Plus, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { LiveSessionCard } from '@/components/live/live-session-card';
import { GoLiveDialog } from '@/components/dialogs/go-live-dialog';

interface LiveSession {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  thumbnailUrl?: string | null;
  category?: string | null;
  viewerCount: number;
  duration?: number | null;
  creator: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    isVerified?: boolean;
  };
  startedAt?: string | null;
  scheduledAt?: string | null;
}

interface LiveSessionsViewProps {
  onNavigate: (view: string) => void;
  onSelectSession: (sessionId: string) => void;
  onStartBroadcast: (sessionId: string) => void;
}

export function LiveSessionsView({ onNavigate, onSelectSession, onStartBroadcast }: LiveSessionsViewProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('live');
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoLive, setShowGoLive] = useState(false);
  const [liveCount, setLiveCount] = useState(0);

  const fetchSessions = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/live/sessions?status=${status}&limit=30`);
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
        if (status === 'live' || status === 'all') {
          const live = data.sessions.filter((s: LiveSession) => s.status === 'live');
          setLiveCount(live.length);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions(activeTab === 'recorded' ? 'ended' : activeTab);
  }, [activeTab, fetchSessions]);

  const handleSessionClick = (sessionId: string) => {
    onSelectSession(sessionId);
  };

  return (
    <div className="min-h-screen px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Live</span>{' '}
                <span>Streams</span>
              </h1>
              {liveCount > 0 && (
                <Badge className="bg-red-500 text-white border-0 gap-1 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {liveCount}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Watch live polls, interviews, and community events</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchSessions(activeTab)} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {currentUser && (
            <Button
              size="sm"
              className="gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-sm"
              onClick={() => setShowGoLive(true)}
            >
              <Plus className="w-4 h-4" />
              Go Live
            </Button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="live" className="gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Live Now
          </TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="recorded">Recorded</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading && sessions.length === 0 ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </motion.div>
        ) : sessions.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-950/50 dark:to-orange-950/30 flex items-center justify-center mx-auto mb-4">
              <Radio className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {activeTab === 'live' ? 'No live streams right now' :
               activeTab === 'upcoming' ? 'No upcoming streams' : 'No recorded streams'}
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
              {activeTab === 'live'
                ? 'Check back soon or be the first to start streaming!'
                : activeTab === 'upcoming'
                  ? 'No scheduled streams. Stay tuned!'
                  : 'No recorded streams available yet.'}
            </p>
            {currentUser && activeTab === 'live' && (
              <Button
                className="gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white"
                onClick={() => setShowGoLive(true)}
              >
                <Plus className="w-4 h-4" />
                Start Streaming
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.3 }}
              >
                <LiveSessionCard
                  session={session}
                  onClick={handleSessionClick}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Go Live FAB */}
      {currentUser && (
        <motion.div
          className="fixed bottom-6 right-6 z-50"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button
            size="lg"
            className="w-14 h-14 rounded-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg shadow-red-500/30"
            onClick={() => setShowGoLive(true)}
          >
            <Radio className="w-6 h-6" />
          </Button>
        </motion.div>
      )}

      {/* Go Live Dialog */}
      <GoLiveDialog
        open={showGoLive}
        onOpenChange={setShowGoLive}
        onSessionCreated={(sessionId) => {
          setShowGoLive(false);
          onStartBroadcast(sessionId);
        }}
      />
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

interface LiveSessionCardProps {
  session: LiveSession;
  onClick: (sessionId: string) => void;
}

export function LiveSessionCard({ session, onClick }: LiveSessionCardProps) {
  const isLive = session.status === 'live';
  const isUpcoming = session.status === 'upcoming';
  const isEnded = session.status === 'ended';

  const statusBadge = isLive ? (
    <Badge className="bg-red-500 text-white border-0 gap-1.5 text-xs font-semibold">
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      LIVE
    </Badge>
  ) : isUpcoming ? (
    <Badge className="bg-amber-500 text-white border-0 gap-1 text-xs font-semibold">
      Upcoming
    </Badge>
  ) : (
    <Badge className="bg-gray-500 text-white border-0 gap-1 text-xs font-semibold">
      Ended
    </Badge>
  );

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Card
        className={`cursor-pointer overflow-hidden transition-shadow hover:shadow-lg ${
          isLive
            ? 'ring-2 ring-red-500/50 shadow-red-500/10'
            : ''
        }`}
        onClick={() => onClick(session.id)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-900 overflow-hidden">
          {session.thumbnailUrl ? (
            <img
              src={session.thumbnailUrl}
              alt={session.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-red-500 animate-pulse" />
              </div>
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Status badge */}
          <div className="absolute top-2 left-2">
            {statusBadge}
          </div>

          {/* Duration / Scheduled */}
          {isEnded && session.duration && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {formatDuration(session.duration)}
            </div>
          )}

          {isUpcoming && session.scheduledAt && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {formatTime(session.scheduledAt)}
            </div>
          )}

          {/* Viewer count for live */}
          {isLive && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
              <Eye className="w-3 h-3" />
              <span>{session.viewerCount}</span>
            </div>
          )}

          {isLive && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="font-semibold text-sm line-clamp-2 mb-2">{session.title}</h3>
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={session.creator.avatarUrl || undefined} />
              <AvatarFallback className="text-[10px] bg-gradient-to-br from-orange-400 to-amber-500 text-white">
                {session.creator.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                {session.creator.displayName || session.creator.username}
              </p>
            </div>
            {session.category && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {session.category}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

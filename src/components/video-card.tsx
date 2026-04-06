'use client';

import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Heart, MessageCircle, Users, CheckCircle2, Bookmark } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import type { Video } from '@/types';
import { STATUS_COLORS, THUMBNAIL_GRADIENTS } from '@/types';

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function getGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return THUMBNAIL_GRADIENTS[Math.abs(hash) % THUMBNAIL_GRADIENTS.length];
}

interface VideoCardProps {
  video: Video;
  onClick: (videoId: string) => void;
  onCreatorClick?: (creatorId: string) => void;
  showSave?: boolean;
  reactionCounts?: Record<string, number>;
  userReactions?: string[];
  repostCount?: number;
}

function VideoCardComponent({ video, onClick, onCreatorClick, showSave = false, reactionCounts, userReactions, repostCount }: VideoCardProps) {
  const { currentUser } = useAuthStore();
  const [isSaved, setIsSaved] = useState(false);
  const gradient = getGradient(video.id);

  // Check save status when component mounts or video changes
  useEffect(() => {
    if (!showSave || !currentUser) return;
    fetch(`/api/videos/${video.id}/save-status`, {
      headers: { 'X-User-Id': currentUser.id },
    })
      .then((r) => r.json())
      .then((json) => { if (json.success) setIsSaved(json.saved); })
      .catch(() => {});
  }, [video.id, showSave, currentUser?.id]);

  const handleCreatorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCreatorClick && video.creator?.id) {
      onCreatorClick(video.creator.id);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    fetch(`/api/videos/${video.id}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setIsSaved(json.saved);
      })
      .catch(() => {});
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card
        className="cursor-pointer overflow-hidden shadow-md hover:shadow-lg transition-shadow border-0 bg-card h-full"
        onClick={() => onClick(video.id)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${gradient} ${
              video.thumbnailUrl ? 'hidden' : ''
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            <Badge className={`text-xs font-medium ${STATUS_COLORS[video.status] || ''}`}>
              {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
            </Badge>
          </div>

          {/* Type Badge */}
          <div className="absolute top-2 right-2">
            <Badge
              className={`text-xs font-medium ${
                video.type === 'lead'
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              }`}
            >
              {video.type === 'lead' ? 'Lead Clip' : 'Response'}
            </Badge>
          </div>

          {/* Save/Bookmark Button */}
          {showSave && currentUser && (
            <button
              onClick={handleSave}
              className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors z-10"
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-blue-400 text-blue-400' : 'text-white'}`} />
            </button>
          )}
        </div>

        <CardContent className="p-3 space-y-2">
          {/* Title */}
          <h3 className="font-semibold text-sm line-clamp-2 leading-snug">{video.title}</h3>

          {/* Creator - Clickable */}
          <p
            className={`text-xs text-muted-foreground flex items-center gap-1 ${
              onCreatorClick && video.creator?.id ? 'hover:text-orange-500 cursor-pointer transition-colors' : ''
            }`}
            onClick={handleCreatorClick}
          >
            @{video.creator?.username || 'anonymous'}
            {video.creator?.isVerified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
            )}
          </p>

          {/* Meta Row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {video._count?.likes || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {video._count?.comments || 0}
            </span>
            {(video._count?.polls || 0) > 0 && (
              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <Users className="w-3 h-3" />
                {video._count?.polls} poll{(video._count?.polls || 0) > 1 ? 's' : ''}
              </span>
            )}
            {video._count?.responses && video._count.responses > 0 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                {video._count.responses} resp.
              </span>
            )}
          </div>

          {/* Mini Reactions */}
          {reactionCounts && Object.keys(reactionCounts).length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {Object.entries(reactionCounts).filter(([, count]) => count > 0).slice(0, 4).map(([type, count]) => {
                const emojiMap: Record<string, string> = { fire: '🔥', heart: '❤️', laugh: '😂', wow: '😮', sad: '😢', angry: '😡', clap: '👏', thinking: '🤔' };
                const isActive = userReactions?.includes(type);
                return (
                  <span
                    key={type}
                    className={`inline-flex items-center gap-0 px-1 py-0.5 rounded-full text-[10px] ${
                      isActive ? 'bg-orange-100 dark:bg-orange-900/40 ring-1 ring-orange-400 dark:ring-orange-600' : 'bg-muted/60'
                    }`}
                  >
                    {emojiMap[type] || type} {count}
                  </span>
                );
              })}
              {repostCount !== undefined && repostCount > 0 && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1">
                  🔄 {repostCount}
                </span>
              )}
            </div>
          )}
          {repostCount !== undefined && repostCount > 0 && (!reactionCounts || Object.keys(reactionCounts).length === 0) && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
              🔄 {repostCount} repost{(repostCount || 0) > 1 ? 's' : ''}
            </span>
          )}

          {/* Category & Time */}
          <div className="flex items-center justify-between">
            {video.category && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {video.category}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">
              {timeAgo(video.createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export const VideoCard = memo(VideoCardComponent);
export { timeAgo, getGradient };

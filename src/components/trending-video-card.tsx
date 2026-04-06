'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Eye, Heart, MessageCircle, Flame, CheckCircle2, TrendingUp } from 'lucide-react';
import { THUMBNAIL_GRADIENTS } from '@/types';

export interface TrendingVideoData {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  type: string;
  category: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  responseCount: number;
  trendingScore: number;
  rank: number;
  createdAt: string;
  creatorId: string;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
}

function getGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return THUMBNAIL_GRADIENTS[Math.abs(hash) % THUMBNAIL_GRADIENTS.length];
}

interface TrendingVideoCardProps {
  video: TrendingVideoData;
  onClick: (videoId: string) => void;
  index?: number;
  compact?: boolean;
}

function TrendingVideoCardComponent({ video, onClick, index = 0, compact = false }: TrendingVideoCardProps) {
  const gradient = getGradient(video.id);
  const rankColors = [
    'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md shadow-amber-500/30',
    'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-md',
    'bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-md',
  ];
  const rankClass = video.rank <= 3 ? rankColors[video.rank - 1] : 'bg-muted text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileHover={{ scale: 1.03 }}
      className={compact ? 'min-w-[220px] sm:min-w-[260px]' : 'min-w-[280px] sm:min-w-[300px]'}
    >
      <Card
        className="cursor-pointer overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 border-0 bg-card h-full"
        onClick={() => onClick(video.id)}
      >
        {/* Thumbnail - Landscape 16:9 */}
        <div className="relative aspect-video overflow-hidden">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
              </div>
            </div>
          </div>

          {/* Trending Badge - Top Left */}
          <div className="absolute top-2 left-2">
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-semibold border-0 gap-1 shadow-sm">
              <Flame className="w-3 h-3" />
              Trending
            </Badge>
          </div>

          {/* Rank Badge - Top Right */}
          <div className="absolute top-2 right-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${rankClass}`}>
              #{video.rank}
            </div>
          </div>

          {/* Gradient overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        <CardContent className={compact ? 'p-2.5 space-y-1.5' : 'p-3 space-y-2'}>
          {/* Title */}
          <h3 className={`font-bold line-clamp-2 leading-snug ${compact ? 'text-xs' : 'text-sm'}`}>
            {video.title}
          </h3>

          {/* Creator Row */}
          <div className="flex items-center gap-1.5">
            <div className={`rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold shrink-0 ${
              compact ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs'
            }`}>
              {video.creator.username.charAt(0).toUpperCase()}
            </div>
            <p className={`text-muted-foreground truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>
              @{video.creator.username}
            </p>
            {video.creator.isVerified && (
              <CheckCircle2 className={`text-orange-500 fill-orange-500 shrink-0 ${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
            )}
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <span className={`flex items-center gap-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
              <Eye className="w-3 h-3" />
              {video.viewCount}
            </span>
            <span className={`flex items-center gap-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
              <Heart className="w-3 h-3" />
              {video.likeCount}
            </span>
            <span className={`flex items-center gap-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
              <MessageCircle className="w-3 h-3" />
              {video.commentCount}
            </span>
          </div>

          {/* Hot Indicator */}
          {video.trendingScore > 0 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-orange-500" />
              <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                {video.trendingScore.toLocaleString()} pts
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export const TrendingVideoCard = memo(TrendingVideoCardComponent);

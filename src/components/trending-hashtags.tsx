'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, TrendingUp, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TrendingHashtagsProps {
  onHashtagClick?: (tag: string) => void;
  limit?: number;
}

interface TrendingHashtag {
  tag: string;
  useCount: number;
}

export function TrendingHashtags({ onHashtagClick, limit = 10 }: TrendingHashtagsProps) {
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hashtags/trending?limit=${limit}`);
      const data = await res.json();
      if (data.success) {
        setHashtags(data.hashtags);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending();
  }, [limit]);

  if (!loading && hashtags.length === 0) return null;

  const maxCount = Math.max(...hashtags.map((h) => h.useCount), 1);

  return (
    <Card className="border-orange-200 dark:border-orange-800/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            Trending Hashtags
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={fetchTrending}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-2.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted animate-pulse" />
                <div className="h-3 flex-1 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence>
              {hashtags.map((hashtag, index) => (
                <motion.button
                  key={hashtag.tag}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => onHashtagClick?.(hashtag.tag)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors text-left group"
                >
                  <span className="text-xs font-bold text-muted-foreground w-4 text-right">
                    {index + 1}
                  </span>
                  <Hash className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="text-sm font-medium flex-1 truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {hashtag.tag}
                  </span>
                  {/* Mini bar */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${(hashtag.useCount / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-6 text-right">
                      {hashtag.useCount}
                    </span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

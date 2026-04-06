'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, X, Megaphone, Sparkles, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useAdStore } from '@/stores/ad-store';
import type { ServedAd } from '@/stores/ad-store';

interface PostVoteAdProps {
  videoId: string;
  /** If true, the ad will attempt to serve; set to false to skip entirely */
  show?: boolean;
  /** Called when the ad is dismissed or closed */
  onDismiss?: () => void;
  className?: string;
}

export function PostVoteAd({
  videoId,
  show = true,
  onDismiss,
  className = '',
}: PostVoteAdProps) {
  const { currentUser } = useAuthStore();
  const { currentAd, serveAd, trackClick, clearCurrentAd } = useAdStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  // Serve ad when show becomes true
  useEffect(() => {
    if (!show || isDismissed) return;

    let cancelled = false;
    const fetchAd = async () => {
      setIsLoading(true);
      await serveAd(videoId, 'post_vote', currentUser?.id);
      if (!cancelled) setIsLoading(false);
    };

    fetchAd();
    return () => {
      cancelled = true;
    };
  }, [show, videoId]);

  const handleCTAClick = useCallback(() => {
    if (!currentAd || isClicking) return;
    setIsClicking(true);
    trackClick(currentAd.campaignId, 'post_vote', videoId, currentUser?.id);
    if (currentAd.targetUrl) {
      window.open(currentAd.targetUrl, '_blank', 'noopener,noreferrer');
    }
    setTimeout(() => setIsClicking(false), 1000);
  }, [currentAd, isClicking, trackClick, videoId, currentUser]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    clearCurrentAd();
    onDismiss?.();
  }, [clearCurrentAd, onDismiss]);

  // Don't render if not shown, dismissed, or loading
  if (!show || isDismissed) return null;
  if (isLoading) return null;
  if (!currentAd) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={className}
      >
        <Card className="relative overflow-hidden border-emerald-200/60 dark:border-emerald-800/30 bg-gradient-to-r from-emerald-50/60 via-white to-amber-50/60 dark:from-emerald-950/20 dark:via-card dark:to-amber-950/20 shadow-sm">
          {/* Decorative accent line */}
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400" />

          <CardContent className="p-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Thanks for voting!</p>
                  <p className="text-xs text-muted-foreground">Check this out</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] font-medium border-0">
                  <Megaphone className="w-2.5 h-2.5 mr-0.5" />
                  Sponsored
                </Badge>
                <button
                  onClick={handleDismiss}
                  className="w-6 h-6 rounded-full hover:bg-muted/80 flex items-center justify-center transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Ad content */}
            <div className="flex items-center gap-3">
              {/* Advertiser image */}
              {currentAd.imageUrl && (
                <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-muted shadow-sm">
                  <img
                    src={currentAd.imageUrl}
                    alt={currentAd.advertiserName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML =
                        '<div class="w-full h-full flex items-center justify-center bg-muted"><svg class="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg></div>';
                    }}
                  />
                </div>
              )}

              {/* Ad copy */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">
                  {currentAd.headline}
                </p>
                {currentAd.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {currentAd.description}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {currentAd.advertiserName}
                </p>
              </div>

              {/* CTA */}
              <Button
                size="sm"
                onClick={handleCTAClick}
                disabled={isClicking}
                className="shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs gap-1.5 rounded-lg shadow-sm"
              >
                {isClicking ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ExternalLink className="w-3 h-3" />
                )}
                {currentAd.ctaText || 'Learn More'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

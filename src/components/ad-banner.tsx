'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, X, Megaphone, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useAdStore } from '@/stores/ad-store';
import type { ServedAd } from '@/stores/ad-store';

interface AdBannerProps {
  videoId: string;
  placementId?: string;
  className?: string;
  /** If you already have a served ad, pass it in directly */
  ad?: ServedAd | null;
  /** Called when banner is dismissed */
  onDismiss?: () => void;
}

export function AdBanner({ videoId, placementId, className = '', ad: propAd, onDismiss }: AdBannerProps) {
  const { currentUser } = useAuthStore();
  const { currentAd: storeAd, serveAd, trackClick, clearCurrentAd } = useAdStore();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(!propAd);


  // Use prop ad or store ad
  const ad = propAd ?? storeAd;

  // Serve ad on mount if not provided via props
  useEffect(() => {
    if (propAd || isDismissed) return;

    let cancelled = false;
    const fetchAd = async () => {
      setIsLoading(true);
      await serveAd(videoId, placementId || 'banner', currentUser?.id);
      if (!cancelled) {
        setIsLoading(false);
      }
    };

    fetchAd();
    return () => {
      cancelled = true;
    };
  }, [videoId, placementId, propAd]);

  // Impression is tracked server-side when the ad is served

  const handleClick = useCallback(() => {
    if (!ad) return;
    trackClick(ad.campaignId, placementId, videoId, currentUser?.id);

    // Open target URL in a new tab
    if (ad.targetUrl) {
      window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
    }
  }, [ad, placementId, videoId, currentUser, trackClick]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    clearCurrentAd();
    onDismiss?.();
  }, [clearCurrentAd, onDismiss]);

  // Don't render if dismissed, loading, or no ad
  if (isDismissed) return null;

  if (isLoading) return null; // Non-intrusive: no skeleton for banner

  if (!ad) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`relative ${className}`}
      >
        <div className="relative flex items-center gap-3 rounded-xl border border-border bg-card/80 backdrop-blur-sm p-3 sm:p-4 shadow-sm overflow-hidden group">
          {/* Subtle gradient accent */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/40 via-transparent to-amber-50/40 dark:from-emerald-950/20 dark:to-amber-950/20 pointer-events-none" />

          {/* Sponsored Badge */}
          <Badge className="shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] font-semibold border-0 px-2 py-0.5">
            <Megaphone className="w-3 h-3 mr-0.5" />
            Sponsored
          </Badge>

          {/* Advertiser Image */}
          {ad.imageUrl && (
            <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-muted">
              <img
                src={ad.imageUrl}
                alt={ad.advertiserName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Headline & Description */}
          <div className="flex-1 min-w-0 relative">
            <p className="text-sm font-semibold truncate leading-tight">{ad.headline}</p>
            {ad.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{ad.description}</p>
            )}
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              {ad.advertiserName}
            </p>
          </div>

          {/* CTA Button */}
          <Button
            size="sm"
            onClick={handleClick}
            className="shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs gap-1 shadow-sm transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">Learn More</span>
          </Button>

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Dismiss advertisement"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

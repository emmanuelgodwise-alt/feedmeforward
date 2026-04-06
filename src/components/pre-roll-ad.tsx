'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Megaphone, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useAdStore } from '@/stores/ad-store';
import type { ServedAd } from '@/stores/ad-store';

interface PreRollAdProps {
  videoId: string;
  /** Called when the ad is finished or skipped */
  onComplete: () => void;
  /** Maximum duration of the ad in seconds (default: 5) */
  duration?: number;
  /** Seconds before "Skip Ad" button appears (default: 3) */
  skipDelay?: number;
  className?: string;
}

export function PreRollAd({
  videoId,
  onComplete,
  duration = 5,
  skipDelay = 3,
  className = '',
}: PreRollAdProps) {
  const { currentUser } = useAuthStore();
  const { currentAd, serveAd, trackClick, clearCurrentAd } = useAdStore();
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(duration);
  const [canSkip, setCanSkip] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Serve ad on mount
  useEffect(() => {
    let cancelled = false;
    const fetchAd = async () => {
      setIsLoading(true);
      await serveAd(videoId, 'preroll', currentUser?.id);
      if (!cancelled) setIsLoading(false);
    };
    fetchAd();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const handleFinish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsExiting(true);
    setTimeout(() => {
      clearCurrentAd();
      onComplete();
    }, 500);
  }, [clearCurrentAd, onComplete]);

  const handleSkip = useCallback(() => {
    if (!canSkip) return;
    handleFinish();
  }, [canSkip, handleFinish]);

  // Countdown timer
  useEffect(() => {
    if (isLoading || !currentAd) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Ad time finished — clear and finish
          if (timerRef.current) clearInterval(timerRef.current);
          setIsExiting(true);
          setTimeout(() => {
            clearCurrentAd();
            onComplete();
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading, currentAd, clearCurrentAd, onComplete]);

  // Enable skip button after skipDelay
  useEffect(() => {
    if (isLoading) return;

    const skipTimer = setTimeout(() => {
      setCanSkip(true);
    }, skipDelay * 1000);

    return () => clearTimeout(skipTimer);
  }, [isLoading, skipDelay]);

  const handleCTAClick = useCallback(() => {
    if (!currentAd || isClicking) return;
    setIsClicking(true);
    trackClick(currentAd.campaignId, 'preroll', videoId, currentUser?.id);
    if (currentAd.targetUrl) {
      window.open(currentAd.targetUrl, '_blank', 'noopener,noreferrer');
    }
    setTimeout(() => setIsClicking(false), 1000);
  }, [currentAd, isClicking, trackClick, videoId, currentUser]);

  // Loading state
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md ${className}`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-white/70" />
          <p className="text-sm text-white/60">Preparing ad...</p>
        </div>
      </motion.div>
    );
  }

  // No ad available
  if (!currentAd) {
    onComplete();
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isExiting ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg ${className}`}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative w-full max-w-lg mx-4 overflow-hidden rounded-2xl shadow-2xl"
        >
          {/* Background image or gradient */}
          <div className="relative aspect-[16/9] sm:aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 sm:p-10">
            {/* Advertiser image overlay */}
            {currentAd.imageUrl && (
              <>
                <img
                  src={currentAd.imageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-20"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
              </>
            )}

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center gap-4 max-w-sm">
              {/* Advertiser Logo/Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center"
              >
                {currentAd.imageUrl ? (
                  <img
                    src={currentAd.imageUrl}
                    alt={currentAd.advertiserName}
                    className="w-full h-full rounded-2xl object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML =
                        '<svg class="w-8 h-8 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>';
                    }}
                  />
                ) : (
                  <Megaphone className="w-8 h-8 text-white/60" />
                )}
              </motion.div>

              {/* Sponsored badge */}
              <Badge className="bg-white/15 text-white/80 border-white/20 text-xs font-medium backdrop-blur-sm">
                Sponsored
              </Badge>

              {/* Headline */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl sm:text-2xl font-bold text-white leading-tight"
              >
                {currentAd.headline}
              </motion.h3>

              {/* Description */}
              {currentAd.description && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-white/70 leading-relaxed"
                >
                  {currentAd.description}
                </motion.p>
              )}

              {/* Advertiser name */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="text-xs text-white/40"
              >
                by {currentAd.advertiserName}
              </motion.p>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  size="lg"
                  onClick={handleCTAClick}
                  disabled={isClicking}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-full px-8 shadow-lg shadow-emerald-500/25 gap-2 text-base transition-all"
                >
                  {isClicking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  {currentAd.ctaText || 'Learn More'}
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Bottom bar with countdown and skip */}
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-gradient-to-t from-black/60 to-transparent">
            {/* Countdown timer */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-white/70 text-xs">
                <div className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">{countdown}</span>
                </div>
                <span>Ad</span>
              </div>
            </div>

            {/* Skip Ad button */}
            <AnimatePresence>
              {canSkip ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="text-white/80 hover:text-white hover:bg-white/10 text-xs font-medium gap-1"
                  >
                    Skip Ad
                    <span className="text-white/50">►</span>
                  </Button>
                </motion.div>
              ) : (
                <span className="text-[10px] text-white/40">
                  Skip in {countdown - (duration - skipDelay) > 0 ? countdown - (duration - skipDelay) : 0}s
                </span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

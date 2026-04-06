'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { Gift, DollarSign, Users, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────
interface ReferralBannerProps {
  onNavigate: (view: string) => void;
}

// ─── Dismissal key for localStorage ────────────────────────────────
const DISMISS_KEY = 'fmf-referral-banner-dismissed';

// ─── Component ────────────────────────────────────────────────────
export function ReferralBanner({ onNavigate }: ReferralBannerProps) {
  const { currentUser } = useAuthStore();
  const [stats, setStats] = useState<{ totalInvited: number; totalEarned: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const now = Date.now();
      if (now - dismissedTime > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(DISMISS_KEY);
        return false;
      }
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (!currentUser) return;

    // Fetch referral stats
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/invitations/referral-stats', {
          headers: { 'X-User-Id': currentUser.id },
        });
        const json = await res.json();
        if (json.success && json.data) {
          setStats({
            totalInvited: json.data.totalInvited,
            totalEarned: json.data.totalEarned,
          });
          // Show banner if user hasn't invited many people yet
          if (json.data.totalInvited < 5) {
            setVisible(true);
          }
        }
      } catch {
        // silent
      }
    };

    fetchStats();
  }, [currentUser]);

  if (!currentUser || dismissed || !visible) return null;

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden mb-8"
      >
        <div className="relative rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-[1px]">
          {/* Decorative pattern */}
          <div className="absolute inset-0 rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 50% 80%, white 1px, transparent 1px)',
              backgroundSize: '40px 40px, 60px 60px, 50px 50px',
            }} />
          </div>

          <div className="relative flex flex-col sm:flex-row items-center gap-4 p-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 text-center sm:text-left">
              <p className="text-base font-bold text-white">
                Invite friends, earn $2 per sign-up! 🎉
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-4 mt-1">
                <span className="text-sm text-white/80 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {stats?.totalInvited ?? 0} invited
                </span>
                <span className="text-sm text-white/80 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  ${(stats?.totalEarned ?? 0).toFixed(2)} earned
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="bg-white text-orange-600 hover:bg-white/90 font-semibold shadow-md"
                onClick={() => onNavigate('import-friends')}
              >
                Invite Now
              </Button>
              <button
                onClick={handleDismiss}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

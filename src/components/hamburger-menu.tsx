'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import {
  Video,
  Plus,
  Rss,
  MessageSquare,
  Bell,
  Users,
  TrendingUp,
  Wallet,
  UserPlus,
  BarChart3,
  Circle,
  LayoutDashboard,
  Contact,
  Target,
  ShieldCheck,
  Vote,
  FileSignature,
} from 'lucide-react';

interface HamburgerMenuProps {
  onNavigate: (view: string) => void;
  activeView?: string;
  /** Only show the hamburger when authenticated */
  isAuthenticated?: boolean;
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  view: string;
  theme: string; // for subtle color grouping
}

// Features organized by purpose into 4 rows
const ROWS: NavItem[][] = [
  // Row 1: Engage (the 3 tiers)
  [
    { icon: Video, label: 'Video Polls', view: 'explore', theme: 'orange' },
    { icon: Rss, label: 'Feed', view: 'feed', theme: 'orange' },
    { icon: Vote, label: 'Plebiscite', view: 'plebiscite', theme: 'orange' },
    { icon: FileSignature, label: 'Petition', view: 'petition', theme: 'orange' },
  ],
  // Row 2: Create & Connect
  [
    { icon: Plus, label: 'Create', view: 'create-lead', theme: 'blue' },
    { icon: MessageSquare, label: 'Messages', view: 'messages', theme: 'blue' },
    { icon: Bell, label: 'Alerts', view: 'notifications', theme: 'blue' },
    { icon: Circle, label: 'Communities', view: 'circles', theme: 'blue' },
  ],
  // Row 3: Earn & Manage
  [
    { icon: Users, label: 'Ranks', view: 'leaderboard', theme: 'emerald' },
    { icon: TrendingUp, label: 'Rewards', view: 'rewards', theme: 'emerald' },
    { icon: Wallet, label: 'Wallet', view: 'wallet', theme: 'emerald' },
    { icon: LayoutDashboard, label: 'Dashboard', view: 'dashboard', theme: 'emerald' },
  ],
  // Row 4: Advanced
  [
    { icon: BarChart3, label: 'Insights', view: 'audience', theme: 'violet' },
    { icon: Target, label: 'Segments', view: 'segments', theme: 'violet' },
    { icon: ShieldCheck, label: 'Analytics Pro', view: 'analytics-pro', theme: 'violet' },
    { icon: Contact, label: 'Import Friends', view: 'import-friends', theme: 'violet' },
  ],
];

const THEME_STYLES: Record<string, { hover: string; activeBg: string; activeText: string; dot: string }> = {
  orange: {
    hover: 'hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600 dark:hover:text-orange-400',
    activeBg: 'bg-orange-100 dark:bg-orange-950/50',
    activeText: 'text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-400',
  },
  blue: {
    hover: 'hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400',
    activeBg: 'bg-blue-100 dark:bg-blue-950/50',
    activeText: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-400',
  },
  emerald: {
    hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400',
    activeBg: 'bg-emerald-100 dark:bg-emerald-950/50',
    activeText: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-400',
  },
  violet: {
    hover: 'hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:text-violet-600 dark:hover:text-violet-400',
    activeBg: 'bg-violet-100 dark:bg-violet-950/50',
    activeText: 'text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-400',
  },
};

const ROW_LABELS = ['Engage', 'Create & Connect', 'Earn & Manage', 'Advanced'];

export function HamburgerMenu({ onNavigate, activeView, isAuthenticated = true }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when menu open on mobile
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const handleNavigate = (view: string) => {
    setIsOpen(false);
    onNavigate(view);
  };

  if (!isAuthenticated) return null;

  return (
    <div ref={menuRef} className="fixed top-4 right-4 z-50">
      {/* Hamburger Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white shadow-lg shadow-slate-900/30 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Menu className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active indicator dot */}
        {activeView && activeView !== 'landing' && activeView !== 'signup' && activeView !== 'login' && activeView !== 'onboarding' && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white dark:border-slate-900" />
        )}
      </motion.button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm md:hidden"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute right-0 top-14 mt-1 w-[min(92vw,520px)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200 dark:border-slate-700/50 overflow-hidden"
            >
              {/* Panel Header */}
              <div className="px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Navigate
                </h3>
              </div>

              {/* Feature Rows */}
              <div className="p-4 space-y-4">
                {ROWS.map((row, rowIdx) => (
                  <div key={rowIdx}>
                    {/* Row label */}
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
                      {ROW_LABELS[rowIdx]}
                    </p>
                    {/* Feature buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {row.map((item) => {
                        const isActive = activeView === item.view;
                        const theme = THEME_STYLES[item.theme];
                        const Icon = item.icon;

                        return (
                          <motion.button
                            key={item.view}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleNavigate(item.view)}
                            className={`
                              relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-150 text-center
                              ${isActive
                                ? `${theme.activeBg} ${theme.activeText} ring-1 ring-current/20`
                                : `text-slate-600 dark:text-slate-400 ${theme.hover}`
                              }
                            `}
                          >
                            <div className="relative">
                              <Icon className="w-5 h-5" />
                              {isActive && (
                                <motion.span
                                  layoutId="active-dot"
                                  className={`absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full ${theme.dot}`}
                                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                              )}
                            </div>
                            <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

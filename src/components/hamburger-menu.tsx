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
  Banknote,
} from 'lucide-react';

interface HamburgerMenuProps {
  onNavigate: (view: string) => void;
  activeView?: string;
  isAuthenticated?: boolean;
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  view: string;
  /** Individual bright icon color — Tailwind text class */
  iconColor: string;
  /** Individual bright icon bg — Tailwind bg class */
  iconBg: string;
  /** Active dot color */
  dotColor: string;
  /** Hover bg for the button */
  hoverBg: string;
}

// Each feature has its own bright, vivid color
const ROWS: NavItem[][] = [
  // Row 1: Engage
  [
    { icon: Video, label: 'Video Polls', view: 'explore', iconColor: 'text-red-500', iconBg: 'bg-red-100 dark:bg-red-950/60', dotColor: 'bg-red-500', hoverBg: 'hover:bg-red-50 dark:hover:bg-red-950/20' },
    { icon: Rss, label: 'Feed', view: 'feed', iconColor: 'text-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-950/60', dotColor: 'bg-orange-500', hoverBg: 'hover:bg-orange-50 dark:hover:bg-orange-950/20' },
    { icon: Vote, label: 'Plebiscite', view: 'plebiscite', iconColor: 'text-blue-600', iconBg: 'bg-blue-100 dark:bg-blue-950/60', dotColor: 'bg-blue-500', hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-950/20' },
    { icon: FileSignature, label: 'Petition', view: 'petition', iconColor: 'text-pink-500', iconBg: 'bg-pink-100 dark:bg-pink-950/60', dotColor: 'bg-pink-500', hoverBg: 'hover:bg-pink-50 dark:hover:bg-pink-950/20' },
  ],
  // Row 2: Create & Connect
  [
    { icon: Plus, label: 'Create', view: 'create-lead', iconColor: 'text-green-500', iconBg: 'bg-green-100 dark:bg-green-950/60', dotColor: 'bg-green-500', hoverBg: 'hover:bg-green-50 dark:hover:bg-green-950/20' },
    { icon: MessageSquare, label: 'Messages', view: 'messages', iconColor: 'text-sky-500', iconBg: 'bg-sky-100 dark:bg-sky-950/60', dotColor: 'bg-sky-500', hoverBg: 'hover:bg-sky-50 dark:hover:bg-sky-950/20' },
    { icon: Bell, label: 'Alerts', view: 'notifications', iconColor: 'text-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-950/60', dotColor: 'bg-amber-500', hoverBg: 'hover:bg-amber-50 dark:hover:bg-amber-950/20' },
    { icon: Circle, label: 'Communities', view: 'circles', iconColor: 'text-teal-500', iconBg: 'bg-teal-100 dark:bg-teal-950/60', dotColor: 'bg-teal-500', hoverBg: 'hover:bg-teal-50 dark:hover:bg-teal-950/20' },
  ],
  // Row 3: Earn & Manage
  [
    { icon: Users, label: 'Ranks', view: 'leaderboard', iconColor: 'text-yellow-500', iconBg: 'bg-yellow-100 dark:bg-yellow-950/60', dotColor: 'bg-yellow-500', hoverBg: 'hover:bg-yellow-50 dark:hover:bg-yellow-950/20' },
    { icon: TrendingUp, label: 'Rewards', view: 'rewards', iconColor: 'text-fuchsia-500', iconBg: 'bg-fuchsia-100 dark:bg-fuchsia-950/60', dotColor: 'bg-fuchsia-500', hoverBg: 'hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/20' },
    { icon: Banknote, label: 'Polls Market', view: 'polls-marketplace', iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100 dark:bg-emerald-950/60', dotColor: 'bg-emerald-500', hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20' },
    { icon: Wallet, label: 'Wallet', view: 'wallet', iconColor: 'text-lime-600', iconBg: 'bg-lime-100 dark:bg-lime-950/60', dotColor: 'bg-lime-500', hoverBg: 'hover:bg-lime-50 dark:hover:bg-lime-950/20' },
    { icon: LayoutDashboard, label: 'Dashboard', view: 'dashboard', iconColor: 'text-indigo-500', iconBg: 'bg-indigo-100 dark:bg-indigo-950/60', dotColor: 'bg-indigo-500', hoverBg: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/20' },
  ],
  // Row 4: Advanced
  [
    { icon: BarChart3, label: 'Insights', view: 'audience', iconColor: 'text-cyan-500', iconBg: 'bg-cyan-100 dark:bg-cyan-950/60', dotColor: 'bg-cyan-500', hoverBg: 'hover:bg-cyan-50 dark:hover:bg-cyan-950/20' },
    { icon: Target, label: 'Segments', view: 'segments', iconColor: 'text-rose-500', iconBg: 'bg-rose-100 dark:bg-rose-950/60', dotColor: 'bg-rose-500', hoverBg: 'hover:bg-rose-50 dark:hover:bg-rose-950/20' },
    { icon: ShieldCheck, label: 'Analytics Pro', view: 'analytics-pro', iconColor: 'text-purple-500', iconBg: 'bg-purple-100 dark:bg-purple-950/60', dotColor: 'bg-purple-500', hoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-950/20' },
    { icon: Contact, label: 'Import Friends', view: 'import-friends', iconColor: 'text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-950/60', dotColor: 'bg-blue-400', hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-950/20' },
  ],
];

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
              className="absolute right-0 top-14 mt-1 w-[min(92vw,520px)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200 dark:border-slate-700/50 flex flex-col overflow-hidden"
              style={{ maxHeight: 'calc(100vh - 6rem)' }}
            >
              {/* Panel Header — sticky */}
              <div className="shrink-0 px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Navigate
                </h3>
              </div>

              {/* Feature Rows — scrollable with extra bottom padding */}
              <div className="overflow-y-auto overscroll-contain px-4 pt-4 pb-8 space-y-5">
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
                                ? `${item.iconBg} ring-1 ring-current/20`
                                : `${item.hoverBg} text-slate-600 dark:text-slate-400`
                              }
                            `}
                          >
                            {/* Icon in its own bright colored circle */}
                            <div className="relative">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isActive ? item.iconBg : 'bg-slate-100 dark:bg-slate-800'}`}>
                                <Icon className={`w-5 h-5 ${item.iconColor}`} />
                              </div>
                              {isActive && (
                                <motion.span
                                  layoutId={`active-dot-${item.view}`}
                                  className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${item.dotColor} ring-2 ring-white dark:ring-slate-900`}
                                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                              )}
                            </div>
                            <span className={`text-[11px] font-medium leading-tight ${isActive ? item.iconColor : ''}`}>
                              {item.label}
                            </span>
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

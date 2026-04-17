'use client';

import { Button } from '@/components/ui/button';
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

interface QuickNavProps {
  onNavigate: (view: string) => void;
  activeView?: string;
}

const NAV_ITEMS = [
  { icon: Video, label: 'Video Polls', view: 'explore' },
  { icon: Plus, label: 'Create', view: 'create-lead' },
  { icon: Rss, label: 'Feed', view: 'feed' },
  { icon: MessageSquare, label: 'Messages', view: 'messages' },
  { icon: Bell, label: 'Alerts', view: 'notifications' },
  { icon: Users, label: 'Ranks', view: 'leaderboard' },
  { icon: TrendingUp, label: 'Rewards', view: 'rewards' },
  { icon: Wallet, label: 'Wallet', view: 'wallet' },
  { icon: Circle, label: 'Communities', view: 'circles' },
  { icon: UserPlus, label: 'Invite', view: 'invitations' },
  { icon: Contact, label: 'Import Friends', view: 'import-friends' },
  { icon: LayoutDashboard, label: 'Dashboard', view: 'dashboard' },
  { icon: BarChart3, label: 'Insights', view: 'audience' },
  { icon: Target, label: 'Segments', view: 'segments' },
  { icon: ShieldCheck, label: 'Analytics Pro', view: 'analytics-pro' },
  { icon: Vote, label: 'Plebiscite', view: 'plebiscite' },
  { icon: FileSignature, label: 'Petition', view: 'petition' },
];

export function QuickNav({ onNavigate, activeView }: QuickNavProps) {
  return (
    <nav className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map((item, idx) => {
        const isActive = activeView === item.view;
        const isFirst = idx === 0;
        return (
          <Button
            key={item.view}
            variant={isActive ? 'default' : 'outline'}
            size={isFirst ? 'default' : 'sm'}
            onClick={() => onNavigate(item.view)}
            aria-current={isActive ? 'page' : undefined}
            className={`shrink-0 gap-1.5 ${
              isActive
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm hover:from-orange-600 hover:to-amber-600'
                : isFirst
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm hover:from-orange-600 hover:to-amber-600'
                  : 'hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600 dark:hover:text-orange-400'
            }`}
          >
            <item.icon className={`${isFirst ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} aria-hidden="true" />
            <span className={`${isFirst ? 'text-sm' : 'text-xs'} font-medium`}>{item.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}

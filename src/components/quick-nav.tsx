'use client';

import { Button } from '@/components/ui/button';
import {
  Video,
  Users,
  TrendingUp,
  Wallet,
  UserPlus,
  Plus,
  Home,
  BarChart3,
  Rss,
  Bell,
  MessageSquare,
  Circle,
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
  { icon: Home, label: 'My Dashboard', view: 'dashboard' },
  { icon: BarChart3, label: 'Insights', view: 'audience' },
];

export function QuickNav({ onNavigate, activeView }: QuickNavProps) {
  return (
    <nav className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = activeView === item.view;
        return (
          <Button
            key={item.view}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => onNavigate(item.view)}
            aria-current={isActive ? 'page' : undefined}
            className={`shrink-0 gap-1.5 ${
              isActive
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm hover:from-orange-600 hover:to-amber-600'
                : 'hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-600 dark:hover:text-orange-400'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="text-xs font-medium">{item.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}

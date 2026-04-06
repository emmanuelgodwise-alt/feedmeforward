'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatStore, type ConversationItem } from '@/stores/chat-store';
import { useRealtimeStore } from '@/stores/realtime-store';
import {
  MessageSquare,
  Search,
  X,
  UserPlus,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  'from-orange-400 to-amber-500',
  'from-rose-400 to-pink-500',
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-purple-500',
  'from-sky-400 to-blue-500',
  'from-amber-400 to-orange-500',
];

function getAvatarGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '...' : str;
}

// ─── Props ───────────────────────────────────────────────────────

interface ConversationListProps {
  conversations: ConversationItem[];
  isLoading: boolean;
  activeConversationId: string | null;
  onSelectConversation: (conversation: ConversationItem) => void;
  onNewMessage: () => void;
}

// ─── Animation ───────────────────────────────────────────────────

const containerVariants = {
  animate: { transition: { staggerChildren: 0.03 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } },
};

// ─── Component ───────────────────────────────────────────────────

export function ConversationList({
  conversations,
  isLoading,
  activeConversationId,
  onSelectConversation,
  onNewMessage,
}: ConversationListProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const { pendingMessages } = useRealtimeStore();

  const filteredConversations = searchFilter
    ? conversations.filter((c) => {
        const name = (c.otherUser?.displayName || c.otherUser?.username || c.name || '').toLowerCase();
        return name.includes(searchFilter.toLowerCase());
      })
    : conversations;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold">Chats</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-orange-500 hover:bg-orange-50"
          onClick={onNewMessage}
        >
          <UserPlus className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-14 h-14 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mb-3">
              <MessageSquare className="w-7 h-7 text-orange-300 dark:text-orange-700" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {searchFilter ? 'No conversations found' : 'No conversations yet'}
            </p>
            <p className="text-xs text-muted-foreground/70 text-center max-w-[200px]">
              {searchFilter ? 'Try a different search' : 'Start a new conversation'}
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="divide-y"
          >
            {filteredConversations.map((conv) => {
              const isActive = activeConversationId === conv.id;
              const isUnread = conv.unreadCount > 0;
              const displayName = conv.otherUser?.displayName || conv.otherUser?.username || conv.name || 'Unknown';
              const avatarUrl = conv.otherUser?.avatarUrl || conv.avatarUrl;

              return (
                <motion.button
                  key={conv.id}
                  variants={itemVariants}
                  onClick={() => onSelectConversation(conv)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-3 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-orange-50 dark:bg-orange-950/30 border-l-[3px] border-l-orange-500'
                      : isUnread
                        ? 'bg-orange-50/40 dark:bg-orange-950/15 hover:bg-orange-50/70'
                        : 'hover:bg-muted/50'
                  }`}
                >
                  <Avatar className="w-10 h-10 shrink-0">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                    <AvatarFallback
                      className={`bg-gradient-to-br ${getAvatarGradient(conv.id)} text-white text-xs font-bold`}
                    >
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                        {displayName}
                      </p>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {conv.lastActivityAt ? getRelativeTime(conv.lastActivityAt) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-xs truncate ${isUnread ? 'text-foreground/70 font-medium' : 'text-muted-foreground'}`}>
                        {conv.lastMessage ? truncate(conv.lastMessage, 40) : 'No messages yet'}
                      </p>
                      {isUnread && (
                        <span className="min-w-[20px] h-5 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}

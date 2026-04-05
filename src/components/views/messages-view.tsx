'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MessageSquare,
  Send,
  Trash2,
  Search,
  Loader2,
  X,
  Check,
  CheckCheck,
  UserPlus,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { QuickNav } from '@/components/quick-nav';
import { FollowButton } from '@/components/follow-button';
import { useToast } from '@/hooks/use-toast';
import type { View } from '@/app/page';

// ─── Types ─────────────────────────────────────────────────────────

interface MessagesViewProps {
  onNavigate: (view: string) => void;
  setProfileUserId: (id: string) => void;
}

interface ConversationUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

interface ConversationItem {
  otherUser: ConversationUser;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
    receiverId: string;
    isRead: boolean;
  };
  unreadCount: number;
}

interface MessageItem {
  id: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface SearchedUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isFollowing: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────

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
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
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

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '...' : str;
}

// ─── Animation Variants ────────────────────────────────────────────

const containerVariants = {
  animate: {
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },
};

const headerVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const messageSlideIn = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 28 },
  },
};

const chatPanelVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
};

// ─── Component ─────────────────────────────────────────────────────

export function MessagesView({ onNavigate, setProfileUserId }: MessagesViewProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();

  // Conversation list state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  // Chat state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ConversationUser | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // New message dialog state
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<SearchedUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isStartingConversation, setIsStartingConversation] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; content: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mobile state: show list or chat
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Refs
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetch conversations ────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/messages', {
        headers: { 'X-User-Id': currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        // Compute total unread from conversations
        const totalUnread = (data.conversations || []).reduce(
          (sum: number, c: ConversationItem) => sum + (c.unreadCount || 0),
          0
        );
        setUnreadCount(totalUnread);
      }
    } catch {
      // Silently fail
    }
  }, [currentUser]);

  const fetchUnreadCount = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/messages/unread-count', {
        headers: { 'X-User-Id': currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Silently fail
    }
  }, [currentUser]);

  // ─── Fetch messages with a user ─────────────────────────────────

  const fetchMessages = useCallback(
    async (targetUserId: string) => {
      if (!currentUser) return;
      setIsLoadingMessages(true);
      try {
        const res = await fetch(`/api/messages/${targetUserId}?limit=100`, {
          headers: { 'X-User-Id': currentUser.id },
        });
        if (res.ok) {
          const data = await res.json();
          // Messages come in desc order from API, reverse for display
          const sorted = [...(data.messages || [])].reverse();
          setMessages(sorted);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [currentUser]
  );

  // ─── Polling ────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedUserId || !currentUser) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages/${selectedUserId}?limit=100`, {
          headers: { 'X-User-Id': currentUser.id },
        });
        if (res.ok) {
          const data = await res.json();
          const sorted = [...(data.messages || [])].reverse();
          setMessages(sorted);
        }
      } catch {
        // Silently fail
      }
      // Also refresh conversations to update unread counts
      fetchConversations();
      fetchUnreadCount();
    }, 10000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [selectedUserId, currentUser, fetchConversations, fetchUnreadCount]);

  // ─── Initial load ───────────────────────────────────────────────

  useEffect(() => {
    if (!currentUser) return;

    const load = async () => {
      setIsLoadingConversations(true);
      await Promise.all([fetchConversations(), fetchUnreadCount()]);
      setIsLoadingConversations(false);
    };
    load();
  }, [currentUser, fetchConversations, fetchUnreadCount]);

  // ─── Auto-scroll to bottom ──────────────────────────────────────

  useEffect(() => {
    // Scroll after messages load
    const timer = setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, selectedUserId, isLoadingMessages]);

  // ─── Auto-resize textarea ───────────────────────────────────────

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [messageInput]);

  // ─── Select conversation ────────────────────────────────────────

  const handleSelectConversation = useCallback(
    (userId: string, user: ConversationUser) => {
      setSelectedUserId(userId);
      setSelectedUser(user);
      setMobileShowChat(true);
      setMessageInput('');
    },
    []
  );

  // ─── Back to conversation list (mobile) ─────────────────────────

  const handleBackToList = useCallback(() => {
    setMobileShowChat(false);
    setSelectedUserId(null);
    setSelectedUser(null);
    setMessages([]);
  }, []);

  // ─── Send message ───────────────────────────────────────────────

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!currentUser || !selectedUserId || !content.trim() || isSending) return;

      setIsSending(true);
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': currentUser.id,
          },
          body: JSON.stringify({
            receiverId: selectedUserId,
            content: content.trim(),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.message) {
            // Optimistically add message to local state
            const newMsg: MessageItem = {
              id: data.message.id,
              senderId: currentUser.id,
              content: data.message.content,
              isRead: false,
              createdAt: data.message.createdAt,
              sender: {
                id: currentUser.id,
                username: currentUser.username,
                displayName: currentUser.displayName || null,
                avatarUrl: currentUser.avatarUrl || null,
              },
            };
            setMessages((prev) => [...prev, newMsg]);
            setMessageInput('');

            // Refresh conversations list to update last message
            fetchConversations();
          }
        } else {
          const data = await res.json();
          toast({
            title: 'Failed to send',
            description: data.error || 'Something went wrong',
            variant: 'destructive',
          });
        }
      } catch {
        toast({
          title: 'Network error',
          description: 'Please check your connection',
          variant: 'destructive',
        });
      } finally {
        setIsSending(false);
      }
    },
    [currentUser, selectedUserId, isSending, toast, fetchConversations]
  );

  // ─── Delete message ─────────────────────────────────────────────

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!currentUser || isDeleting) return;

      setIsDeleting(true);
      try {
        const res = await fetch(`/api/messages/${messageId}`, {
          method: 'DELETE',
          headers: { 'X-User-Id': currentUser.id },
        });

        if (res.ok) {
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
          toast({
            title: 'Message deleted',
            description: 'The message has been removed',
          });
        } else {
          const data = await res.json();
          toast({
            title: 'Failed to delete',
            description: data.error || 'Something went wrong',
            variant: 'destructive',
          });
        }
      } catch {
        toast({
          title: 'Network error',
          description: 'Please check your connection',
          variant: 'destructive',
        });
      } finally {
        setIsDeleting(false);
        setDeleteTarget(null);
      }
    },
    [currentUser, isDeleting, toast]
  );

  // ─── Search users (for new message dialog) ──────────────────────

  const handleSearchUsers = useCallback(
    (query: string) => {
      setUserSearchQuery(query);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (!currentUser || query.length < 2) {
        setSearchedUsers([]);
        return;
      }

      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearchingUsers(true);
        try {
          const res = await fetch(
            `/api/users/search?q=${encodeURIComponent(query)}&limit=10`,
            { headers: { 'X-User-Id': currentUser.id } }
          );
          if (res.ok) {
            const data = await res.json();
            setSearchedUsers(data.users || []);
          }
        } catch {
          // Silently fail
        } finally {
          setIsSearchingUsers(false);
        }
      }, 300);
    },
    [currentUser]
  );

  // ─── Start conversation from new message dialog ─────────────────

  const handleStartConversation = useCallback(
    async (user: SearchedUser) => {
      setIsStartingConversation(true);
      try {
        const convUser: ConversationUser = {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          isVerified: user.isVerified,
        };
        setSelectedUserId(user.id);
        setSelectedUser(convUser);
        setIsNewMessageOpen(false);
        setUserSearchQuery('');
        setSearchedUsers([]);
        setMobileShowChat(true);
        setMessageInput('');
      } catch {
        // Silently fail
      } finally {
        setIsStartingConversation(false);
      }
    },
    []
  );

  // ─── Textarea key handler ───────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(messageInput);
      }
    },
    [messageInput, handleSendMessage]
  );

  // ─── Filter conversations ───────────────────────────────────────

  const filteredConversations = searchFilter
    ? conversations.filter((c) =>
        c.otherUser.username.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (c.otherUser.displayName && c.otherUser.displayName.toLowerCase().includes(searchFilter.toLowerCase()))
      )
    : conversations;

  // ─── Group messages by date ─────────────────────────────────────

  const groupedMessages: { dateLabel: string; messages: MessageItem[] }[] = [];
  let currentDateLabel = '';

  for (const msg of messages) {
    const label = getDateGroup(msg.createdAt);
    if (label !== currentDateLabel) {
      currentDateLabel = label;
      groupedMessages.push({ dateLabel: label, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  if (!currentUser) return null;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        variants={headerVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => onNavigate('dashboard')}
            className="shrink-0"
          >
            <span className="text-sm">Back to Dashboard</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-orange-500" />
              Messages
              {unreadCount > 0 && (
                <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 text-xs px-2 py-0.5">
                  {unreadCount}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              Direct messages with other users
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setIsNewMessageOpen(true)}
          className="gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">New Message</span>
        </Button>
      </motion.div>

      <QuickNav onNavigate={(v) => onNavigate(v as View)} activeView="messages" />

      {/* Main Layout */}
      <div className="flex flex-col md:flex-row gap-0 md:gap-4 mt-4 bg-card border rounded-xl overflow-hidden shadow-sm" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        {/* ─── Left Panel: Conversation List ─── */}
        <div
          className={`w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r flex flex-col ${
            mobileShowChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search conversations */}
          <div className="p-3 border-b">
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations ? (
              <div className="divide-y">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <Skeleton className="h-3 w-10 shrink-0" />
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
                <p className="text-xs text-muted-foreground/70 text-center max-w-[200px] mb-3">
                  {searchFilter
                    ? 'Try a different search term'
                    : 'Start a conversation with another user'}
                </p>
                {!searchFilter && (
                  <Button
                    size="sm"
                    onClick={() => setIsNewMessageOpen(true)}
                    className="gap-1.5 text-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  >
                    <UserPlus className="w-3 h-3" />
                    Start a conversation
                  </Button>
                )}
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="initial"
                animate="animate"
                className="divide-y"
              >
                {filteredConversations.map((conv) => {
                  const isActive = selectedUserId === conv.otherUser.id;
                  const isUnread = conv.unreadCount > 0;

                  return (
                    <motion.button
                      key={conv.otherUser.id}
                      variants={itemVariants}
                      onClick={() =>
                        handleSelectConversation(conv.otherUser.id, conv.otherUser)
                      }
                      className={`w-full text-left flex items-center gap-3 px-3 py-3 transition-colors cursor-pointer group relative ${
                        isActive
                          ? 'bg-orange-50 dark:bg-orange-950/30 border-l-[3px] border-l-orange-500'
                          : isUnread
                            ? 'bg-orange-50/40 dark:bg-orange-950/15 hover:bg-orange-50/70 dark:hover:bg-orange-950/25'
                            : 'hover:bg-muted/50'
                      }`}
                    >
                      {/* Avatar */}
                      <Avatar className="w-10 h-10 h-10 shrink-0">
                        {conv.otherUser.avatarUrl ? (
                          <AvatarImage
                            src={conv.otherUser.avatarUrl}
                            alt={conv.otherUser.displayName || conv.otherUser.username}
                          />
                        ) : null}
                        <AvatarFallback
                          className={`bg-gradient-to-br ${getAvatarGradient(conv.otherUser.id)} text-white text-xs font-bold`}
                        >
                          {getInitials(conv.otherUser.username)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm truncate ${
                              isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground'
                            }`}
                          >
                            {conv.otherUser.displayName || conv.otherUser.username}
                          </p>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {getRelativeTime(conv.lastMessage.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p
                            className={`text-xs truncate ${
                              isUnread ? 'text-foreground/70 font-medium' : 'text-muted-foreground'
                            }`}
                          >
                            {truncate(conv.lastMessage.content, 40)}
                          </p>
                          {isUnread && (
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold shrink-0">
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

        {/* ─── Right Panel: Chat Area ─── */}
        <div
          className={`flex-1 flex flex-col ${
            mobileShowChat ? 'flex' : 'hidden md:flex'
          }`}
        >
          <AnimatePresence mode="wait">
            {selectedUserId && selectedUser ? (
              <motion.div
                key={selectedUserId}
                variants={chatPanelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col h-full"
              >
                {/* Chat Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
                  {/* Back button (mobile) */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden shrink-0 h-8 w-8"
                    onClick={handleBackToList}
                  >
                    <span className="text-xs font-medium px-1">Back</span>
                  </Button>

                  {/* Avatar */}
                  <Avatar className="w-9 h-9 shrink-0 cursor-pointer"
                    onClick={() => {
                      setProfileUserId(selectedUser.id);
                      onNavigate('profile');
                    }}
                  >
                    {selectedUser.avatarUrl ? (
                      <AvatarImage
                        src={selectedUser.avatarUrl}
                        alt={selectedUser.displayName || selectedUser.username}
                      />
                    ) : null}
                    <AvatarFallback
                      className={`bg-gradient-to-br ${getAvatarGradient(selectedUser.id)} text-white text-xs font-bold`}
                    >
                      {getInitials(selectedUser.username)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      setProfileUserId(selectedUser.id);
                      onNavigate('profile');
                    }}
                  >
                    <p className="text-sm font-semibold truncate">
                      {selectedUser.displayName || selectedUser.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{selectedUser.username}
                    </p>
                  </div>

                  {/* Follow button */}
                  <FollowButton
                    targetUserId={selectedUser.id}
                    variant="compact"
                    size="sm"
                  />
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1 overflow-hidden">
                  <div className="px-4 py-4 space-y-1">
                    {isLoadingMessages ? (
                      <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
                          >
                            <Skeleton
                              className={`h-12 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-56'}`}
                            />
                          </div>
                        ))}
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 px-4">
                        <Avatar className="w-16 h-16 mb-3">
                          {selectedUser.avatarUrl ? (
                            <AvatarImage
                              src={selectedUser.avatarUrl}
                              alt={selectedUser.displayName || selectedUser.username}
                            />
                          ) : null}
                          <AvatarFallback
                            className={`bg-gradient-to-br ${getAvatarGradient(selectedUser.id)} text-white text-lg font-bold`}
                          >
                            {getInitials(selectedUser.username)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium">{selectedUser.displayName || selectedUser.username}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Send a message to start the conversation
                        </p>
                      </div>
                    ) : (
                      <>
                        {groupedMessages.map((group) => (
                          <div key={group.dateLabel}>
                            {/* Date separator */}
                            <div className="flex items-center gap-3 py-3">
                              <Separator className="flex-1" />
                              <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                                {group.dateLabel}
                              </span>
                              <Separator className="flex-1" />
                            </div>

                            {/* Messages in this group */}
                            {group.messages.map((msg, idx) => {
                              const isMine = msg.senderId === currentUser.id;
                              const showAvatar =
                                !isMine &&
                                (idx === 0 || group.messages[idx - 1].senderId !== msg.senderId);

                              return (
                                <motion.div
                                  key={msg.id}
                                  variants={messageSlideIn}
                                  initial="initial"
                                  animate="animate"
                                  className={`flex gap-2 mb-1 group/msg ${
                                    isMine ? 'justify-end' : 'justify-start'
                                  }`}
                                >
                                  {/* Avatar for received messages */}
                                  {!isMine && (
                                    <div className="w-7 shrink-0 mt-auto">
                                      {showAvatar && (
                                        <Avatar className="w-7 h-7">
                                          {msg.sender.avatarUrl ? (
                                            <AvatarImage
                                              src={msg.sender.avatarUrl}
                                              alt={msg.sender.username}
                                            />
                                          ) : null}
                                          <AvatarFallback
                                            className={`bg-gradient-to-br ${getAvatarGradient(msg.sender.id)} text-white text-[10px] font-bold`}
                                          >
                                            {getInitials(msg.sender.username)}
                                          </AvatarFallback>
                                        </Avatar>
                                      )}
                                    </div>
                                  )}

                                  {/* Message bubble */}
                                  <div className="relative max-w-[75%]">
                                    <div
                                      className={`px-3.5 py-2 rounded-2xl relative ${
                                        isMine
                                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-br-md'
                                          : 'bg-muted text-foreground rounded-bl-md'
                                      }`}
                                    >
                                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                        {msg.content}
                                      </p>
                                    </div>

                                    {/* Meta row: time + read status */}
                                    <div
                                      className={`flex items-center gap-1.5 mt-0.5 mb-1 ${
                                        isMine ? 'justify-end' : 'justify-start'
                                      }`}
                                    >
                                      <span
                                        className={`text-[10px] ${
                                          isMine ? 'text-orange-400/70' : 'text-muted-foreground/60'
                                        }`}
                                      >
                                        {formatMessageTime(msg.createdAt)}
                                      </span>

                                      {/* Read status for sent messages */}
                                      {isMine && (
                                        msg.isRead ? (
                                          <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                                        ) : (
                                          <CheckCheck className="w-3.5 h-3.5 text-orange-400/50" />
                                        )
                                      )}
                                    </div>

                                    {/* Delete button on hover */}
                                    {isMine && (
                                      <button
                                        onClick={() =>
                                          setDeleteTarget({
                                            id: msg.id,
                                            content: truncate(msg.content, 30),
                                          })
                                        }
                                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-background border shadow-sm flex items-center justify-center opacity-0 group-hover/msg:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-950/50"
                                        aria-label="Delete message"
                                      >
                                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-500" />
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  <div ref={messageEndRef} />
                </ScrollArea>

                {/* Message Input */}
                <div className="border-t p-3 shrink-0 bg-background">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={textareaRef}
                        value={messageInput}
                        onChange={(e) => {
                          if (e.target.value.length <= 2000) {
                            setMessageInput(e.target.value);
                          }
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full resize-none rounded-xl border bg-muted/30 px-4 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 placeholder:text-muted-foreground/60 min-h-[40px] max-h-[120px] overflow-y-auto"
                      />
                      {/* Character count */}
                      {messageInput.length > 0 && (
                        <span
                          className={`absolute bottom-1.5 right-3 text-[10px] ${
                            messageInput.length > 1800
                              ? messageInput.length >= 2000
                                ? 'text-red-500 font-bold'
                                : 'text-amber-500'
                              : 'text-muted-foreground/40'
                          }`}
                        >
                          {messageInput.length}/2000
                        </span>
                      )}
                    </div>
                    <Button
                      size="icon"
                      disabled={!messageInput.trim() || isSending}
                      onClick={() => handleSendMessage(messageInput)}
                      className={`shrink-0 h-10 w-10 rounded-xl transition-all ${
                        messageInput.trim()
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/40 mt-1.5 text-center">
                    Press Enter to send, Shift+Enter for a new line
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty-chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center px-4"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/40 dark:to-amber-950/40 flex items-center justify-center mb-4">
                  <MessageSquare className="w-10 h-10 text-orange-300 dark:text-orange-700" />
                </div>
                <p className="text-base font-medium text-muted-foreground mb-1">
                  Select a conversation
                </p>
                <p className="text-sm text-muted-foreground/70 text-center max-w-xs">
                  Choose a conversation from the list or start a new one to begin messaging
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── New Message Dialog ────────────────────────────────────── */}
      <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              Search for a user to start a conversation with.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by username or name..."
                value={userSearchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="pl-9"
                autoFocus
              />
              {userSearchQuery && (
                <button
                  onClick={() => {
                    setUserSearchQuery('');
                    setSearchedUsers([]);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search results */}
            <div className="max-h-64 overflow-y-auto">
              {isSearchingUsers ? (
                <div className="space-y-2 py-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-2">
                      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : userSearchQuery.length >= 2 && searchedUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No users found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Try a different search term
                  </p>
                </div>
              ) : searchedUsers.length > 0 ? (
                <div className="divide-y">
                  {searchedUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleStartConversation(user)}
                      disabled={isStartingConversation}
                      className="w-full flex items-center gap-3 px-2 py-2.5 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Avatar className="w-9 h-9 shrink-0">
                        {user.avatarUrl ? (
                          <AvatarImage
                            src={user.avatarUrl}
                            alt={user.displayName || user.username}
                          />
                        ) : null}
                        <AvatarFallback
                          className={`bg-gradient-to-br ${getAvatarGradient(user.id)} text-white text-xs font-bold`}
                        >
                          {getInitials(user.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{user.username}
                        </p>
                      </div>
                      <Send className="w-4 h-4 text-orange-400 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserPlus className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Type at least 2 characters to search
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.content}&quot;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) handleDeleteMessage(deleteTarget.id);
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

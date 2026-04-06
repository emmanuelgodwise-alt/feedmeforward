'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageBubble } from './message-bubble';
import { Phone, Video, Send, ArrowLeft, X, Reply, Loader2, Smile } from 'lucide-react';
import { useChatStore, type MessageItem, type ConversationDetail } from '@/stores/chat-store';

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

// ─── Props ───────────────────────────────────────────────────────

interface ChatViewProps {
  conversation: ConversationDetail;
  currentUserId: string;
  onBack: () => void;
  onStartCall: (type: 'voice' | 'video') => void;
  onNavigateProfile: (userId: string) => void;
}

// ─── Component ───────────────────────────────────────────────────

export function ChatView({
  conversation,
  currentUserId,
  onBack,
  onStartCall,
  onNavigateProfile,
}: ChatViewProps) {
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isGroup = conversation.type === 'group';

  const conversationName = conversation.name ||
    (conversation.members.length === 2
      ? (conversation.members.find(m => m.id !== currentUserId)?.displayName ||
         conversation.members.find(m => m.id !== currentUserId)?.username || 'Chat')
      : 'Group Chat');

  const otherMember = conversation.members.find(m => m.id !== currentUserId);

  // Auto-scroll
  useEffect(() => {
    const timer = setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [conversation.messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [messageInput]);

  // Mark as read
  useEffect(() => {
    useChatStore.getState().markAsRead(conversation.id, currentUserId);
  }, [conversation.id, currentUserId]);

  const handleSend = useCallback(async () => {
    if (!messageInput.trim() || isSending) return;

    setIsSending(true);
    const content = messageInput.trim();
    setMessageInput('');

    const msg = await useChatStore.getState().sendMessage(
      conversation.id,
      {
        type: 'text',
        content,
        replyToId: replyingTo?.id,
      },
      currentUserId
    );

    if (msg) {
      useChatStore.getState().addMessageLocally(msg);
      useChatStore.getState().updateConversationInList(conversation.id, {
        lastMessage: content,
        lastActivityAt: new Date().toISOString(),
      });
    }
    setReplyingTo(null);
    setIsSending(false);
  }, [messageInput, isSending, conversation.id, currentUserId, replyingTo]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleReply = useCallback((message: MessageItem) => {
    setReplyingTo(message);
  }, []);

  // Group messages by date
  const groupedMessages: { dateLabel: string; messages: MessageItem[] }[] = [];
  let currentDateLabel = '';
  for (const msg of conversation.messages) {
    const label = getDateGroup(msg.createdAt);
    if (label !== currentDateLabel) {
      currentDateLabel = label;
      groupedMessages.push({ dateLabel: label, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-8 w-8" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <Avatar
          className="w-9 h-9 shrink-0 cursor-pointer"
          onClick={() => otherMember && onNavigateProfile(otherMember.id)}
        >
          {conversation.avatarUrl && <AvatarImage src={conversation.avatarUrl} />}
          {otherMember?.avatarUrl && <AvatarImage src={otherMember.avatarUrl} />}
          <AvatarFallback
            className={`bg-gradient-to-br ${getAvatarGradient(conversation.id)} text-white text-xs font-bold`}
          >
            {getInitials(conversationName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{conversationName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {isGroup
              ? `${conversation.members.length} members`
              : otherMember
                ? `@${otherMember.username}`
                : 'Direct message'}
          </p>
        </div>

        {/* Call buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-orange-600 hover:bg-orange-50"
            onClick={() => onStartCall('voice')}
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-orange-600 hover:bg-orange-50"
            onClick={() => onStartCall('video')}
          >
            <Video className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Reply preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 border-b bg-orange-50/50 dark:bg-orange-950/20"
          >
            <div className="flex items-center gap-2 text-sm">
              <Reply className="w-3.5 h-3.5 text-orange-500 rotate-180 shrink-0" />
              <span className="text-muted-foreground text-xs font-medium truncate">
                Replying to {replyingTo.sender.displayName || replyingTo.sender.username}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                — {replyingTo.content || '...'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 ml-auto"
                onClick={() => setReplyingTo(null)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="px-4 py-4 space-y-1">
          {groupedMessages.map((group) => (
            <div key={group.dateLabel}>
              <div className="flex items-center gap-3 py-3">
                <Separator className="flex-1" />
                <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                  {group.dateLabel}
                </span>
                <Separator className="flex-1" />
              </div>

              {group.messages.map((msg, idx) => {
                const isOwn = msg.senderId === currentUserId;
                const showAvatar =
                  !isOwn &&
                  (idx === 0 || group.messages[idx - 1].senderId !== msg.senderId);

                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={isOwn}
                    showSender={showAvatar}
                    isGroup={isGroup}
                    onReply={handleReply}
                  />
                );
              })}
            </div>
          ))}
          <div ref={messageEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-3 shrink-0">
        <div className="flex items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-orange-500"
          >
            <Smile className="w-5 h-5" />
          </Button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full resize-none rounded-xl bg-muted border-none px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50 min-h-[36px] max-h-[120px]"
            />
          </div>

          <Button
            size="icon"
            className="h-9 w-9 shrink-0 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm disabled:opacity-50"
            onClick={handleSend}
            disabled={!messageInput.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

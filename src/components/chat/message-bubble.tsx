'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { MessageItem } from '@/stores/chat-store';
import { CheckCheck, Reply } from 'lucide-react';

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

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatSystemMessage(content: string): string {
  try {
    const data = JSON.parse(content);
    if (data.action === 'member_added') {
      return `${data.username} was added to the group by ${data.addedBy}`;
    }
    if (data.action === 'member_removed') {
      return `${data.username} was removed from the group`;
    }
    return content;
  } catch {
    return content;
  }
}

// ─── Props ───────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: MessageItem;
  isOwn: boolean;
  showSender: boolean;
  isGroup: boolean;
  onReply?: (message: MessageItem) => void;
}

// ─── Component ───────────────────────────────────────────────────

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
  showSender,
  isGroup,
  onReply,
}: MessageBubbleProps) {
  // System messages
  if (message.type === 'system') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center py-1"
      >
        <span className="text-[11px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
          {formatSystemMessage(message.content || '')}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex gap-2 mb-1 group/msg ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar */}
      {!isOwn && (
        <div className="w-7 shrink-0 mt-auto">
          {showSender && isGroup && (
            <Avatar className="w-7 h-7">
              {message.sender.avatarUrl && <AvatarImage src={message.sender.avatarUrl} />}
              <AvatarFallback
                className={`bg-gradient-to-br ${getAvatarGradient(message.senderId)} text-white text-[10px] font-bold`}
              >
                {getInitials(message.sender.username)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className="relative max-w-[75%] min-w-[80px]">
        {/* Sender name in group */}
        {showSender && !isOwn && isGroup && (
          <p className="text-[11px] text-muted-foreground font-medium mb-0.5 ml-1">
            {message.sender.displayName || message.sender.username}
          </p>
        )}

        {/* Reply reference */}
        {message.replyTo && (
          <button
            onClick={() => onReply?.(message)}
            className="flex items-center gap-1 mb-1 ml-1 text-left"
          >
            <Reply className="w-3 h-3 text-muted-foreground rotate-180 shrink-0" />
            <span className="text-[11px] text-muted-foreground bg-muted/40 rounded-md px-2 py-0.5 truncate max-w-[200px] border-l-2 border-orange-400">
              {message.replyTo.content || '...'}
            </span>
          </button>
        )}

        {/* Bubble */}
        <div
          className={`px-3.5 py-2 rounded-2xl relative ${
            isOwn
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
          }`}
        >
          {/* Content */}
          {message.type === 'text' && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {message.type === 'image' && message.mediaUrl && (
            <div className="space-y-1">
              <img
                src={message.mediaUrl}
                alt="Shared image"
                className="rounded-lg max-w-full max-h-64 object-cover"
              />
              {message.content && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          )}

          {message.type === 'voice' && message.mediaUrl && (
            <div className="flex items-center gap-2 min-w-[180px]">
              <audio src={message.mediaUrl} controls className="h-8 max-w-full" />
            </div>
          )}

          {(message.type === 'file') && message.mediaUrl && (
            <div className="flex items-center gap-2">
              <a
                href={message.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm underline underline-offset-2 ${isOwn ? 'text-white/90 hover:text-white' : 'text-primary'}`}
              >
                📎 {message.content || 'File'}
              </a>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className={`flex items-center gap-1.5 mt-0.5 mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] ${isOwn ? 'text-orange-400/70' : 'text-muted-foreground/60'}`}>
            {formatTime(message.createdAt)}
          </span>
          {isOwn && (
            message.isRead
              ? <CheckCheck className="w-3.5 h-3.5 text-green-400" />
              : <CheckCheck className="w-3.5 h-3.5 text-orange-400/50" />
          )}
        </div>

        {/* Reply button on hover */}
        {!isOwn && (
          <button
            onClick={() => onReply?.(message)}
            className="absolute -top-1 left-2 w-6 h-6 rounded-full bg-background border shadow-sm flex items-center justify-center opacity-0 group-hover/msg:opacity-100 transition-opacity hover:bg-muted"
            aria-label="Reply"
          >
            <Reply className="w-3 h-3 text-muted-foreground rotate-180" />
          </button>
        )}
      </div>
    </motion.div>
  );
});

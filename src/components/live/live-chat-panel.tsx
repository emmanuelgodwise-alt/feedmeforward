'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  content: string;
  createdAt: string;
  type?: string;
}

interface LiveChatPanelProps {
  sessionId: string;
  isCreator?: boolean;
}

export function LiveChatPanel({ sessionId, isCreator }: LiveChatPanelProps) {
  const { currentUser } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/live/sessions/${sessionId}/chat?limit=50`);
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages);
        }
      } catch {
        // ignore
      }
    };
    fetchMessages();
  }, [sessionId]);

  // Set up SSE for real-time messages
  useEffect(() => {
    if (!currentUser) return;

    const eventSource = new EventSource(
      `/api/live/sessions/${sessionId}/sse?userId=${currentUser.id}`
    );

    eventSource.addEventListener('chat', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'system') {
          setMessages(prev => [...prev, data]);
        } else {
          // Fetch the latest message to get full data
          setMessages(prev => {
            // Check if already added
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, data];
          });
        }
      } catch {
        // ignore parse error
      }
    });

    return () => {
      eventSource.close();
    };
  }, [sessionId, currentUser]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending || !currentUser) return;
    setSending(true);
    try {
      const res = await fetch(`/api/live/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify({ content: input.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setInput('');
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  }, [input, sending, currentUser, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b bg-white dark:bg-gray-800 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Live Chat</h3>
        <span className="text-xs text-muted-foreground">{messages.length} messages</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[300px] md:max-h-[400px] lg:max-h-[500px] custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs py-8">
            No messages yet. Be the first to say hi!
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="text-center text-xs text-muted-foreground py-1 italic">
                  {msg.content}
                </div>
              );
            }
            const isOwn = msg.userId === currentUser?.id;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="w-6 h-6 shrink-0">
                  <AvatarImage src={msg.avatarUrl || undefined} />
                  <AvatarFallback className="text-[9px] bg-gradient-to-br from-orange-400 to-amber-500 text-white">
                    {msg.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[75%] ${isOwn ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {msg.displayName || msg.username}
                    </span>
                  </div>
                  <div
                    className={`inline-block rounded-lg px-2.5 py-1.5 text-xs ${
                      isOwn
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-tr-none'
                        : 'bg-white dark:bg-gray-800 border rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentUser ? 'Send a message...' : 'Sign in to chat'}
            disabled={!currentUser || sending}
            className="text-xs h-8"
            maxLength={500}
          />
          <Button
            size="sm"
            onClick={sendMessage}
            disabled={!input.trim() || sending || !currentUser}
            className="h-8 w-8 p-0 shrink-0 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

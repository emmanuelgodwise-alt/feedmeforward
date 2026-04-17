'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare,
  Send,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore, type ConversationItem, type ConversationDetail } from '@/stores/chat-store';
import { useRealtimeStore } from '@/stores/realtime-store';
import { useRealtime } from '@/hooks/use-realtime';
import { ConversationList } from '@/components/chat/conversation-list';
import { ChatView } from '@/components/chat/chat-view';
import { NewConversationDialog } from '@/components/chat/new-conversation-dialog';
import { VoiceCallUI, IncomingCallDialog } from '@/components/chat/voice-call-ui';
import { VideoCallUI } from '@/components/chat/video-call-ui';
import { FollowButton } from '@/components/follow-button';
import { useToast } from '@/hooks/use-toast';
import type { View } from '@/app/page';

// ─── Types ───────────────────────────────────────────────────────

interface MessagesViewProps {
  onNavigate: (view: string) => void;
  setProfileUserId: (id: string) => void;
}

// ─── Component ───────────────────────────────────────────────────

export function MessagesView({ onNavigate, setProfileUserId }: MessagesViewProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const { isConnected } = useRealtimeStore();

  useRealtime();

  const {
    conversations,
    isLoading,
    currentConversation,
    isMessagesLoading,
    activeCall,
    incomingCall,
    fetchConversations,
    fetchConversation,
    startCall,
    answerCall,
    setActiveCall,
    setIncomingCall,
  } = useChatStore();

  // State
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  // Computed from conversations

  // ─── Initial load ──────────────────────────────────────────────

  useEffect(() => {
    if (!currentUser) return;
    fetchConversations(currentUser.id);
  }, [currentUser, fetchConversations]);

  // ─── Polling ────────────────────────────────────────────────────

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!currentUser || !currentConversation) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = setInterval(async () => {
      await fetchConversation(currentConversation.id, currentUser.id);
      await fetchConversations(currentUser.id);
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [currentUser, currentConversation, fetchConversation, fetchConversations]);

  // ─── Compute total unread ───────────────────────────────────────

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  // ─── Select conversation ────────────────────────────────────────

  const handleSelectConversation = useCallback(async (conv: ConversationItem) => {
    if (!currentUser) return;
    setMobileShowChat(true);
    await fetchConversation(conv.id, currentUser.id);
  }, [currentUser, fetchConversation]);

  // ─── Back to list (mobile) ──────────────────────────────────────

  const handleBackToList = useCallback(() => {
    setMobileShowChat(false);
    useChatStore.getState().clearCurrentConversation();
  }, []);

  // ─── Start call ────────────────────────────────────────────────

  const handleStartCall = useCallback(async (type: 'voice' | 'video') => {
    if (!currentUser || !currentConversation) return;
    const call = await startCall(currentConversation.id, type, currentUser.id);
    if (call) {
      toast({
        title: `${type === 'voice' ? 'Voice' : 'Video'} call started`,
        description: 'Connecting...',
      });
    } else {
      toast({
        title: 'Call failed',
        description: 'Could not start call',
        variant: 'destructive',
      });
    }
  }, [currentUser, currentConversation, startCall, toast]);

  // ─── Answer incoming call ──────────────────────────────────────

  const handleAnswerCall = useCallback(async () => {
    if (!currentUser || !incomingCall) return;
    const success = await answerCall(incomingCall.callId, incomingCall.type, currentUser.id);
    if (success) {
      setActiveCall({ ...incomingCall, isIncoming: false, status: 'ongoing' });
    }
    setIncomingCall(null);
  }, [currentUser, incomingCall, answerCall, setActiveCall, setIncomingCall]);

  // ─── Reject incoming call ──────────────────────────────────────

  const handleRejectCall = useCallback(() => {
    if (!currentUser || !incomingCall) return;
    useChatStore.getState().endCall(incomingCall.callId, incomingCall.type, currentUser.id);
    setIncomingCall(null);
  }, [currentUser, incomingCall, setIncomingCall]);

  // ─── Navigate to profile ───────────────────────────────────────

  const handleNavigateProfile = useCallback((userId: string) => {
    setProfileUserId(userId);
    onNavigate('profile');
  }, [setProfileUserId, onNavigate]);

  if (!currentUser) return null;

  // Recipient info for call UIs
  const recipientId = currentConversation?.members?.find((m) => m.id !== currentUser.id)?.id;
  const recipient = currentConversation?.members?.find((m) => m.id !== currentUser.id);
  const otherMember = conversations.find((c) => c.id === currentConversation?.id)?.otherUser;

  return (
    <div className="min-h-screen px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="shrink-0">
            <span className="text-sm">Back to Dashboard</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-orange-500" />
              Messages
              {unreadTotal > 0 && (
                <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 text-xs px-2 py-0.5">
                  {unreadTotal}
                </Badge>
              )}
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`} />
                <span className={`text-[11px] font-medium ${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">Conversations with other users</p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setIsNewMessageOpen(true)}
          className="gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">New Chat</span>
        </Button>
      </motion.div>


      {/* Main Layout */}
      <div
        className="flex flex-col md:flex-row gap-0 md:gap-4 mt-4 bg-card border rounded-xl overflow-hidden shadow-sm"
        style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}
      >
        {/* Left Panel: Conversation List */}
        <div
          className={`w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r flex flex-col ${
            mobileShowChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ConversationList
            conversations={conversations}
            isLoading={isLoading}
            activeConversationId={currentConversation?.id || null}
            onSelectConversation={handleSelectConversation}
            onNewMessage={() => setIsNewMessageOpen(true)}
          />
        </div>

        {/* Right Panel: Chat Area */}
        <div className={`flex-1 flex flex-col ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}>
          <AnimatePresence mode="wait">
            {currentConversation ? (
              <motion.div
                key={currentConversation.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                {isMessagesLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ChatView
                    conversation={currentConversation}
                    currentUserId={currentUser.id}
                    onBack={handleBackToList}
                    onStartCall={handleStartCall}
                    onNavigateProfile={handleNavigateProfile}
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center px-4"
              >
                <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Your Messages</h3>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  Select a conversation to start chatting, or create a new one
                </p>
                <Button
                  className="mt-4 gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  onClick={() => setIsNewMessageOpen(true)}
                >
                  <Send className="w-4 h-4" />
                  Start a conversation
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* New Conversation Dialog */}
      <NewConversationDialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen} />

      {/* Active Voice Call UI */}
      <AnimatePresence>
        {activeCall?.type === 'voice' && !activeCall.isIncoming && (
          <VoiceCallUI
            call={activeCall}
            recipientName={recipient?.displayName || otherMember?.displayName || undefined}
            recipientAvatar={recipient?.avatarUrl || otherMember?.avatarUrl || undefined}
            recipientId={recipientId || otherMember?.id}
          />
        )}
      </AnimatePresence>

      {/* Active Video Call UI */}
      <AnimatePresence>
        {activeCall?.type === 'video' && !activeCall.isIncoming && (
          <VideoCallUI
            call={activeCall}
            recipientName={recipient?.displayName || otherMember?.displayName || undefined}
            recipientAvatar={recipient?.avatarUrl || otherMember?.avatarUrl || undefined}
            recipientId={recipientId || otherMember?.id}
          />
        )}
      </AnimatePresence>

      {/* Incoming Call Dialog */}
      <AnimatePresence>
        {incomingCall && (
          <IncomingCallDialog
            call={incomingCall}
            onAccept={handleAnswerCall}
            onReject={handleRejectCall}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

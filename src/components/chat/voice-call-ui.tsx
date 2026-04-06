'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';
import { useChatStore, type ActiveCall } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';

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

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ─── Voice Call UI ──────────────────────────────────────────────

interface VoiceCallUIProps {
  call: ActiveCall;
  recipientName?: string;
  recipientAvatar?: string | null;
  recipientId?: string;
}

export function VoiceCallUI({ call, recipientName, recipientAvatar, recipientId }: VoiceCallUIProps) {
  const { currentUser } = useAuthStore();
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(call.isMuted);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (call.status === 'ongoing') {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [call.status]);

  const handleEndCall = useCallback(async () => {
    if (!currentUser) return;
    await useChatStore.getState().endCall(call.callId, call.type, currentUser.id);
  }, [call.callId, call.type, currentUser]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    useChatStore.getState().setActiveCall({ ...call, isMuted: !isMuted });
  }, [call, isMuted]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-950"
    >
      <div className="flex flex-col items-center gap-8 px-4">
        {/* Animated rings */}
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 w-32 h-32 rounded-full bg-orange-500/20 -m-4"
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.05, 0.2] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
            className="absolute inset-0 w-40 h-40 rounded-full bg-orange-500/10 -m-8"
          />

          <Avatar className="w-24 h-24 border-4 border-orange-500/30 relative z-10">
            {recipientAvatar && <AvatarImage src={recipientAvatar} />}
            <AvatarFallback
              className={`bg-gradient-to-br ${getAvatarGradient(recipientId || 'default')} text-white text-2xl font-bold`}
            >
              {getInitials(recipientName || 'User')}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Info */}
        <div className="text-center">
          <h2 className="text-white text-xl font-semibold">
            {recipientName || 'Unknown User'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {call.status === 'ringing' ? (
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                Calling...
              </motion.span>
            ) : call.status === 'ongoing' ? (
              formatDuration(duration)
            ) : (
              'Call ended'
            )}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="icon"
            className={`w-14 h-14 rounded-full ${
              isMuted
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            onClick={handleToggleMute}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={`w-14 h-14 rounded-full ${
              isSpeakerOn
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
            onClick={() => setIsSpeakerOn((p) => !p)}
          >
            <Volume2 className="w-6 h-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-16 h-16 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30"
            onClick={handleEndCall}
          >
            <PhoneOff className="w-7 h-7" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Incoming Call Dialog ────────────────────────────────────────

interface IncomingCallDialogProps {
  call: ActiveCall;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallDialog({ call, onAccept, onReject }: IncomingCallDialogProps) {
  return (
    <Dialog open={true} onOpenChange={() => onReject()}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>Incoming {call.type} Call</DialogTitle>
          <DialogDescription>
            {call.callerInfo?.displayName || call.callerInfo?.username || 'Unknown user'} is calling you
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center my-4">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="relative"
          >
            <Avatar className="w-20 h-20 border-4 border-green-500/30">
              {call.callerInfo?.avatarUrl && <AvatarImage src={call.callerInfo.avatarUrl} />}
              <AvatarFallback
                className={`bg-gradient-to-br ${getAvatarGradient(call.callerInfo?.id || 'default')} text-white text-xl font-bold`}
              >
                {getInitials(call.callerInfo?.displayName || call.callerInfo?.username || 'U')}
              </AvatarFallback>
            </Avatar>
          </motion.div>
        </div>

        <div className="flex items-center justify-center gap-6">
          <Button
            size="icon"
            className="w-14 h-14 rounded-full bg-green-500 text-white hover:bg-green-600"
            onClick={onAccept}
          >
            <Phone className="w-6 h-6" />
          </Button>
          <Button
            size="icon"
            className="w-14 h-14 rounded-full bg-red-500 text-white hover:bg-red-600"
            onClick={onReject}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

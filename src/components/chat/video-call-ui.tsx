'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, MicOff, Camera, CameraOff, MonitorUp } from 'lucide-react';
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

// ─── Video Call UI ──────────────────────────────────────────────

interface VideoCallUIProps {
  call: ActiveCall;
  recipientName?: string;
  recipientAvatar?: string | null;
  recipientId?: string;
}

export function VideoCallUI({ call, recipientName, recipientAvatar, recipientId }: VideoCallUIProps) {
  const { currentUser } = useAuthStore();
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(call.isMuted);
  const [isCameraOff, setIsCameraOff] = useState(call.isCameraOff);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (call.status === 'ongoing') {
      timerRef.current = setInterval(() => setDuration((p) => p + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [call.status]);

  // WebRTC setup
  useEffect(() => {
    if (call.status !== 'ongoing' || !currentUser) return;

    let cancelled = false;

    const setupWebRTC = async () => {
      try {
        // Get local media
        const localStream = await navigator.mediaDevices.getUserMedia({
          video: !isCameraOff,
          audio: !isMuted,
        });
        if (cancelled) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = localStream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        // Create peer connection
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peerConnectionRef.current = pc;

        // Add local tracks
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });

        // Handle remote stream
        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // ICE candidate
        pc.onicecandidate = async (event) => {
          if (event.candidate && currentUser) {
            await useChatStore.getState().sendSignal({
              callId: call.callId,
              callType: 'video',
              signalType: 'ice-candidate',
              content: JSON.stringify(event.candidate),
            });
          }
        };

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await useChatStore.getState().sendSignal({
          callId: call.callId,
          callType: 'video',
          signalType: 'offer',
          content: JSON.stringify(offer),
        });

        // Poll for signals
        const lastSignalTime = new Date().toISOString();
        signalPollRef.current = setInterval(async () => {
          if (!currentUser) return;
          const signals = await useChatStore.getState().pollSignals(
            call.callId,
            'video',
            currentUser.id,
            lastSignalTime
          );

          for (const signal of signals) {
            const s = signal as { signalType: string; content: string };
            if (s.signalType === 'answer') {
              const answer = JSON.parse(s.content);
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
            } else if (s.signalType === 'ice-candidate') {
              const candidate = JSON.parse(s.content);
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
        }, 2000);
      } catch (error) {
        console.error('WebRTC setup error:', error);
      }
    };

    setupWebRTC();

    return () => {
      cancelled = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (signalPollRef.current) {
        clearInterval(signalPollRef.current);
      }
    };
  }, [call.status, call.callId, currentUser]);

  const handleEndCall = useCallback(async () => {
    if (!currentUser) return;
    // Clean up
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (signalPollRef.current) {
      clearInterval(signalPollRef.current);
    }
    await useChatStore.getState().endCall(call.callId, call.type, currentUser.id);
  }, [call.callId, call.type, currentUser]);

  const handleToggleMute = useCallback(() => {
    const newVal = !isMuted;
    setIsMuted(newVal);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !newVal));
    }
    useChatStore.getState().setActiveCall({ ...call, isMuted: newVal });
  }, [call, isMuted]);

  const handleToggleCamera = useCallback(() => {
    const newVal = !isCameraOff;
    setIsCameraOff(newVal);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !newVal));
    }
    useChatStore.getState().setActiveCall({ ...call, isCameraOff: newVal });
  }, [call, isCameraOff]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gray-950 flex flex-col"
    >
      {/* Remote Video (full screen) */}
      <div className="flex-1 relative bg-gray-900">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Fallback when no remote video */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-white/20">
              {recipientAvatar && <AvatarImage src={recipientAvatar} />}
              <AvatarFallback
                className={`bg-gradient-to-br ${getAvatarGradient(recipientId || 'default')} text-white text-2xl font-bold`}
              >
                {getInitials(recipientName || 'User')}
              </AvatarFallback>
            </Avatar>
            <p className="text-white text-lg font-medium">{recipientName || 'User'}</p>
            <p className="text-gray-400 text-sm mt-1">
              {call.status === 'ringing' ? (
                <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                  Calling...
                </motion.span>
              ) : call.status === 'ongoing' ? (
                formatDuration(duration)
              ) : (
                'Call ended'
              )}
            </p>
          </div>
        </div>

        {/* Local Video (PiP) */}
        <div className="absolute bottom-24 right-4 w-32 h-44 rounded-xl overflow-hidden shadow-xl border-2 border-white/20 bg-gray-800">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <CameraOff className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900/95 backdrop-blur-md border-t border-white/10 px-6 py-4 flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className={`w-12 h-12 rounded-full ${
            isMuted ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          onClick={handleToggleMute}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={`w-12 h-12 rounded-full ${
            isCameraOff ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          onClick={handleToggleCamera}
        >
          {isCameraOff ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20"
          onClick={() => {}}
        >
          <MonitorUp className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="w-14 h-14 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30"
          onClick={handleEndCall}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </motion.div>
  );
}

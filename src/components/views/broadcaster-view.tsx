'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Square,
  Eye,
  Radio,
  Clock,
  MonitorPlay,
  Send,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { LiveChatPanel } from '@/components/live/live-chat-panel';
import { LivePollPanel } from '@/components/live/live-poll-panel';

interface BroadcasterViewProps {
  sessionId: string;
  onNavigate: (view: string) => void;
}

export function BroadcasterView({ sessionId, onNavigate }: BroadcasterViewProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [isLive, setIsLive] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start the session
  useEffect(() => {
    const startSession = async () => {
      if (!currentUser) return;
      try {
        const res = await fetch(`/api/live/sessions/${sessionId}/start`, {
          headers: { 'X-User-Id': currentUser.id },
        });
        const data = await res.json();
        if (data.success) {
          setIsLive(true);
          setSessionTitle(data.session.title);
          // Start timer
          const start = new Date(data.session.startedAt).getTime();
          timerRef.current = setInterval(() => {
            setElapsed(Math.round((Date.now() - start) / 1000));
          }, 1000);
        } else {
          toast({
            title: 'Failed to start',
            description: data.error || 'Could not start the stream',
            variant: 'destructive',
          });
          onNavigate('live');
        }
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to start stream',
          variant: 'destructive',
        });
        onNavigate('live');
      }
    };

    startSession();

    return () => {
      // End session on unmount
      endStream();
    };
  }, []);

  // Get media stream
  useEffect(() => {
    if (!isLive) return;

    const getStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: cameraOn,
          audio: micOn,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
            ? 'video/webm;codecs=vp8,opus'
            : 'video/webm';

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        // Collect chunks every 3 seconds
        recorder.start(3000);

        // Upload chunks every 3 seconds
        uploadIntervalRef.current = setInterval(async () => {
          if (chunksRef.current.length > 0) {
            const chunk = new Blob(chunksRef.current, { type: mimeType });
            chunksRef.current = [];
            await uploadChunk(chunk);
          }
        }, 3000);
      } catch (err) {
        toast({
          title: 'Camera Access Denied',
          description: 'Please allow camera and microphone access to stream',
          variant: 'destructive',
        });
        console.error('Media access error:', err);
      }
    };

    getStream();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
      // Upload remaining chunks
      if (chunksRef.current.length > 0) {
        const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/webm';
        const chunk = new Blob(chunksRef.current, { type: mimeType });
        uploadChunk(chunk);
      }
    };
  }, [isLive]);

  // Poll for viewer count
  useEffect(() => {
    if (!isLive) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/live/sessions/${sessionId}/stream`);
        const data = await res.json();
        if (data.success) {
          setViewerCount(data.viewerCount);
        }
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [isLive, sessionId]);

  const uploadChunk = async (blob: Blob) => {
    if (!currentUser) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('chunk', blob, `chunk_${chunkIndex}.webm`);

      const res = await fetch(`/api/live/sessions/${sessionId}/chunk`, {
        method: 'POST',
        headers: { 'X-User-Id': currentUser.id },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setChunkIndex(data.chunkIndex + 1);
      }
    } catch (err) {
      console.error('Upload chunk error:', err);
    } finally {
      setUploading(false);
    }
  };

  const toggleCamera = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCameraOn(videoTrack.enabled);
    }
  };

  const toggleMic = async () => {
    if (!streamRef.current) return;
    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  const endStream = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    // Upload remaining chunks
    if (chunksRef.current.length > 0) {
      const chunk = new Blob(chunksRef.current, { type: 'video/webm' });
      await uploadChunk(chunk);
    }

    // End session on server
    if (currentUser) {
      try {
        await fetch(`/api/live/sessions/${sessionId}/end`, {
          headers: { 'X-User-Id': currentUser.id },
        });
      } catch {
        // ignore
      }
    }

    setIsLive(false);
    onNavigate('live');
  }, [currentUser, sessionId, onNavigate]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={endStream}
            className="text-gray-300 hover:text-white gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            End & Leave
          </Button>
          <div className="flex items-center gap-3">
            <Badge className="bg-red-600 text-white border-0 gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE
            </Badge>
            <div className="flex items-center gap-1.5 text-sm text-gray-300">
              <Clock className="w-4 h-4" />
              {formatTime(elapsed)}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-300">
              <Eye className="w-4 h-4" />
              {viewerCount}
            </div>
            <Badge variant="secondary" className="text-[10px] text-gray-300">
              Chunk #{chunkIndex}
            </Badge>
            {uploading && (
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Uploading..." />
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Video + Controls */}
          <div className="flex-1 min-w-0">
            {/* Camera Preview */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain mirror"
                style={{ transform: 'scaleX(-1)' }}
              />
              {!cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <CameraOff className="w-16 h-16 text-gray-600" />
                </div>
              )}

              {/* Stream Status Overlay */}
              <div className="absolute bottom-3 left-3">
                <Badge className="bg-red-600/90 text-white border-0 gap-1.5 text-xs">
                  <MonitorPlay className="w-3 h-3" />
                  Broadcasting
                </Badge>
              </div>

              <div className="absolute bottom-3 right-3">
                <Badge variant="secondary" className="bg-black/60 text-white border-0 text-xs">
                  {sessionTitle}
                </Badge>
              </div>
            </div>

            {/* Control Bar */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={toggleCamera}
                  className={`rounded-full h-12 w-12 p-0 border-2 ${
                    cameraOn
                      ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                      : 'border-red-500/50 bg-red-500/20 text-red-400'
                  }`}
                >
                  {cameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                </Button>
              </motion.div>

              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={toggleMic}
                  className={`rounded-full h-12 w-12 p-0 border-2 ${
                    micOn
                      ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                      : 'border-red-500/50 bg-red-500/20 text-red-400'
                  }`}
                >
                  {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </Button>
              </motion.div>

              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  size="lg"
                  onClick={endStream}
                  className="rounded-full h-12 w-12 p-0 bg-red-600 hover:bg-red-700 text-white border-0"
                >
                  <Square className="w-5 h-5" />
                </Button>
              </motion.div>
            </div>

            {/* Mobile Polls */}
            <div className="lg:hidden mb-4">
              <LivePollPanel sessionId={sessionId} isCreator />
            </div>

            {/* Mobile Chat */}
            <div className="lg:hidden">
              <LiveChatPanel sessionId={sessionId} isCreator />
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-80 shrink-0 space-y-4">
            {/* Polls */}
            <LivePollPanel sessionId={sessionId} isCreator />
            {/* Chat */}
            <LiveChatPanel sessionId={sessionId} isCreator />
          </div>
        </div>
      </div>
    </div>
  );
}

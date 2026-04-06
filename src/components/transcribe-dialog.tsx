'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Copy, Check, Loader2, Mic, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TranscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  videoTitle: string;
}

export function TranscribeDialog({ open, onOpenChange, videoId, videoTitle }: TranscribeDialogProps) {
  const { toast } = useToast();
  const [transcription, setTranscription] = useState<string | null>(null);
  const [rawTranscription, setRawTranscription] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);
  const [readingTime, setReadingTime] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranscribe = async () => {
    if (transcription) return; // Already transcribed

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/videos/${videoId}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Transcription failed');
        return;
      }

      setTranscription(data.data.transcription);
      setRawTranscription(data.data.rawTranscription);
      setWordCount(data.data.wordCount);
      setCharacterCount(data.data.characterCount);
      setReadingTime(data.data.estimatedReadingTime);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!transcription) return;

    try {
      await navigator.clipboard.writeText(transcription);
      setCopied(true);
      toast({ title: 'Copied!', description: 'Transcription copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      // Keep transcription so it persists if reopened quickly
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            Video Transcription
          </DialogTitle>
          <DialogDescription>
            Convert spoken words in this video to text. Available for uploaded videos only.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Not yet started */}
          {!transcription && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="font-semibold mb-1">Ready to Transcribe</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-1">
                &ldquo;{videoTitle}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground">
                This will analyze the audio in the video and convert speech to text using AI.
              </p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 mb-6">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Transcribing video...</p>
                  <p className="text-xs text-muted-foreground">Analyzing audio and converting speech to text. This may take a moment.</p>
                </div>
              </div>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="font-semibold mb-2">Transcription Unavailable</h3>
              <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
            </div>
          )}

          {/* Transcription result */}
          {transcription && !loading && (
            <div className="space-y-4">
              {/* Stats bar */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <FileText className="w-3 h-3" />
                  {wordCount} words
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  {characterCount} characters
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  ~{readingTime} min read
                </Badge>
              </div>

              {/* Transcription text */}
              <div className="rounded-xl border bg-muted/30 p-4 max-h-[40vh] overflow-y-auto">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{transcription}</p>
              </div>

              {/* Raw transcription (collapsible) */}
              {rawTranscription && rawTranscription !== transcription && (
                <details className="group">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    Show raw transcription
                  </summary>
                  <div className="mt-2 rounded-lg border bg-muted/20 p-3 max-h-[20vh] overflow-y-auto">
                    <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap font-mono">
                      {rawTranscription}
                    </p>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!transcription && !loading && (
            <Button
              onClick={handleTranscribe}
              className="w-full sm:w-auto gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
            >
              <Mic className="w-4 h-4" />
              Start Transcription
            </Button>
          )}

          {transcription && !loading && (
            <Button
              onClick={handleCopy}
              variant="outline"
              className="w-full sm:w-auto gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Transcription
                </>
              )}
            </Button>
          )}

          {error && !loading && (
            <Button onClick={handleTranscribe} variant="outline" className="w-full sm:w-auto gap-2">
              Try Again
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

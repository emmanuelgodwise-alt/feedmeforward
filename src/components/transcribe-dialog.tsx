'use client';

import { useState, useRef, useEffect } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Copy, Check, Loader2, Mic, AlertCircle, XCircle, Globe, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TranscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  videoTitle: string;
}

type LoadingStage = 'extracting' | 'transcribing' | 'processing';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷' },
  { code: 'auto', label: 'Auto-detect', flag: '🔍' },
] as const;

const LOADING_MESSAGES: Record<LoadingStage, { title: string; description: string }> = {
  extracting: {
    title: 'Extracting audio...',
    description: 'Separating audio track from the video file. This may take a moment for longer videos.',
  },
  transcribing: {
    title: 'Transcribing speech...',
    description: 'Analyzing audio and converting speech to text using AI.',
  },
  processing: {
    title: 'Processing results...',
    description: 'Cleaning up and formatting the transcription.',
  },
};

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
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('extracting');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer effect while loading
  useEffect(() => {
    if (loading) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedTime(0);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const resetState = () => {
    setTranscription(null);
    setRawTranscription(null);
    setWordCount(0);
    setCharacterCount(0);
    setReadingTime(0);
    setLoading(false);
    setCopied(false);
    setError(null);
    setLoadingStage('extracting');
    setElapsedTime(0);
  };

  const currentLanguage = LANGUAGES.find((l) => l.code === selectedLanguage) || LANGUAGES[0];

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setLoading(false);
    setError('Transcription was cancelled by the user.');
  };

  const handleTranscribe = async () => {
    if (transcription) return; // Already transcribed

    resetState();
    setLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Progress stages simulation
    setLoadingStage('extracting');
    const stageTimeout1 = setTimeout(() => {
      if (abortController.signal.aborted) return;
      setLoadingStage('transcribing');
    }, 5000);

    const stageTimeout2 = setTimeout(() => {
      if (abortController.signal.aborted) return;
      setLoadingStage('processing');
    }, 25000);

    // Overall timeout: 60 seconds
    const overallTimeout = setTimeout(() => {
      if (abortController.signal.aborted) return;
      abortController.abort();
      if (!error) {
        setLoading(false);
        setError(
          'Transcription timed out. The video may be too long or the audio may be unclear. Please try again or use a shorter clip.'
        );
      }
    }, 60000);

    timeoutRef.current = overallTimeout;

    try {
      const res = await fetch(`/api/videos/${videoId}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({ language: selectedLanguage === 'auto' ? undefined : selectedLanguage }),
      });

      clearTimeout(stageTimeout1);
      clearTimeout(stageTimeout2);
      clearTimeout(overallTimeout);
      timeoutRef.current = null;

      if (abortController.signal.aborted) return;

      setLoadingStage('processing');

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Transcription failed. The video may not contain speech or the audio may be in an unsupported format.');
        return;
      }

      setTranscription(data.data.transcription);
      setRawTranscription(data.data.rawTranscription);
      setWordCount(data.data.wordCount);
      setCharacterCount(data.data.characterCount);
      setReadingTime(data.data.estimatedReadingTime);
    } catch (err) {
      clearTimeout(stageTimeout1);
      clearTimeout(stageTimeout2);
      clearTimeout(overallTimeout);
      timeoutRef.current = null;

      if (abortController.signal.aborted) {
        // Already handled by handleCancel or timeout
        return;
      }
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
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

  const handleRefreshTranscription = () => {
    resetState();
    // Re-trigger immediately
    setTimeout(() => handleTranscribe(), 100);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Cancel any in-progress request when closing
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
    onOpenChange(newOpen);
  };

  const currentMessage = LOADING_MESSAGES[loadingStage];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/50 dark:to-amber-950/50 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="font-semibold mb-1">Ready to Transcribe</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-1">
                &ldquo;{videoTitle}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                This will analyze the audio in the video and convert speech to text using AI.
              </p>

              {/* Language selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Language:</span>
                <DropdownMenu open={languageMenuOpen} onOpenChange={setLanguageMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-sm"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {currentLanguage.flag} {currentLanguage.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48">
                    {LANGUAGES.map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onSelect={() => {
                          setSelectedLanguage(lang.code);
                          setLanguageMenuOpen(false);
                        }}
                        className={`gap-2 cursor-pointer ${selectedLanguage === lang.code ? 'bg-orange-50 dark:bg-orange-950/30' : ''}`}
                      >
                        <span>{lang.flag}</span>
                        <span className="flex-1">{lang.label}</span>
                        {selectedLanguage === lang.code && (
                          <Check className="w-3 h-3 text-orange-500" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {/* Loading state with progress */}
          {loading && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{currentMessage.title}</p>
                  <p className="text-xs text-muted-foreground">{currentMessage.description}</p>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatTime(elapsedTime)}
                </span>
              </div>

              {/* Progress stages indicator */}
              <div className="flex items-center gap-1 mb-4">
                {(['extracting', 'transcribing', 'processing'] as LoadingStage[]).map((stage, idx) => {
                  const stageOrder = ['extracting', 'transcribing', 'processing'];
                  const currentIdx = stageOrder.indexOf(loadingStage);
                  const isActive = stage === loadingStage;
                  const isDone = currentIdx > idx;
                  return (
                    <div key={stage} className="flex items-center gap-1 flex-1">
                      <div
                        className={`h-1.5 rounded-full flex-1 transition-colors duration-500 ${
                          isDone
                            ? 'bg-orange-500'
                            : isActive
                            ? 'bg-orange-400 animate-pulse'
                            : 'bg-muted'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Stage labels */}
              <div className="flex justify-between text-[10px] text-muted-foreground mb-4">
                <span className={loadingStage === 'extracting' ? 'text-orange-500 font-medium' : ''}>
                  Extract Audio
                </span>
                <span className={loadingStage === 'transcribing' ? 'text-orange-500 font-medium' : ''}>
                  Transcribe
                </span>
                <span className={loadingStage === 'processing' ? 'text-orange-500 font-medium' : ''}>
                  Process
                </span>
              </div>

              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}

              {/* Cancel button during loading */}
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
                  onClick={handleCancel}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel Transcription
                </Button>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="font-semibold mb-2">Transcription Unavailable</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">{error}</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Tip: Make sure the video contains clear speech. Very long videos or videos with heavy background noise may not transcribe well.
              </p>
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
              className="w-full sm:w-auto gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            >
              <Mic className="w-4 h-4" />
              Start Transcription
            </Button>
          )}

          {transcription && !loading && (
            <Button
              onClick={handleRefreshTranscription}
              variant="outline"
              className="w-full sm:w-auto gap-2"
              title="Re-transcribe with different language"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
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
            onClick={() => handleOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

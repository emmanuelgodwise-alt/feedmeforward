'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Repeat2, Type, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';

interface RepostButtonProps {
  videoId: string;
  repostCount?: number;
  isReposted?: boolean;
  onRepost?: (quote?: string) => void;
}

export function RepostButton({
  videoId,
  repostCount = 0,
  isReposted = false,
  onRepost,
}: RepostButtonProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<'repost' | 'quote' | 'undo'>('repost');
  const [quote, setQuote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (!currentUser) {
      toast({ title: 'Sign in required', description: 'Please sign in to repost', variant: 'destructive' });
      return;
    }
    if (isReposted) {
      setMode('undo');
    } else {
      setMode('repost');
    }
    setDialogOpen(true);
  };

  const handleConfirm = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      if (mode === 'undo') {
        const res = await fetch(`/api/videos/${videoId}/repost`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        const data = await res.json();
        if (data.success) {
          toast({ title: 'Repost removed', description: 'Video has been un-reposted' });
          onRepost?.();
        }
      } else if (mode === 'repost') {
        const res = await fetch(`/api/videos/${videoId}/repost`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id }),
        });
        const data = await res.json();
        if (data.success) {
          toast({ title: 'Reposted! 🔄', description: 'Video has been reposted to your profile' });
          onRepost?.();
        }
      } else if (mode === 'quote') {
        const res = await fetch(`/api/videos/${videoId}/repost`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, quote }),
        });
        const data = await res.json();
        if (data.success) {
          toast({ title: 'Quoted! ✍️', description: 'Video has been reposted with your comment' });
          onRepost?.();
        }
      }
      setDialogOpen(false);
      setQuote('');
    } catch {
      toast({ title: 'Failed to repost', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, mode, quote, videoId, onRepost, toast]);

  return (
    <>
      <Button
        variant={isReposted ? 'default' : 'outline'}
        size="sm"
        className={`gap-2 ${
          isReposted
            ? 'bg-orange-500 hover:bg-orange-600 text-white'
            : 'hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-500 hover:border-orange-300'
        }`}
        onClick={handleClick}
      >
        <Repeat2 className="w-4 h-4" />
        {repostCount > 0 ? repostCount : 'Repost'}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === 'undo' ? 'Undo Repost' : mode === 'quote' ? 'Quote Repost' : 'Repost'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'undo'
                ? 'Remove this repost from your profile?'
                : mode === 'quote'
                ? 'Add a comment to your repost'
                : 'Share this video to your profile'}
            </DialogDescription>
          </DialogHeader>

          {mode === 'undo' ? null : mode === 'repost' ? (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setMode('quote')}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer text-left"
              >
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                  <Repeat2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Repost</p>
                  <p className="text-xs text-muted-foreground">Share to your profile without comment</p>
                </div>
              </button>
              <button
                onClick={() => setMode('quote')}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer text-left"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <Type className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Quote Repost</p>
                  <p className="text-xs text-muted-foreground">Add your thoughts before sharing</p>
                </div>
              </button>
            </div>
          ) : (
            <Textarea
              placeholder="Add your thoughts..."
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={3}
              maxLength={300}
              className="resize-none"
            />
          )}

          <DialogFooter className="flex items-center gap-2">
            {mode === 'quote' && (
              <Button variant="ghost" size="sm" onClick={() => setMode('repost')}>
                Back
              </Button>
            )}
            <Button
              variant={mode === 'undo' ? 'destructive' : 'default'}
              size="sm"
              onClick={handleConfirm}
              disabled={isLoading}
              className={
                mode !== 'undo'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
                  : ''
              }
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'undo' ? (
                <>
                  <X className="w-4 h-4" />
                  Remove Repost
                </>
              ) : mode === 'quote' ? (
                <>
                  <Type className="w-4 h-4" />
                  Quote & Repost
                </>
              ) : (
                <>
                  <Repeat2 className="w-4 h-4" />
                  Repost
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

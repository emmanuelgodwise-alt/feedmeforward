'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Ban, UserX } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';

interface UserBlockButtonProps {
  targetUserId: string;
  targetUsername?: string;
  size?: 'sm' | 'default';
}

export function UserBlockButton({ targetUserId, targetUsername, size = 'default' }: UserBlockButtonProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();

  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const checkBlockedStatus = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/users/block', {
        headers: { 'X-User-Id': currentUser.id },
      });
      const json = await res.json();
      if (json.success) {
        setIsBlocked(json.blockedUsers.some((bu: { blockedId: string }) => bu.blockedId === targetUserId));
      }
    } catch {
      // Silently fail
    } finally {
      setChecking(false);
    }
  }, [currentUser, targetUserId]);

  useEffect(() => {
    checkBlockedStatus();
  }, [checkBlockedStatus]);

  const handleBlock = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify({ blockedId: targetUserId }),
      });
      const json = await res.json();

      if (json.success) {
        setIsBlocked(true);
        toast({
          title: 'User blocked',
          description: `You have blocked ${targetUsername || 'this user'}.`,
        });
      } else {
        toast({
          title: 'Block failed',
          description: json.error || 'Could not block user',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Network error',
        description: 'Failed to block user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setDialogOpen(false);
    }
  };

  const handleUnblock = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/users/block', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify({ blockedId: targetUserId }),
      });
      const json = await res.json();

      if (json.success) {
        setIsBlocked(false);
        toast({
          title: 'User unblocked',
          description: `You have unblocked ${targetUsername || 'this user'}.`,
        });
      } else {
        toast({
          title: 'Unblock failed',
          description: json.error || 'Could not unblock user',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Network error',
        description: 'Failed to unblock user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  const isSm = size === 'sm';

  return (
    <>
      {isBlocked ? (
        <Button
          variant="outline"
          size={isSm ? 'sm' : 'default'}
          className={`gap-1.5 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 ${isSm ? 'h-8 text-xs' : ''}`}
          onClick={handleUnblock}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className={`animate-spin ${isSm ? 'w-3 h-3' : 'w-4 h-4'}`} />
          ) : (
            <UserX className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
          )}
          Unblock
        </Button>
      ) : (
        <Button
          variant="outline"
          size={isSm ? 'sm' : 'default'}
          className={`gap-1.5 text-muted-foreground hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-800 ${isSm ? 'h-8 text-xs' : ''}`}
          onClick={() => setDialogOpen(true)}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className={`animate-spin ${isSm ? 'w-3 h-3' : 'w-4 h-4'}`} />
          ) : (
            <Ban className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
          )}
          Block User
        </Button>
      )}

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Block User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to block {targetUsername || 'this user'}? They will not be able to interact with your content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBlock();
              }}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Blocking...
                </>
              ) : (
                'Block'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MessageCircle, Reply, Send, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useVideoStore } from '@/stores/video-store';
import { useToast } from '@/hooks/use-toast';
import type { CommentData } from '@/types';
import { timeAgo } from './video-card';

interface CommentSectionProps {
  videoId: string;
}

export function CommentSection({ videoId }: CommentSectionProps) {
  const { currentUser } = useAuthStore();
  const { createComment } = useVideoStore();
  const { toast } = useToast();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/comments?limit=50`);
      const json = await res.json();
      if (json.success) {
        setComments(json.data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [videoId]);

  const handleSubmitComment = async () => {
    if (!currentUser) {
      toast({ title: 'Sign in required', description: 'Please sign in to comment', variant: 'destructive' });
      return;
    }
    if (!newComment.trim()) return;

    setSubmitting(true);
    const success = await createComment(videoId, newComment.trim());
    setSubmitting(false);

    if (success) {
      setNewComment('');
      fetchComments();
    } else {
      toast({ title: 'Failed to post comment', variant: 'destructive' });
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!currentUser || !replyText.trim()) return;

    setSubmitting(true);
    const success = await createComment(videoId, replyText.trim(), parentCommentId);
    setSubmitting(false);

    if (success) {
      setReplyTo(null);
      setReplyText('');
      fetchComments();
    } else {
      toast({ title: 'Failed to post reply', variant: 'destructive' });
    }
  };

  const renderComment = (comment: CommentData, isReply = false) => (
    <motion.div
      key={comment.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${isReply ? 'ml-8 pl-4 border-l-2 border-orange-200 dark:border-orange-900/40' : ''}`}
    >
      <div className="flex gap-3 py-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shrink-0 text-white text-xs font-bold">
          {comment.user.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">@{comment.user.username}</span>
            <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-sm mt-0.5 text-foreground/90">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1">
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500 transition-colors">
              <Heart className="w-3 h-3" />
              {comment._count?.likes || 0}
            </button>
            {!isReply && currentUser && (
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-orange-500 transition-colors"
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              >
                <Reply className="w-3 h-3" />
                Reply
              </button>
            )}
          </div>

          {/* Reply input */}
          {replyTo === comment.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex gap-2 mt-2"
            >
              <Input
                placeholder={`Reply to @${comment.user.username}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitReply(comment.id);
                  }
                }}
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                onClick={() => handleSubmitReply(comment.id)}
                disabled={submitting || !replyText.trim()}
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </Button>
            </motion.div>
          )}

          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-1">
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      <div className="flex gap-2">
        <Input
          placeholder={currentUser ? 'Write a comment...' : 'Sign in to comment...'}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="h-10"
          disabled={!currentUser || submitting}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmitComment();
            }
          }}
        />
        <Button
          className="h-10 px-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white shrink-0"
          onClick={handleSubmitComment}
          disabled={!currentUser || submitting || !newComment.trim()}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {comments.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Pencil, Trash2, Share2, Flag, Loader2, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES } from '@/types';
import { ReportDialog } from '@/components/report-dialog';

interface VideoActionsProps {
  videoId: string;
  creatorId: string;
  title: string;
  currentUserId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onVideoUpdated?: () => void;
}

export function VideoActions({
  videoId,
  creatorId,
  title,
  currentUserId,
  onEdit,
  onDelete,
  onVideoUpdated,
}: VideoActionsProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();

  const userId = currentUserId || currentUser?.id;
  const isOwner = userId === creatorId;

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Report dialog state
  const [reportOpen, setReportOpen] = useState(false);

  // Load current video data for editing
  useEffect(() => {
    if (editOpen) {
      const loadVideoData = async () => {
        if (!currentUser) return;
        try {
          const res = await fetch(`/api/videos/${videoId}`, {
            headers: { 'X-User-Id': currentUser.id },
          });
          const data = await res.json();
          if (data.success && data.data) {
            const video = data.data;
            setEditTitle(video.title || '');
            setEditDescription(video.description || '');
            setEditCategory(video.category || '');
            setEditTags(video.tags ? video.tags.join(', ') : '');
          }
        } catch {
          // Keep defaults
        }
      };
      loadVideoData();
    }
  }, [editOpen, videoId, currentUser]);

  // Reset edit form when dialog closes
  const handleEditOpenChange = (open: boolean) => {
    if (!open) {
      setEditTitle('');
      setEditDescription('');
      setEditCategory('');
      setEditTags('');
    }
    setEditOpen(open);
  };

  // Handle edit submit
  const handleEditSubmit = async () => {
    if (!currentUser || !editTitle.trim()) return;

    setIsEditing(true);
    try {
      const tagsArray = editTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const res = await fetch(`/api/videos/${videoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          category: editCategory || null,
          tags: tagsArray,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Update failed',
          description: data.error || 'Could not update video',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Video updated!',
        description: 'Your changes have been saved.',
      });

      setEditOpen(false);
      onVideoUpdated?.();
      onEdit?.();
    } catch {
      toast({
        title: 'Network error',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsEditing(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!currentUser) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': currentUser.id },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Delete failed',
          description: data.error || 'Could not delete video',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Video deleted',
        description: 'The video has been permanently removed.',
      });

      setDeleteOpen(false);
      onVideoUpdated?.();
      onDelete?.();
    } catch {
      toast({
        title: 'Network error',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle share
  const handleShare = async () => {
    const url = `${window.location.origin}/video/${videoId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied to clipboard!',
        description: url,
      });
    } catch {
      // Fallback: create a temp textarea
      try {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast({
          title: 'Link copied to clipboard!',
          description: url,
        });
      } catch {
        toast({
          title: 'Failed to copy',
          description: 'Please copy the URL manually.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Edit — owner only */}
        {isOwner && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
            title="Edit video"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        )}

        {/* Delete — owner only */}
        {isOwner && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            title="Delete video"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}

        {/* Report — non-owner only */}
        {!isOwner && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-gray-500 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-950/30"
            title="Report video"
            onClick={() => setReportOpen(true)}
          >
            <Flag className="w-4 h-4" />
          </Button>
        )}

        {/* Share — always */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30"
          title="Share video"
          onClick={handleShare}
        >
          <Share2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-orange-500" />
              Edit Video
            </DialogTitle>
            <DialogDescription>
              Update your video details below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                placeholder="Video title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe your video..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">No category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <Input
                id="edit-tags"
                placeholder="Comma-separated tags (e.g. funny, reaction, review)"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
              />
              {editTags && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {editTags
                    .split(',')
                    .map((t) => t.trim())
                    .filter((t) => t.length > 0)
                    .map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() =>
                            setEditTags((prev) =>
                              prev
                                .split(',')
                                .filter((t) => t.trim() !== tag)
                                .join(', ')
                            )
                          }
                          className="hover:text-orange-900 dark:hover:text-orange-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleEditOpenChange(false)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={!editTitle.trim() || isEditing}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
            >
              {isEditing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Video
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{title}&quot;? This action cannot be undone. All
              polls, comments, likes, and responses associated with this video will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="video"
        targetId={videoId}
        targetTitle={title}
      />
    </>
  );
}

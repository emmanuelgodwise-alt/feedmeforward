'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Radio, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';

interface GoLiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionCreated: (sessionId: string) => void;
}

export function GoLiveDialog({ open, onOpenChange, onSessionCreated }: GoLiveDialogProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [isRecorded, setIsRecorded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !currentUser) return;

    setLoading(true);
    try {
      const tagList = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      const res = await fetch('/api/live/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          tags: tagList.length > 0 ? tagList : undefined,
          isRecorded,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({
          title: 'Session created! 🎬',
          description: 'Starting your live stream...',
        });
        setTitle('');
        setDescription('');
        setCategory('');
        setTags('');
        setIsRecorded(false);
        onSessionCreated(data.session.id);
      } else {
        toast({
          title: 'Failed to create session',
          description: data.error || 'Something went wrong',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Network error',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setErrors({});
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Radio className="w-4 h-4 text-white" />
            </div>
            Go Live
          </DialogTitle>
          <DialogDescription>
            Set up your live stream and start broadcasting to your audience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="live-title">Title *</Label>
            <Input
              id="live-title"
              placeholder="What are you streaming today?"
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors({}); }}
              maxLength={100}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="live-description">Description</Label>
            <Textarea
              id="live-description"
              placeholder="Tell viewers what this stream is about..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="live-category">Category</Label>
            <Input
              id="live-category"
              placeholder="e.g., Polls, Interviews, Q&A"
              value={category}
              onChange={e => setCategory(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="live-tags">Tags (comma separated)</Label>
            <Input
              id="live-tags"
              placeholder="e.g., opinion, street, poll"
              value={tags}
              onChange={e => setTags(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="record-toggle" className="text-sm font-medium">Record Stream</Label>
              <p className="text-xs text-muted-foreground">Save as a video after ending</p>
            </div>
            <Switch
              id="record-toggle"
              checked={isRecorded}
              onCheckedChange={setIsRecorded}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Radio className="w-4 h-4" />
                Go Live
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

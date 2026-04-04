'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, Play, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useVideoStore } from '@/stores/video-store';
import { useToast } from '@/hooks/use-toast';
import type { View } from '@/app/page';

interface CreateResponseViewProps {
  onNavigate: (view: View) => void;
  parentVideoId: string;
  parentVideoTitle?: string;
  parentVideoCreator?: string;
  parentVideoThumbnail?: string;
}

export function CreateResponseView({
  onNavigate,
  parentVideoId,
  parentVideoTitle = '',
  parentVideoCreator = '',
  parentVideoThumbnail,
}: CreateResponseViewProps) {
  const { currentUser } = useAuthStore();
  const { createVideo, isLoading } = useVideoStore();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    tags: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.videoUrl.trim()) newErrors.videoUrl = 'Video URL is required';
    else {
      try {
        new URL(form.videoUrl);
      } catch {
        newErrors.videoUrl = 'Please enter a valid URL';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const tagsArray = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const video = await createVideo({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      videoUrl: form.videoUrl.trim(),
      thumbnailUrl: form.thumbnailUrl.trim() || undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      type: 'response',
      parentVideoId,
    });

    if (!video) {
      toast({ title: 'Failed to create response', variant: 'destructive' });
      return;
    }

    toast({ title: 'Response created!', description: 'Your response clip has been published.' });
    window.dispatchEvent(new CustomEvent('navigate-video', { detail: { videoId: parentVideoId } }));
  };

  const tagChips = form.tags
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (!currentUser) return null;

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <Button variant="ghost" size="icon" onClick={() => onNavigate('video-detail')} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Respond with Clip</h1>
          <p className="text-sm text-muted-foreground">Create a video response</p>
        </div>
      </motion.div>

      {/* Parent Video Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="border-orange-200 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="w-24 h-16 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                {parentVideoThumbnail ? (
                  <img src={parentVideoThumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Play className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Responding to</p>
                <p className="font-semibold text-sm truncate">{parentVideoTitle || 'Lead Clip'}</p>
                <p className="text-xs text-muted-foreground">@{parentVideoCreator}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resp-title">Title *</Label>
                  <Input
                    id="resp-title"
                    placeholder="Give your response a title"
                    value={form.title}
                    onChange={(e) => updateForm('title', e.target.value)}
                    aria-invalid={!!errors.title}
                  />
                  {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resp-url">Video URL *</Label>
                  <Input
                    id="resp-url"
                    placeholder="https://youtube.com/watch?v=... or any video URL"
                    value={form.videoUrl}
                    onChange={(e) => updateForm('videoUrl', e.target.value)}
                    aria-invalid={!!errors.videoUrl}
                  />
                  {errors.videoUrl && <p className="text-xs text-destructive">{errors.videoUrl}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resp-thumbnail">Thumbnail URL (optional)</Label>
                  <Input
                    id="resp-thumbnail"
                    placeholder="https://example.com/thumbnail.jpg"
                    value={form.thumbnailUrl}
                    onChange={(e) => updateForm('thumbnailUrl', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resp-desc">Description</Label>
                  <Textarea
                    id="resp-desc"
                    placeholder="What's your response about?"
                    value={form.description}
                    onChange={(e) => updateForm('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resp-tags">Tags</Label>
                  <Input
                    id="resp-tags"
                    placeholder="Comma-separated"
                    value={form.tags}
                    onChange={(e) => updateForm('tags', e.target.value)}
                  />
                </div>

                {tagChips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tagChips.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-base font-semibold shadow-lg shadow-orange-500/20"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Response Clip'
              )}
            </Button>
          </motion.div>
        </div>
      </form>
    </div>
  );
}

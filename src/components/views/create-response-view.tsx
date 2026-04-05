'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Play, X, Upload, FileVideo, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useVideoStore } from '@/stores/video-store';
import { useToast } from '@/hooks/use-toast';
import { QuickNav } from '@/components/quick-nav';
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

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 100MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', file);
      const res = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: { 'X-User-Id': currentUser?.id || '' },
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data) {
        updateForm('videoUrl', json.data.videoUrl);
        setUploadedFile(file.name);
        toast({ title: 'Video uploaded!', description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)` });
      } else {
        toast({ title: 'Upload failed', description: json.error || 'Unknown error', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Upload error', description: 'Check your connection', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemoveUpload = () => {
    setUploadedFile(null);
    updateForm('videoUrl', '');
  };

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
        <Button variant="ghost" onClick={() => onNavigate('video-detail')} className="shrink-0">
          <span className="text-sm">Back to Video</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Respond with Clip</h1>
          <p className="text-sm text-muted-foreground">Create a video response</p>
        </div>
      </motion.div>

      <QuickNav onNavigate={onNavigate} activeView="create-response" />

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

                {/* Video Upload */}
                <div className="space-y-2">
                  <Label>Upload Video</Label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                      uploading
                        ? 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20'
                        : uploadedFile
                          ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'border-muted-foreground/25 hover:border-orange-300 hover:bg-orange-50/30 dark:hover:bg-orange-950/20 cursor-pointer'
                    }`}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Uploading...</p>
                        <p className="text-xs text-muted-foreground">Please wait while your video is being uploaded</p>
                      </div>
                    ) : uploadedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">{uploadedFile}</p>
                          <p className="text-xs text-muted-foreground">Uploaded successfully</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={handleRemoveUpload}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                          }}
                        />
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                            <Upload className="w-6 h-6 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Drop a video here or click to browse</p>
                            <p className="text-xs text-muted-foreground mt-1">MP4, WebM, MOV, AVI — Max 100MB</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <FileVideo className="w-3 h-3" />
                    Upload a local file, or paste a URL below
                  </p>
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

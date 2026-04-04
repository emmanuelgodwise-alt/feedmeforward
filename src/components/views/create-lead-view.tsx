'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Plus, X, Eye, DollarSign, Calendar, Users, Play, HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useVideoStore } from '@/stores/video-store';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES } from '@/types';
import type { View } from '@/app/page';

interface CreateLeadViewProps {
  onNavigate: (view: View) => void;
}

export function CreateLeadView({ onNavigate }: CreateLeadViewProps) {
  const { currentUser } = useAuthStore();
  const { createVideo, createPoll, isLoading } = useVideoStore();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    category: '',
    tags: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Poll state
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState([
    { id: `opt_${Date.now()}_1`, text: '' },
    { id: `opt_${Date.now()}_2`, text: '' },
  ]);
  const [isPaidPoll, setIsPaidPoll] = useState(false);
  const [paidPollSettings, setPaidPollSettings] = useState({
    rewardPerResponse: '',
    totalRewardPool: '',
    maxResponses: '',
    closesAt: '',
  });

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

  const addOption = () => {
    if (pollOptions.length >= 6) return;
    setPollOptions((prev) => [...prev, { id: `opt_${Date.now()}_${prev.length + 1}`, text: '' }]);
  };

  const removeOption = (index: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, text: string) => {
    setPollOptions((prev) => prev.map((opt, i) => (i === index ? { ...opt, text } : opt)));
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

    if (showPoll) {
      if (!pollQuestion.trim()) newErrors.pollQuestion = 'Poll question is required';
      const filledOptions = pollOptions.filter((o) => o.text.trim());
      if (filledOptions.length < 2) newErrors.pollOptions = 'At least 2 options are required';
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
      category: form.category || undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      type: 'lead',
    });

    if (!video) {
      toast({ title: 'Failed to create video', variant: 'destructive' });
      return;
    }

    // Create poll if enabled
    if (showPoll && pollQuestion.trim()) {
      const filledOptions = pollOptions.filter((o) => o.text.trim()).map((o) => ({ id: o.id, text: o.text.trim() }));
      if (filledOptions.length >= 2) {
        await createPoll({
          videoId: video.id,
          question: pollQuestion.trim(),
          options: filledOptions,
          isPaid: isPaidPoll,
          rewardPerResponse: isPaidPoll ? parseFloat(paidPollSettings.rewardPerResponse) || undefined : undefined,
          totalRewardPool: isPaidPoll ? parseFloat(paidPollSettings.totalRewardPool) || undefined : undefined,
          maxResponses: paidPollSettings.maxResponses ? parseInt(paidPollSettings.maxResponses, 10) : undefined,
          closesAt: paidPollSettings.closesAt || undefined,
        });
      }
    }

    toast({ title: 'Lead Clip created!', description: 'Your video has been published successfully.' });
    onNavigate('explore');
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
        <Button variant="ghost" size="icon" onClick={() => onNavigate('explore')} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Lead Clip</h1>
          <p className="text-sm text-muted-foreground">Share a video with a poll question</p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Video Details */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lead-title">Title *</Label>
                  <Input
                    id="lead-title"
                    placeholder="Give your lead clip a catchy title"
                    value={form.title}
                    onChange={(e) => updateForm('title', e.target.value)}
                    aria-invalid={!!errors.title}
                  />
                  {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lead-description">Description</Label>
                  <Textarea
                    id="lead-description"
                    placeholder="What's this video about?"
                    value={form.description}
                    onChange={(e) => updateForm('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lead-url">Video URL *</Label>
                  <Input
                    id="lead-url"
                    placeholder="https://youtube.com/watch?v=... or any video URL"
                    value={form.videoUrl}
                    onChange={(e) => updateForm('videoUrl', e.target.value)}
                    aria-invalid={!!errors.videoUrl}
                  />
                  {errors.videoUrl && <p className="text-xs text-destructive">{errors.videoUrl}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lead-thumbnail">Thumbnail URL (optional)</Label>
                  <Input
                    id="lead-thumbnail"
                    placeholder="https://example.com/thumbnail.jpg"
                    value={form.thumbnailUrl}
                    onChange={(e) => updateForm('thumbnailUrl', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => updateForm('category', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-tags">Tags</Label>
                    <Input
                      id="lead-tags"
                      placeholder="Comma-separated"
                      value={form.tags}
                      onChange={(e) => updateForm('tags', e.target.value)}
                    />
                  </div>
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

          {/* Poll Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-orange-500" />
                    <Label className="text-base font-semibold">Add a Poll</Label>
                  </div>
                  <Switch checked={showPoll} onCheckedChange={setShowPoll} />
                </div>

                {showPoll && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="poll-question">Question</Label>
                      <Input
                        id="poll-question"
                        placeholder="What do you want to ask?"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        aria-invalid={!!errors.pollQuestion}
                      />
                      {errors.pollQuestion && <p className="text-xs text-destructive">{errors.pollQuestion}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Options (min 2, max 6)</Label>
                      {pollOptions.map((opt, i) => (
                        <div key={opt.id} className="flex gap-2">
                          <Input
                            placeholder={`Option ${i + 1}`}
                            value={opt.text}
                            onChange={(e) => updateOption(i, e.target.value)}
                          />
                          {pollOptions.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeOption(i)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {errors.pollOptions && <p className="text-xs text-destructive">{errors.pollOptions}</p>}
                      {pollOptions.length < 6 && (
                        <Button type="button" variant="outline" size="sm" onClick={addOption} className="gap-1 mt-1">
                          <Plus className="w-3 h-3" />
                          Add Option
                        </Button>
                      )}
                    </div>

                    {/* Paid Poll Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        <Label>Paid Poll</Label>
                      </div>
                      <Switch checked={isPaidPoll} onCheckedChange={setIsPaidPoll} />
                    </div>

                    {isPaidPoll && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2"
                      >
                        <div className="space-y-1">
                          <Label className="text-xs">Reward per Response ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.50"
                            value={paidPollSettings.rewardPerResponse}
                            onChange={(e) =>
                              setPaidPollSettings((prev) => ({ ...prev, rewardPerResponse: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Total Reward Pool ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="50.00"
                            value={paidPollSettings.totalRewardPool}
                            onChange={(e) =>
                              setPaidPollSettings((prev) => ({ ...prev, totalRewardPool: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Max Responses</Label>
                          <Input
                            type="number"
                            placeholder="100"
                            value={paidPollSettings.maxResponses}
                            onChange={(e) =>
                              setPaidPollSettings((prev) => ({ ...prev, maxResponses: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Close Date</Label>
                          <Input
                            type="date"
                            value={paidPollSettings.closesAt}
                            onChange={(e) =>
                              setPaidPollSettings((prev) => ({ ...prev, closesAt: e.target.value }))
                            }
                          />
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Preview Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-dashed border-orange-200 dark:border-orange-900/40">
              <CardContent className="p-6">
                <Label className="text-base font-semibold mb-3 block">Preview</Label>
                <div className="rounded-xl overflow-hidden border">
                  <div className="aspect-video bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center relative">
                    <Play className="w-12 h-12 text-white/80" />
                    {form.category && (
                      <Badge className="absolute top-2 right-2 bg-white/90 text-orange-700 text-xs">
                        {form.category}
                      </Badge>
                    )}
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="font-semibold text-sm">
                      {form.title || 'Your lead clip title'}
                    </p>
                    <p className="text-xs text-muted-foreground">@{currentUser.username}</p>
                    {showPoll && pollQuestion && (
                      <Badge variant="secondary" className="text-xs">
                        Poll: {pollQuestion}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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
                'Publish Lead Clip'
              )}
            </Button>
          </motion.div>
        </div>
      </form>
    </div>
  );
}

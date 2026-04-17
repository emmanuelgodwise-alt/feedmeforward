'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Loader2, Plus, X, Eye, DollarSign, Calendar, Users, Play, HelpCircle, AlertCircle, Wallet, Upload, FileVideo, CheckCircle, Target, ChevronDown, ChevronUp, ImageIcon, Link2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useAudienceStore } from '@/stores/audience-store';
import { useVideoStore } from '@/stores/video-store';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES } from '@/types';
import { type SegmentCriteria, hasActiveCriteria, criteriaToBreakdown } from '@/lib/build-where-clause';
interface CreateLeadViewProps {
  onNavigate: (view: string) => void;
}

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+'];
const GENDERS = ['male', 'female', 'non-binary', 'prefer-not-to-say'];

const emptyCriteria: SegmentCriteria = {};

export function CreateLeadView({ onNavigate }: CreateLeadViewProps) {
  const { currentUser } = useAuthStore();
  const { selectedSegmentCriteria, clearSelectedSegmentCriteria } = useAudienceStore();
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

  // Targeting state
  const [showTargeting, setShowTargeting] = useState(false);
  const [targetingEnabled, setTargetingEnabled] = useState<Record<string, boolean>>({
    ageRange: false,
    location: false,
    gender: false,
    language: false,
    interests: false,
    minScore: false,
  });
  const [targetingCriteria, setTargetingCriteria] = useState<SegmentCriteria>({ ...emptyCriteria });
  const [interestsText, setInterestsText] = useState('');
  const [estimatedReach, setEstimatedReach] = useState<number | null>(null);
  const [reachLoading, setReachLoading] = useState(false);
  const [segments, setSegments] = useState<Array<{ id: string; name: string; criteria: string }>>([]);
  const [selectedSegment, setSelectedSegment] = useState('');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  // Thumbnail state
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Load segment criteria from audience store when navigated from segments view
  useEffect(() => {
    if (selectedSegmentCriteria && hasActiveCriteria(selectedSegmentCriteria)) {
      setTargetingCriteria({ ...selectedSegmentCriteria });
      setInterestsText(selectedSegmentCriteria.interests?.join(', ') || '');
      setTargetingEnabled({
        ageRange: !!selectedSegmentCriteria.ageRange,
        location: !!selectedSegmentCriteria.location,
        gender: !!selectedSegmentCriteria.gender,
        language: !!selectedSegmentCriteria.language,
        interests: !!(selectedSegmentCriteria.interests && selectedSegmentCriteria.interests.length > 0),
        minScore: !!(selectedSegmentCriteria.minScore !== undefined && selectedSegmentCriteria.minScore > 0),
      });
      setShowTargeting(true);
      clearSelectedSegmentCriteria();
    }
  }, [selectedSegmentCriteria, clearSelectedSegmentCriteria]);

  // Fetch saved segments
  useEffect(() => {
    if (!currentUser) return;
    fetch('/api/segments', {
      headers: { 'X-User-Id': currentUser.id },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) setSegments(json.data);
      })
      .catch(() => {});
  }, [currentUser]);

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
        // Auto-set thumbnail if generated
        if (json.data.thumbnailUrl) {
          updateForm('thumbnailUrl', json.data.thumbnailUrl);
          setThumbnailPreview(json.data.thumbnailUrl);
        }
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
    // Also clear thumbnail if it was auto-generated from this upload
    if (thumbnailPreview && form.thumbnailUrl === thumbnailPreview) {
      setThumbnailPreview(null);
      updateForm('thumbnailUrl', '');
    }
  };

  const handleThumbnailUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Accepted: JPEG, PNG, WebP', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum thumbnail size is 5MB', variant: 'destructive' });
      return;
    }
    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/videos/upload-thumbnail', {
        method: 'POST',
        headers: { 'X-User-Id': currentUser?.id || '' },
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data) {
        updateForm('thumbnailUrl', json.data.thumbnailUrl);
        setThumbnailPreview(json.data.thumbnailUrl);
        toast({ title: 'Thumbnail uploaded!' });
      } else {
        toast({ title: 'Upload failed', description: json.error || 'Unknown error', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Upload error', description: 'Check your connection', variant: 'destructive' });
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleRemoveThumbnail = () => {
    setThumbnailPreview(null);
    updateForm('thumbnailUrl', '');
    setShowUrlInput(false);
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

  const updateTargetingEnabled = (field: string, enabled: boolean) => {
    setTargetingEnabled((prev) => ({ ...prev, [field]: enabled }));
    if (!enabled) {
      const newCriteria = { ...targetingCriteria };
      delete (newCriteria as Record<string, unknown>)[field];
      setTargetingCriteria(newCriteria);
    }
    setEstimatedReach(null);
  };

  const handleSegmentSelect = (segmentId: string) => {
    setSelectedSegment(segmentId);
    const seg = segments.find((s) => s.id === segmentId);
    if (seg) {
      try {
        const criteria = JSON.parse(seg.criteria) as SegmentCriteria;
        setTargetingCriteria(criteria);
        setInterestsText(criteria.interests?.join(', ') || '');
        setTargetingEnabled({
          ageRange: !!criteria.ageRange,
          location: !!criteria.location,
          gender: !!criteria.gender,
          language: !!criteria.language,
          interests: !!(criteria.interests && criteria.interests.length > 0),
          minScore: !!(criteria.minScore !== undefined && criteria.minScore > 0),
        });
        setEstimatedReach(null);
      } catch {
        toast({ title: 'Error', description: 'Could not parse segment criteria', variant: 'destructive' });
      }
    }
  };

  const handleEstimateReach = useCallback(async () => {
    setReachLoading(true);
    setEstimatedReach(null);
    try {
      const criteria: SegmentCriteria = {};
      const ef = targetingEnabled;
      if (ef.ageRange && targetingCriteria.ageRange) criteria.ageRange = targetingCriteria.ageRange;
      if (ef.location && targetingCriteria.location) criteria.location = targetingCriteria.location;
      if (ef.gender && targetingCriteria.gender) criteria.gender = targetingCriteria.gender;
      if (ef.language && targetingCriteria.language) criteria.language = targetingCriteria.language;
      if (ef.interests && targetingCriteria.interests && targetingCriteria.interests.length > 0) {
        criteria.interests = targetingCriteria.interests;
      }
      if (ef.minScore && targetingCriteria.minScore !== undefined && targetingCriteria.minScore > 0) {
        criteria.minScore = targetingCriteria.minScore;
      }

      if (!hasActiveCriteria(criteria)) {
        toast({ title: 'No criteria set', description: 'Enable at least one targeting criterion.', variant: 'destructive' });
        setReachLoading(false);
        return;
      }

      const res = await fetch('/api/audience/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' },
        body: JSON.stringify({ criteria }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setEstimatedReach(json.data.totalMatched);
      } else {
        toast({ title: 'Estimate failed', description: json.error || 'Could not estimate reach', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setReachLoading(false);
    }
  }, [targetingCriteria, targetingEnabled, currentUser?.id, toast]);

  const getActiveCriteria = (): SegmentCriteria | null => {
    const criteria: SegmentCriteria = {};
    const ef = targetingEnabled;
    if (ef.ageRange && targetingCriteria.ageRange) criteria.ageRange = targetingCriteria.ageRange;
    if (ef.location && targetingCriteria.location) criteria.location = targetingCriteria.location;
    if (ef.gender && targetingCriteria.gender) criteria.gender = targetingCriteria.gender;
    if (ef.language && targetingCriteria.language) criteria.language = targetingCriteria.language;
    if (ef.interests && targetingCriteria.interests && targetingCriteria.interests.length > 0) {
      criteria.interests = targetingCriteria.interests;
    }
    if (ef.minScore && targetingCriteria.minScore !== undefined && targetingCriteria.minScore > 0) {
      criteria.minScore = targetingCriteria.minScore;
    }
    return hasActiveCriteria(criteria) ? criteria : null;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.videoUrl.trim()) newErrors.videoUrl = 'Video URL is required';
    else {
      try {
        if (!form.videoUrl.startsWith('/')) {
          new URL(form.videoUrl);
        }
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
        const activeCriteria = getActiveCriteria();
        await createPoll({
          videoId: video.id,
          question: pollQuestion.trim(),
          options: filledOptions,
          isPaid: isPaidPoll,
          rewardPerResponse: isPaidPoll ? parseFloat(paidPollSettings.rewardPerResponse) || undefined : undefined,
          totalRewardPool: isPaidPoll ? parseFloat(paidPollSettings.totalRewardPool) || undefined : undefined,
          maxResponses: paidPollSettings.maxResponses ? parseInt(paidPollSettings.maxResponses, 10) : undefined,
          closesAt: paidPollSettings.closesAt || undefined,
          targetingCriteria: (activeCriteria || undefined) as Record<string, unknown> | undefined,
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

  const activeBadges = criteriaToBreakdown(getActiveCriteria() || {});

  if (!currentUser) return null;

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <Button variant="ghost" onClick={() => onNavigate('explore')} className="shrink-0">
          <span className="text-sm">Back to Explore</span>
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

                {/* Thumbnail Section */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-orange-500" />
                    Thumbnail (optional)
                  </Label>

                  {thumbnailPreview ? (
                    <div className="relative group rounded-xl overflow-hidden border border-border">
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail preview"
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleThumbnailUpload(file);
                            }}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="bg-white/90 hover:bg-white text-foreground"
                            onClick={() => {}}
                            disabled={uploadingThumbnail}
                          >
                            {uploadingThumbnail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            Change
                          </Button>
                        </label>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="bg-white/90 hover:bg-white text-destructive"
                          onClick={handleRemoveThumbnail}
                        >
                          <X className="w-3 h-3" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-muted-foreground/25 p-4 flex flex-col items-center gap-3">
                      <div className="flex items-center gap-3 w-full">
                        <label className="cursor-pointer flex-1">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleThumbnailUpload(file);
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                            disabled={uploadingThumbnail}
                            onClick={() => {}}
                          >
                            {uploadingThumbnail ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                            {uploadingThumbnail ? 'Uploading...' : 'Upload Image'}
                          </Button>
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-muted-foreground"
                          onClick={() => setShowUrlInput(!showUrlInput)}
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          Paste URL
                        </Button>
                      </div>
                      {uploading && (
                        <p className="text-xs text-muted-foreground">Auto-thumbnail will be generated after upload...</p>
                      )}
                      {showUrlInput && (
                        <div className="w-full space-y-1">
                          <Input
                            placeholder="https://example.com/thumbnail.jpg"
                            value={form.thumbnailUrl}
                            onChange={(e) => {
                              updateForm('thumbnailUrl', e.target.value);
                              if (e.target.value.trim()) {
                                setThumbnailPreview(e.target.value.trim());
                              } else {
                                setThumbnailPreview(null);
                              }
                            }}
                            className="h-8 text-sm"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            {form.thumbnailUrl ? (
                              <span className="text-emerald-600">Preview updated</span>
                            ) : (
                              'Enter an image URL to use as thumbnail'
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
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
                        {/* Wallet balance display */}
                        <div className="sm:col-span-2 flex items-center justify-between px-3 py-2 rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-medium">Your Balance</span>
                          </div>
                          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">${(currentUser?.walletBalance ?? 0).toFixed(2)}</span>
                        </div>
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
                        {/* Auto-calculated Total Pool Needed */}
                        {(parseFloat(paidPollSettings.rewardPerResponse) > 0) && (
                          <div className="sm:col-span-2 flex items-center justify-between px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                            <span className="text-xs text-muted-foreground">Total Pool Needed</span>
                            <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                              ${((parseFloat(paidPollSettings.rewardPerResponse) || 0) * (parseInt(paidPollSettings.maxResponses) || 0)).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {/* Insufficient balance warning */}
                        {currentUser && (parseFloat(paidPollSettings.rewardPerResponse) || 0) * (parseInt(paidPollSettings.maxResponses) || 0) > currentUser.walletBalance && (
                          <div className="sm:col-span-2 flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-xs text-red-700 dark:text-red-300">Insufficient balance. Please deposit funds to your wallet.</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="ml-auto text-xs shrink-0 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => onNavigate('wallet')}
                            >
                              <Wallet className="w-3 h-3" />
                              Wallet
                            </Button>
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label className="text-xs">Initial Fund Amount ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={paidPollSettings.totalRewardPool}
                            onChange={(e) =>
                              setPaidPollSettings((prev) => ({ ...prev, totalRewardPool: e.target.value }))
                            }
                          />
                          <p className="text-[10px] text-muted-foreground">Fund the poll after creation if needed</p>
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

                    {/* ─── Target Audience Section ─── */}
                    {isPaidPoll && (
                      <div className="pt-2 border-t">
                        <button
                          type="button"
                          className="flex items-center justify-between w-full py-2 group"
                          onClick={() => setShowTargeting(!showTargeting)}
                        >
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-semibold">Target Audience</span>
                            {activeBadges.length > 0 && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                                {activeBadges.length} criteria
                              </Badge>
                            )}
                          </div>
                          {showTargeting ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>

                        {showTargeting && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-4 pt-3"
                          >
                            {/* Quick Apply from Segment */}
                            {segments.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Quick Apply from Saved Segment</Label>
                                <Select value={selectedSegment} onValueChange={handleSegmentSelect}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a segment..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {segments.map((seg) => (
                                      <SelectItem key={seg.id} value={seg.id}>
                                        {seg.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Criteria Summary Badges */}
                            {activeBadges.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 p-2 rounded-md bg-orange-50/50 dark:bg-orange-950/20">
                                {activeBadges.map((b, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    <span className="text-muted-foreground mr-1">{b.label}:</span>
                                    <span className="capitalize">{b.value}</span>
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Manual Criteria Setup */}
                            <div className="space-y-3">
                              {/* Age Range */}
                              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50">
                                <input
                                  type="checkbox"
                                  checked={targetingEnabled.ageRange}
                                  onChange={(e) => updateTargetingEnabled('ageRange', e.target.checked)}
                                  className="mt-1 accent-orange-500"
                                />
                                <div className="flex-1 space-y-1">
                                  <Label className="text-sm font-medium">Age Range</Label>
                                  <select
                                    disabled={!targetingEnabled.ageRange}
                                    value={targetingCriteria.ageRange || ''}
                                    onChange={(e) => {
                                      setTargetingCriteria((prev) => ({ ...prev, ageRange: e.target.value }));
                                      setEstimatedReach(null);
                                    }}
                                    className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <option value="">Select...</option>
                                    {AGE_RANGES.map((r) => (
                                      <option key={r} value={r}>{r}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Location */}
                              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50">
                                <input
                                  type="checkbox"
                                  checked={targetingEnabled.location}
                                  onChange={(e) => updateTargetingEnabled('location', e.target.checked)}
                                  className="mt-1 accent-orange-500"
                                />
                                <div className="flex-1 space-y-1">
                                  <Label className="text-sm font-medium">Location</Label>
                                  <Input
                                    disabled={!targetingEnabled.location}
                                    placeholder="e.g. New York"
                                    value={targetingCriteria.location || ''}
                                    onChange={(e) => {
                                      setTargetingCriteria((prev) => ({ ...prev, location: e.target.value }));
                                      setEstimatedReach(null);
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>

                              {/* Gender */}
                              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50">
                                <input
                                  type="checkbox"
                                  checked={targetingEnabled.gender}
                                  onChange={(e) => updateTargetingEnabled('gender', e.target.checked)}
                                  className="mt-1 accent-orange-500"
                                />
                                <div className="flex-1 space-y-1">
                                  <Label className="text-sm font-medium">Gender</Label>
                                  <select
                                    disabled={!targetingEnabled.gender}
                                    value={targetingCriteria.gender || ''}
                                    onChange={(e) => {
                                      setTargetingCriteria((prev) => ({ ...prev, gender: e.target.value }));
                                      setEstimatedReach(null);
                                    }}
                                    className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <option value="">Select...</option>
                                    {GENDERS.map((g) => (
                                      <option key={g} value={g}>{g.replace(/-/g, ' ')}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Language */}
                              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50">
                                <input
                                  type="checkbox"
                                  checked={targetingEnabled.language}
                                  onChange={(e) => updateTargetingEnabled('language', e.target.checked)}
                                  className="mt-1 accent-orange-500"
                                />
                                <div className="flex-1 space-y-1">
                                  <Label className="text-sm font-medium">Language</Label>
                                  <Input
                                    disabled={!targetingEnabled.language}
                                    placeholder="e.g. en, es"
                                    value={targetingCriteria.language || ''}
                                    onChange={(e) => {
                                      setTargetingCriteria((prev) => ({ ...prev, language: e.target.value }));
                                      setEstimatedReach(null);
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>

                              {/* Interests */}
                              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50">
                                <input
                                  type="checkbox"
                                  checked={targetingEnabled.interests}
                                  onChange={(e) => updateTargetingEnabled('interests', e.target.checked)}
                                  className="mt-1 accent-orange-500"
                                />
                                <div className="flex-1 space-y-1">
                                  <Label className="text-sm font-medium">Interests</Label>
                                  <Input
                                    disabled={!targetingEnabled.interests}
                                    placeholder="tech, music (comma-separated)"
                                    value={interestsText}
                                    onChange={(e) => {
                                      const text = e.target.value;
                                      const interests = text.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
                                      setInterestsText(text);
                                      setTargetingCriteria((prev) => ({ ...prev, interests }));
                                      setEstimatedReach(null);
                                    }}
                                    className="h-8 text-sm"
                                  />
                                  {targetingEnabled.interests && targetingCriteria.interests && targetingCriteria.interests.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {targetingCriteria.interests.map((interest) => (
                                        <Badge key={interest} variant="secondary" className="text-xs bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
                                          {interest}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Min Score */}
                              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50">
                                <input
                                  type="checkbox"
                                  checked={targetingEnabled.minScore}
                                  onChange={(e) => updateTargetingEnabled('minScore', e.target.checked)}
                                  className="mt-1 accent-orange-500"
                                />
                                <div className="flex-1 space-y-1">
                                  <Label className="text-sm font-medium">Minimum Member Score</Label>
                                  <Input
                                    type="number"
                                    disabled={!targetingEnabled.minScore}
                                    placeholder="e.g. 100"
                                    min={0}
                                    max={1000}
                                    value={targetingCriteria.minScore ?? ''}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      setTargetingCriteria((prev) => ({ ...prev, minScore: val }));
                                      setEstimatedReach(null);
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Estimate Reach */}
                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleEstimateReach}
                                disabled={reachLoading}
                                className="gap-2"
                              >
                                {reachLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                                Estimate Audience
                              </Button>
                              {estimatedReach !== null && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-sm">
                                  <Users className="w-4 h-4 text-orange-500" />
                                  <span className="font-semibold">≈ {estimatedReach.toLocaleString()}</span>
                                  <span className="text-muted-foreground text-xs">users match</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
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
                    {activeBadges.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <Badge variant="outline" className="text-xs border-orange-300 text-orange-600 gap-1">
                          <Target className="w-3 h-3" />
                          Targeted
                        </Badge>
                        {activeBadges.slice(0, 3).map((b, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {b.value}
                          </Badge>
                        ))}
                      </div>
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

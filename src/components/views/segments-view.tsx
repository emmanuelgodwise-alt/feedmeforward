'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import { useAudienceStore } from '@/stores/audience-store';
import { useToast } from '@/hooks/use-toast';
import { QuickNav } from '@/components/quick-nav';
import {
  Target,
  Plus,
  Search,
  Loader2,
  Trash2,
  Pencil,
  Send,
  ChevronDown,
  ChevronUp,
  Users,
  Eye,
  X,
} from 'lucide-react';

interface ViewProps {
  onNavigate: (view: string) => void;
}

interface SegmentCriteria {
  ageRange?: string;
  location?: string;
  gender?: string;
  language?: string;
  interests?: string[];
  minScore?: number;
}

interface Segment {
  id: string;
  creatorId: string;
  name: string;
  description: string | null;
  criteria: string; // JSON string
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+'];
const GENDERS = ['male', 'female', 'non-binary', 'prefer-not-to-say'];

const emptyCriteria: SegmentCriteria = {};
const emptyForm = {
  name: '',
  description: '',
  criteria: { ...emptyCriteria } as SegmentCriteria,
  enabledFields: {
    ageRange: false,
    location: false,
    gender: false,
    language: false,
    interests: false,
    minScore: false,
  },
  interestsText: '',
};

type EnabledFields = typeof emptyForm.enabledFields;

const staggerContainer = { animate: { transition: { staggerChildren: 0.06 } } };
const staggerItem = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export function SegmentsView({ onNavigate }: ViewProps) {
  const { currentUser } = useAuthStore();
  const { setSelectedSegmentCriteria } = useAudienceStore();
  const { toast } = useToast();

  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchSegments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/segments?${params.toString()}`, {
        headers: { 'X-User-Id': currentUser?.id || '' },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSegments(json.data);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, search]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const resetForm = useCallback(() => {
    setForm({ ...emptyForm, criteria: { ...emptyCriteria } });
    setPreviewCount(null);
    setEditingId(null);
  }, []);

  const handlePreview = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewCount(null);
    try {
      const criteria: SegmentCriteria = {};
      const ef = form.enabledFields;
      if (ef.ageRange && form.criteria.ageRange) criteria.ageRange = form.criteria.ageRange;
      if (ef.location && form.criteria.location) criteria.location = form.criteria.location;
      if (ef.gender && form.criteria.gender) criteria.gender = form.criteria.gender;
      if (ef.language && form.criteria.language) criteria.language = form.criteria.language;
      if (ef.interests && form.criteria.interests && form.criteria.interests.length > 0) {
        criteria.interests = form.criteria.interests;
      }
      if (ef.minScore && form.criteria.minScore !== undefined && form.criteria.minScore > 0) {
        criteria.minScore = form.criteria.minScore;
      }

      const res = await fetch('/api/audience/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || '',
        },
        body: JSON.stringify({ criteria }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setPreviewCount(json.data.totalMatched);
      } else {
        toast({ title: 'Preview failed', description: json.error || 'Could not match audience', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', description: 'Could not preview reach', variant: 'destructive' });
    } finally {
      setPreviewLoading(false);
    }
  }, [form, currentUser?.id, toast]);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      toast({ title: 'Name required', description: 'Please enter a segment name', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const criteria: SegmentCriteria = {};
      const ef = form.enabledFields;
      if (ef.ageRange && form.criteria.ageRange) criteria.ageRange = form.criteria.ageRange;
      if (ef.location && form.criteria.location) criteria.location = form.criteria.location;
      if (ef.gender && form.criteria.gender) criteria.gender = form.criteria.gender;
      if (ef.language && form.criteria.language) criteria.language = form.criteria.language;
      if (ef.interests && form.criteria.interests && form.criteria.interests.length > 0) {
        criteria.interests = form.criteria.interests;
      }
      if (ef.minScore && form.criteria.minScore !== undefined && form.criteria.minScore > 0) {
        criteria.minScore = form.criteria.minScore;
      }

      const url = editingId ? `/api/segments/${editingId}` : '/api/segments';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || '',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          criteria,
        }),
      });
      const json = await res.json();

      if (json.success) {
        toast({
          title: editingId ? 'Segment updated' : 'Segment created',
          description: editingId ? `"${form.name}" has been updated.` : `"${form.name}" has been saved.`,
        });
        resetForm();
        setShowCreateForm(false);
        fetchSegments();
      } else {
        toast({ title: 'Save failed', description: json.error || 'Could not save segment', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', description: 'Could not save segment', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [form, editingId, currentUser?.id, toast, resetForm, fetchSegments]);

  const handleEdit = useCallback((segment: Segment) => {
    try {
      const criteria = JSON.parse(segment.criteria) as SegmentCriteria;
      const interestsText = criteria.interests ? criteria.interests.join(', ') : '';
      setForm({
        name: segment.name,
        description: segment.description || '',
        criteria,
        enabledFields: {
          ageRange: !!criteria.ageRange,
          location: !!criteria.location,
          gender: !!criteria.gender,
          language: !!criteria.language,
          interests: !!(criteria.interests && criteria.interests.length > 0),
          minScore: !!(criteria.minScore !== undefined && criteria.minScore > 0),
        },
        interestsText,
      });
      setEditingId(segment.id);
      setShowCreateForm(true);
      setPreviewCount(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      toast({ title: 'Error', description: 'Could not load segment criteria', variant: 'destructive' });
    }
  }, [toast]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/segments/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': currentUser?.id || '' },
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: 'Segment deleted', description: 'The segment has been removed.' });
        setDeleteConfirmId(null);
        fetchSegments();
      } else {
        toast({ title: 'Delete failed', description: json.error || 'Could not delete segment', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', description: 'Could not delete segment', variant: 'destructive' });
    }
  }, [currentUser?.id, toast, fetchSegments]);

  const updateEnabled = (field: keyof EnabledFields, enabled: boolean) => {
    setForm((prev) => {
      const newEnabled = { ...prev.enabledFields, [field]: enabled };
      const newCriteria = { ...prev.criteria };
      if (!enabled) {
        delete newCriteria[field];
      }
      return { ...prev, enabledFields: newEnabled, criteria: newCriteria };
    });
    setPreviewCount(null);
  };

  const parseCriteriaBadges = (criteriaStr: string) => {
    try {
      const c = JSON.parse(criteriaStr) as SegmentCriteria;
      const badges: { label: string; value: string }[] = [];
      if (c.ageRange) badges.push({ label: 'Age', value: c.ageRange });
      if (c.location) badges.push({ label: 'Location', value: c.location });
      if (c.gender) badges.push({ label: 'Gender', value: c.gender });
      if (c.language) badges.push({ label: 'Language', value: c.language });
      if (c.minScore) badges.push({ label: 'Score ≥', value: String(c.minScore) });
      if (c.interests && c.interests.length > 0) {
        c.interests.slice(0, 3).forEach((i) => badges.push({ label: 'Interest', value: i }));
        if (c.interests.length > 3) badges.push({ label: 'Interest', value: `+${c.interests.length - 3} more` });
      }
      return badges;
    } catch {
      return [];
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="min-h-screen px-4 py-8 max-w-4xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')} className="gap-2">
          <span className="text-sm">Back to Dashboard</span>
        </Button>
      </motion.div>

      <motion.div variants={staggerItem} className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Audience Segments</h1>
            <p className="text-sm text-muted-foreground">Create & manage saved audience segments</p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreateForm((prev) => !prev);
          }}
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm gap-2"
        >
          {showCreateForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreateForm ? 'Hide Form' : 'New Segment'}
        </Button>
      </motion.div>

      <QuickNav onNavigate={onNavigate} activeView="segments" />

      {/* Create/Edit Form */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-8"
        >
          <Card className="border-2 border-orange-200 dark:border-orange-800/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {editingId ? 'Edit Segment' : 'Create New Segment'}
                  </CardTitle>
                  <CardDescription>Define criteria to target specific audience groups</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    resetForm();
                    setShowCreateForm(false);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seg-name">Segment Name *</Label>
                  <Input
                    id="seg-name"
                    placeholder="e.g. Young Tech Enthusiasts"
                    value={form.name}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, name: e.target.value }));
                      setPreviewCount(null);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seg-desc">Description</Label>
                  <Input
                    id="seg-desc"
                    placeholder="Optional description"
                    value={form.description}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, description: e.target.value }));
                    }}
                  />
                </div>
              </div>

              {/* Criteria Toggles */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Criteria</p>

                {/* Age Range */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <input
                    type="checkbox"
                    checked={form.enabledFields.ageRange}
                    onChange={(e) => updateEnabled('ageRange', e.target.checked)}
                    className="mt-1 accent-orange-500"
                  />
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium">Age Range</Label>
                    <select
                      disabled={!form.enabledFields.ageRange}
                      value={form.criteria.ageRange || ''}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          criteria: { ...prev.criteria, ageRange: e.target.value },
                        }));
                        setPreviewCount(null);
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select age range...</option>
                      {AGE_RANGES.map((range) => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <input
                    type="checkbox"
                    checked={form.enabledFields.location}
                    onChange={(e) => updateEnabled('location', e.target.checked)}
                    className="mt-1 accent-orange-500"
                  />
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium">Location</Label>
                    <Input
                      disabled={!form.enabledFields.location}
                      placeholder="e.g. New York, London"
                      value={form.criteria.location || ''}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          criteria: { ...prev.criteria, location: e.target.value },
                        }));
                        setPreviewCount(null);
                      }}
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <input
                    type="checkbox"
                    checked={form.enabledFields.gender}
                    onChange={(e) => updateEnabled('gender', e.target.checked)}
                    className="mt-1 accent-orange-500"
                  />
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium">Gender</Label>
                    <select
                      disabled={!form.enabledFields.gender}
                      value={form.criteria.gender || ''}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          criteria: { ...prev.criteria, gender: e.target.value },
                        }));
                        setPreviewCount(null);
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select gender...</option>
                      {GENDERS.map((g) => (
                        <option key={g} value={g}>{g.replace(/-/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Language */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <input
                    type="checkbox"
                    checked={form.enabledFields.language}
                    onChange={(e) => updateEnabled('language', e.target.checked)}
                    className="mt-1 accent-orange-500"
                  />
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium">Language</Label>
                    <Input
                      disabled={!form.enabledFields.language}
                      placeholder="e.g. en, fr, es"
                      value={form.criteria.language || ''}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          criteria: { ...prev.criteria, language: e.target.value },
                        }));
                        setPreviewCount(null);
                      }}
                    />
                  </div>
                </div>

                {/* Interests */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <input
                    type="checkbox"
                    checked={form.enabledFields.interests}
                    onChange={(e) => updateEnabled('interests', e.target.checked)}
                    className="mt-1 accent-orange-500"
                  />
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium">Interests</Label>
                    <Input
                      disabled={!form.enabledFields.interests}
                      placeholder="e.g. tech, music, sports (comma-separated)"
                      value={form.interestsText}
                      onChange={(e) => {
                        const text = e.target.value;
                        const interests = text
                          .split(',')
                          .map((s) => s.trim().toLowerCase())
                          .filter(Boolean);
                        setForm((prev) => ({
                          ...prev,
                          interestsText: text,
                          criteria: { ...prev.criteria, interests },
                        }));
                        setPreviewCount(null);
                      }}
                    />
                    {form.enabledFields.interests && form.criteria.interests && form.criteria.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {form.criteria.interests.map((interest) => (
                          <Badge key={interest} variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Min Score */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <input
                    type="checkbox"
                    checked={form.enabledFields.minScore}
                    onChange={(e) => updateEnabled('minScore', e.target.checked)}
                    className="mt-1 accent-orange-500"
                  />
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium">Minimum Member Score</Label>
                    <Input
                      type="number"
                      disabled={!form.enabledFields.minScore}
                      placeholder="e.g. 100"
                      min={0}
                      max={1000}
                      value={form.criteria.minScore ?? ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setForm((prev) => ({
                          ...prev,
                          criteria: { ...prev.criteria, minScore: val },
                        }));
                        setPreviewCount(null);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Preview & Save Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  disabled={previewLoading}
                  className="gap-2"
                >
                  {previewLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  Preview Reach
                </Button>

                {previewCount !== null && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-sm">
                    <Users className="w-4 h-4 text-orange-500" />
                    <span className="font-semibold">{previewCount.toLocaleString()}</span>
                    <span className="text-muted-foreground">users match</span>
                  </div>
                )}

                <div className="flex-1" />

                <Button
                  variant="ghost"
                  onClick={() => {
                    resetForm();
                    setShowCreateForm(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Target className="w-4 h-4" />
                  )}
                  {editingId ? 'Update Segment' : 'Save Segment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search & Segments List */}
      <motion.div variants={staggerItem}>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search segments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <span className="ml-2 text-sm text-muted-foreground">Loading segments...</span>
          </div>
        ) : segments.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                <Target className="w-8 h-8 text-orange-500" />
              </div>
              <div className="text-center">
                <p className="font-medium">No segments yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first audience segment to start targeting specific groups.
                </p>
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setShowCreateForm(true);
                }}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm gap-2"
              >
                <Plus className="w-4 h-4" />
                Create First Segment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {segments.map((segment) => {
              const badges = parseCriteriaBadges(segment.criteria);
              return (
                <motion.div
                  key={segment.id}
                  whileHover={{ y: -1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{segment.name}</CardTitle>
                          {segment.description && (
                            <CardDescription className="mt-0.5 line-clamp-2">{segment.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                            onClick={() => handleEdit(segment)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            onClick={() => {
                              try {
                                const criteria = JSON.parse(segment.criteria);
                                setSelectedSegmentCriteria(criteria);
                                toast({ title: 'Segment applied', description: 'Targeting criteria will be loaded in Create Lead Clip.' });
                                onNavigate('create-lead');
                              } catch {
                                toast({ title: 'Error', description: 'Could not load segment criteria', variant: 'destructive' });
                              }
                            }}
                            title="Use this segment to create a lead"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          {deleteConfirmId === segment.id ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => handleDelete(segment.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => setDeleteConfirmId(segment.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-3">
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {badges.length > 0 ? (
                          badges.map((b, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              <span className="text-muted-foreground mr-1">{b.label}:</span>
                              <span className="capitalize">{b.value}</span>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No specific criteria</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {segment.userCount.toLocaleString()} users
                          </span>
                          <span>{formatDate(segment.createdAt)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

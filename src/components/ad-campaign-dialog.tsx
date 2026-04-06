'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import { useAdStore } from '@/stores/ad-store';
import type { AdType, AdCampaign, CreateCampaignData } from '@/stores/ad-store';
import { CATEGORIES } from '@/types';
import {
  Megaphone,
  Loader2,
  Wallet,
  Sparkles,
  Image,
  DollarSign,
  Target,
  Check,
  AlertTriangle,
  Rocket,
  ArrowLeft,
  Globe,
  Users,
  Heart,
  BarChart3,
  Calendar,
  Eye,
  MousePointerClick,
} from 'lucide-react';

interface AdCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCampaign?: AdCampaign | null;
  onSuccess?: () => void;
}

const AD_TYPE_OPTIONS: Array<{ value: AdType; label: string; icon: string; description: string }> = [
  { value: 'banner', label: 'In-Stream Banner', icon: '🖼️', description: 'Non-intrusive banner overlay on video content' },
  { value: 'preroll', label: 'Pre-Roll Ad', icon: '▶️', description: 'Full-screen video overlay before playback' },
  { value: 'post_vote', label: 'Post-Vote Card', icon: '🗳️', description: 'Inline card shown after a user votes on a poll' },
  { value: 'native', label: 'Native Feed', icon: '📱', description: 'Blends naturally into the video feed' },
];

const BUDGET_PRESETS = [25, 50, 100, 250, 500, 1000];
const TOTAL_STEPS = 5;

export function AdCampaignDialog({
  open,
  onOpenChange,
  editCampaign,
  onSuccess,
}: AdCampaignDialogProps) {
  const { currentUser } = useAuthStore();
  const { createCampaign, isLoading } = useAdStore();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLaunching, setIsLaunching] = useState(false);

  // Step 1: Campaign basics
  const [title, setTitle] = useState(editCampaign?.title || '');
  const [description, setDescription] = useState(editCampaign?.description || '');
  const [adType, setAdType] = useState<AdType>(editCampaign?.adType || 'banner');
  const [targetUrl, setTargetUrl] = useState(editCampaign?.targetUrl || '');

  // Step 2: Creative
  const [imageUrl, setImageUrl] = useState(editCampaign?.imageUrl || '');

  // Step 3: Budget & Bidding
  const [budget, setBudget] = useState<number | null>(editCampaign?.totalBudget || null);
  const [customBudget, setCustomBudget] = useState(editCampaign?.totalBudget ? String(editCampaign.totalBudget) : '');
  const [dailyBudget, setDailyBudget] = useState(editCampaign?.dailyBudget ? String(editCampaign.dailyBudget) : '');
  const [cpmBid, setCpmBid] = useState(editCampaign?.cpmBid ? String(editCampaign.cpmBid) : '');
  const [cpcBid, setCpcBid] = useState(editCampaign?.cpcBid ? String(editCampaign.cpcBid) : '');
  const [biddingModel, setBiddingModel] = useState<'cpm' | 'cpc'>(
    editCampaign?.cpmBid ? 'cpm' : editCampaign?.cpcBid ? 'cpc' : 'cpm'
  );

  // Step 4: Targeting
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [location, setLocation] = useState('');
  const [gender, setGender] = useState('');
  const [interests, setInterests] = useState('');
  const [categories, setCategories] = useState('');
  const [minScore, setMinScore] = useState('');

  const resetState = () => {
    setStep(1);
    setTitle(editCampaign?.title || '');
    setDescription(editCampaign?.description || '');
    setAdType(editCampaign?.adType || 'banner');
    setTargetUrl(editCampaign?.targetUrl || '');
    setImageUrl(editCampaign?.imageUrl || '');
    setBudget(editCampaign?.totalBudget || null);
    setCustomBudget(editCampaign?.totalBudget ? String(editCampaign.totalBudget) : '');
    setDailyBudget(editCampaign?.dailyBudget ? String(editCampaign.dailyBudget) : '');
    setCpmBid(editCampaign?.cpmBid ? String(editCampaign.cpmBid) : '');
    setCpcBid(editCampaign?.cpcBid ? String(editCampaign.cpcBid) : '');
    setBiddingModel(editCampaign?.cpmBid ? 'cpm' : editCampaign?.cpcBid ? 'cpc' : 'cpm');
    setAgeMin('');
    setAgeMax('');
    setLocation('');
    setGender('');
    setInterests('');
    setCategories('');
    setMinScore('');
    setIsLaunching(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const effectiveBudget = budget ?? parseFloat(customBudget);
  const walletBalance = currentUser?.walletBalance ?? 0;

  const canProceedStep1 = title.trim().length > 0 && adType && targetUrl.trim().length > 0;
  const canProceedStep2 = true; // Image is optional
  const canProceedStep3 = effectiveBudget && effectiveBudget > 0 && effectiveBudget <= walletBalance;
  const canProceedStep4 = true; // Targeting is optional

  const STEP_LABELS = ['Basics', 'Creative', 'Budget', 'Targeting', 'Review'];

  const buildCampaignData = (): CreateCampaignData => {
    const data: CreateCampaignData = {
      title: title.trim(),
      description: description.trim(),
      adType,
      targetUrl: targetUrl.trim(),
      totalBudget: effectiveBudget!,
      cpmBid: biddingModel === 'cpm' && cpmBid ? parseFloat(cpmBid) : undefined,
      cpcBid: biddingModel === 'cpc' && cpcBid ? parseFloat(cpcBid) : undefined,
    };

    if (imageUrl.trim()) data.imageUrl = imageUrl.trim();
    if (dailyBudget) data.dailyBudget = parseFloat(dailyBudget);

    const targeting: CreateCampaignData['targetingCriteria'] = {};
    if (ageMin) targeting.ageMin = parseInt(ageMin);
    if (ageMax) targeting.ageMax = parseInt(ageMax);
    if (location) targeting.location = location;
    if (gender) targeting.gender = gender;
    if (interests) targeting.interests = interests;
    if (categories) targeting.categories = categories;
    if (minScore) targeting.minScore = parseInt(minScore);
    if (Object.keys(targeting).length > 0) data.targetingCriteria = targeting;

    return data;
  };

  const handleLaunch = async () => {
    if (!canProceedStep3) return;
    setIsLaunching(true);
    const data = buildCampaignData();
    const success = await createCampaign(data);
    if (success) {
      toast({
        title: 'Campaign launched!',
        description: `Your ad campaign "${title}" is now active and serving ads.`,
      });
      onSuccess?.();
      handleOpenChange(false);
    } else {
      toast({
        title: 'Campaign failed',
        description: 'Could not create ad campaign. Please check your details and try again.',
        variant: 'destructive',
      });
    }
    setIsLaunching(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-500" />
            {editCampaign ? 'Edit Ad Campaign' : 'Create Ad Campaign'}
          </DialogTitle>
          <DialogDescription>
            {editCampaign
              ? 'Update your ad campaign settings'
              : 'Set up a new ad campaign to reach your target audience'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 mb-5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  step >= s
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              {s < TOTAL_STEPS && (
                <div className={`flex-1 h-0.5 min-w-[8px] ${step > s ? 'bg-emerald-400' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Campaign Basics ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold">Campaign Basics</span>
              <span className="text-xs text-muted-foreground ml-auto">{STEP_LABELS[0]}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ad-title">Campaign Title *</Label>
              <Input
                id="ad-title"
                placeholder="e.g. Summer Sale 2025"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <p className="text-[10px] text-muted-foreground">{title.length}/100 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ad-description">Description</Label>
              <Textarea
                id="ad-description"
                placeholder="Brief description of your ad campaign..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={300}
              />
              <p className="text-[10px] text-muted-foreground">{description.length}/300 characters</p>
            </div>

            <div className="space-y-2">
              <Label>Ad Type *</Label>
              <div className="grid grid-cols-2 gap-2">
                {AD_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all ${
                      adType === opt.value
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-400/30'
                        : 'border-border hover:border-emerald-200 dark:hover:border-emerald-800/50'
                    }`}
                    onClick={() => setAdType(opt.value)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{opt.icon}</span>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ad-target-url">Destination URL *</Label>
              <Input
                id="ad-target-url"
                placeholder="https://your-landing-page.com"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                type="url"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Creative Upload ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Image className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold">Creative</span>
              <span className="text-xs text-muted-foreground ml-auto">{STEP_LABELS[1]}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ad-image-url">Ad Image URL</Label>
              <Input
                id="ad-image-url"
                placeholder="https://example.com/your-ad-image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 1200x628px for banners, 1920x1080px for pre-roll
              </p>
            </div>

            {/* Image Preview */}
            {imageUrl && (
              <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
                <div className="relative aspect-[16/9]">
                  <img
                    src={imageUrl}
                    alt="Ad creative preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML =
                        '<div class="w-full h-full flex items-center justify-center bg-muted"><p class="text-xs text-muted-foreground">Failed to load image</p></div>';
                    }}
                  />
                </div>
                <div className="px-3 py-2 bg-muted/50 flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">Ad Preview</p>
                  <Badge variant="secondary" className="text-[10px]">{adType}</Badge>
                </div>
              </div>
            )}

            {/* Preview card of how the ad might look */}
            <div className="rounded-lg border border-dashed border-border p-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Ad Preview</p>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] border-0">
                  Sponsored
                </Badge>
                {imageUrl && (
                  <div className="w-8 h-8 rounded bg-muted overflow-hidden shrink-0">
                    <img src={imageUrl} alt="Ad creative preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{title || 'Your Campaign Title'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {description || 'Your campaign description'}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 text-xs">
                  Learn More
                </Button>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Budget & Bidding ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold">Budget & Bidding</span>
              <span className="text-xs text-muted-foreground ml-auto">{STEP_LABELS[2]}</span>
            </div>

            {/* Wallet Balance */}
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span className="text-muted-foreground">Available Balance:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                ${walletBalance.toFixed(2)}
              </span>
              {(effectiveBudget || 0) > walletBalance && (
                <Badge variant="destructive" className="text-[10px] gap-1 ml-1">
                  <AlertTriangle className="w-3 h-3" />
                  Insufficient
                </Badge>
              )}
            </div>

            {/* Budget presets */}
            <div className="space-y-2">
              <Label>Total Budget *</Label>
              <div className="flex flex-wrap gap-2">
                {BUDGET_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      budget === preset
                        ? 'border-emerald-400 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                        : 'border-border hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                    onClick={() => {
                      setBudget(preset);
                      setCustomBudget('');
                    }}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Custom amount"
                  value={customBudget}
                  onChange={(e) => {
                    setCustomBudget(e.target.value);
                    setBudget(null);
                  }}
                  className="pl-7"
                />
              </div>
            </div>

            {/* Daily Budget (optional) */}
            <div className="space-y-2">
              <Label htmlFor="ad-daily-budget">Daily Budget Limit (optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="ad-daily-budget"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Leave empty for no daily limit"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            {/* Bidding Model */}
            <div className="space-y-2">
              <Label>Bidding Model</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`p-3 rounded-lg border text-left transition-all ${
                    biddingModel === 'cpm'
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-border hover:border-emerald-200'
                  }`}
                  onClick={() => setBiddingModel('cpm')}
                >
                  <p className="text-sm font-semibold">CPM</p>
                  <p className="text-[10px] text-muted-foreground">Cost per 1,000 impressions</p>
                </button>
                <button
                  type="button"
                  className={`p-3 rounded-lg border text-left transition-all ${
                    biddingModel === 'cpc'
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-border hover:border-emerald-200'
                  }`}
                  onClick={() => setBiddingModel('cpc')}
                >
                  <p className="text-sm font-semibold">CPC</p>
                  <p className="text-[10px] text-muted-foreground">Cost per click</p>
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={biddingModel === 'cpm' ? 'Max CPM bid (e.g. 5.00)' : 'Max CPC bid (e.g. 0.50)'}
                  value={biddingModel === 'cpm' ? cpmBid : cpcBid}
                  onChange={(e) => {
                    if (biddingModel === 'cpm') setCpmBid(e.target.value);
                    else setCpcBid(e.target.value);
                  }}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={!canProceedStep3}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Targeting ── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold">Audience Targeting</span>
              <span className="text-xs text-muted-foreground ml-auto">{STEP_LABELS[3]}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              All targeting is optional. Leave fields blank for broad reach.
            </p>

            {/* Age Range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                Age Range
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min="13"
                  max="100"
                  placeholder="Min age (e.g. 18)"
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                />
                <Input
                  type="number"
                  min="13"
                  max="100"
                  placeholder="Max age (e.g. 45)"
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                Location
              </Label>
              <Input
                placeholder="e.g. Lagos, Nigeria or United States"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-muted-foreground" />
                Gender
              </Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="All genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non-binary">Non-binary</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Interests */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                Interests
              </Label>
              <Input
                placeholder="e.g. tech, gaming, fashion, food (comma-separated)"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
            </div>

            {/* Video Categories */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                Video Categories
              </Label>
              <Select value={categories} onValueChange={setCategories}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat.toLowerCase()}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Min Score */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                Min Member Score
              </Label>
              <Input
                type="number"
                min="0"
                max="1000"
                placeholder="Minimum creator score (0-1000)"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Only show ads on videos from creators with this score or higher
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(3)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={() => setStep(5)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                Review & Launch
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Review & Launch ── */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Rocket className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold">Review & Launch</span>
              <span className="text-xs text-muted-foreground ml-auto">{STEP_LABELS[4]}</span>
            </div>

            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400" />
              <CardContent className="p-4 space-y-4">
                {/* Campaign Preview */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      <Megaphone className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{title}</p>
                    <p className="text-xs text-muted-foreground">{AD_TYPE_OPTIONS.find(o => o.value === adType)?.label}</p>
                  </div>
                </div>

                {/* Summary rows */}
                <div className="space-y-2 text-sm">
                  {description && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Description</span>
                      <span className="text-right max-w-[260px] truncate">{description}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Destination URL</span>
                    <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[260px]">{targetUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ad Type</span>
                    <span className="font-medium">{AD_TYPE_OPTIONS.find(o => o.value === adType)?.label}</span>
                  </div>

                  <div className="border-t pt-2 mt-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Budget</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                      ${(effectiveBudget || 0).toFixed(2)}
                    </span>
                  </div>
                  {dailyBudget && parseFloat(dailyBudget) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily Limit</span>
                      <span className="font-medium">${parseFloat(dailyBudget).toFixed(2)}/day</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bidding</span>
                    <span className="font-medium capitalize">
                      {biddingModel.toUpperCase()} — $
                      {(biddingModel === 'cpm' ? parseFloat(cpmBid || '0') : parseFloat(cpcBid || '0')).toFixed(2)}
                    </span>
                  </div>

                  {/* Targeting summary */}
                  {(location || ageMin || ageMax || gender || interests || categories || minScore) && (
                    <>
                      <div className="border-t pt-2 mt-2" />
                      <p className="text-xs font-semibold text-muted-foreground">Targeting</p>
                      <div className="flex flex-wrap gap-1.5">
                        {location && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Globe className="w-2.5 h-2.5" />{location}
                          </Badge>
                        )}
                        {ageMin && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Users className="w-2.5 h-2.5" />
                            {ageMin}{ageMax ? `-${ageMax}` : '+'}
                          </Badge>
                        )}
                        {gender && gender !== 'all' && (
                          <Badge variant="secondary" className="text-[10px]">{gender}</Badge>
                        )}
                        {interests && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Sparkles className="w-2.5 h-2.5" />{interests}
                          </Badge>
                        )}
                        {categories && categories !== 'all' && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <BarChart3 className="w-2.5 h-2.5" />{categories}
                          </Badge>
                        )}
                        {minScore && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            Min Score: {minScore}
                          </Badge>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Insufficient balance warning */}
                {(effectiveBudget || 0) > walletBalance && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Insufficient balance. Deposit ${((effectiveBudget || 0) - walletBalance).toFixed(2)} more to your wallet.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(4)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleLaunch}
                disabled={isLaunching || isLoading || (effectiveBudget || 0) > walletBalance}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white gap-2"
              >
                {isLaunching || isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Launching...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Launch Campaign
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

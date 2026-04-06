'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import {
  Briefcase,
  Loader2,
  Save,
  AlertTriangle,
  ArrowUpCircle,
  Globe,
  Mail,
  Building2,
  FileText,
} from 'lucide-react';

interface BusinessProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

const BUSINESS_CATEGORIES = [
  'Technology',
  'Entertainment',
  'Education',
  'Health',
  'Finance',
  'Food',
  'Fashion',
  'Sports',
  'Music',
  'Other',
];

function isValidEmail(email: string): boolean {
  if (!email) return true; // empty is ok (optional field)
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidUrl(url: string): boolean {
  if (!url) return true; // empty is ok (optional field)
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function BusinessProfileDialog({
  open,
  onOpenChange,
  onSave,
}: BusinessProfileDialogProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    category: '',
    businessEmail: '',
    websiteUrl: '',
    bio: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isCreator = currentUser?.role === 'creator';

  useEffect(() => {
    if (open && currentUser) {
      if (!isCreator) return;
      setLoading(true);
      setErrors({});
      fetch('/api/creator/business-profile', {
        headers: { 'X-User-Id': currentUser.id },
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.profile) {
            setForm({
              businessName: json.profile.businessName || '',
              category: json.profile.category || '',
              businessEmail: json.profile.businessEmail || '',
              websiteUrl: json.profile.websiteUrl || '',
              bio: json.profile.bio || '',
            });
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, currentUser, isCreator]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (form.businessEmail && !isValidEmail(form.businessEmail)) {
      newErrors.businessEmail = 'Please enter a valid email address';
    }
    if (form.websiteUrl && !isValidUrl(form.websiteUrl)) {
      newErrors.websiteUrl = 'Please enter a valid URL (e.g. https://example.com)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/creator/business-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id,
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: 'Business profile updated! ✅',
          description: 'Your business information has been saved.',
        });
        useAuthStore.getState().refreshUser();
        onSave?.();
        onOpenChange(false);
      } else {
        toast({
          title: 'Failed to save',
          description: json.error || 'Something went wrong',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Network error',
        description: 'Failed to save business profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-orange-500" />
            Business Profile
          </DialogTitle>
          <DialogDescription>
            Manage your creator business information
          </DialogDescription>
        </DialogHeader>

        {!isCreator ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/50 dark:to-amber-950/30 flex items-center justify-center mx-auto mb-4">
              <ArrowUpCircle className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Upgrade to Creator</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              Business tools are available for creator accounts. Upgrade your account to access
              business profile settings, subscription tiers, and analytics.
            </p>
            <Button
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white gap-2"
              onClick={() => onOpenChange(false)}
            >
              <AlertTriangle className="w-4 h-4" />
              Learn More
            </Button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="bp-name" className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-500" />
                Business Name
              </Label>
              <Input
                id="bp-name"
                placeholder="Your business or brand name"
                value={form.businessName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, businessName: e.target.value }))
                }
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="bp-category" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" />
                Business Category
              </Label>
              <Select
                value={form.category}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, category: val }))
                }
              >
                <SelectTrigger id="bp-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Business Email */}
            <div className="space-y-2">
              <Label htmlFor="bp-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-500" />
                Business Email
              </Label>
              <Input
                id="bp-email"
                type="email"
                placeholder="business@example.com"
                value={form.businessEmail}
                onChange={(e) => {
                  setForm((f) => ({ ...f, businessEmail: e.target.value }));
                  if (errors.businessEmail) setErrors((prev) => ({ ...prev, businessEmail: '' }));
                }}
              />
              {errors.businessEmail && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.businessEmail}
                </p>
              )}
            </div>

            {/* Website URL */}
            <div className="space-y-2">
              <Label htmlFor="bp-website" className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-orange-500" />
                Website URL
              </Label>
              <Input
                id="bp-website"
                type="url"
                placeholder="https://yourwebsite.com"
                value={form.websiteUrl}
                onChange={(e) => {
                  setForm((f) => ({ ...f, websiteUrl: e.target.value }));
                  if (errors.websiteUrl) setErrors((prev) => ({ ...prev, websiteUrl: '' }));
                }}
              />
              {errors.websiteUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.websiteUrl}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Your official website or portfolio link
              </p>
            </div>

            {/* Business Bio */}
            <div className="space-y-2">
              <Label htmlFor="bp-bio">Business Bio</Label>
              <Textarea
                id="bp-bio"
                placeholder="Describe your business, brand, or what you create..."
                value={form.bio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bio: e.target.value.slice(0, 500) }))
                }
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {form.bio.length}/500
              </p>
            </div>
          </div>
        )}

        {isCreator && (
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Profile
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

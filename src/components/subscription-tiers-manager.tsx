'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import {
  Crown,
  Star,
  Sparkles,
  Loader2,
  Check,
  Plus,
  X,
  Layers,
} from 'lucide-react';

interface TierData {
  id: string;
  name: string;
  price: number;
  benefits: string[];
  enabled: boolean;
}

interface SubscriptionTiersManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTiers?: TierData[];
  onSave?: (tiers: TierData[]) => void;
}

const DEFAULT_TIERS: TierData[] = [
  {
    id: 'supporter',
    name: 'Supporter',
    price: 4.99,
    benefits: ['Badge on profile', 'Early access to polls', 'Exclusive reactions'],
    enabled: true,
  },
  {
    id: 'super-fan',
    name: 'Super Fan',
    price: 9.99,
    benefits: ['All Supporter perks', 'Behind-the-scenes content', 'Poll voting power 2x'],
    enabled: true,
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 24.99,
    benefits: ['All Super Fan perks', 'Direct message access', 'Custom badge color', 'Monthly shoutout'],
    enabled: true,
  },
];

const TIER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  supporter: Sparkles,
  'super-fan': Star,
  vip: Crown,
};

const TIER_COLORS: Record<string, { border: string; bg: string; icon: string }> = {
  supporter: {
    border: 'border-orange-300 dark:border-orange-700',
    bg: 'from-orange-400 to-amber-400',
    icon: 'text-orange-500',
  },
  'super-fan': {
    border: 'border-amber-300 dark:border-amber-700',
    bg: 'from-amber-400 to-yellow-400',
    icon: 'text-amber-500',
  },
  vip: {
    border: 'border-orange-400 dark:border-orange-600',
    bg: 'from-orange-500 to-red-400',
    icon: 'text-orange-600 dark:text-orange-400',
  },
};

export function SubscriptionTiersManager({
  open,
  onOpenChange,
  currentTiers: propTiers,
  onSave,
}: SubscriptionTiersManagerProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [tiers, setTiers] = useState<TierData[]>(propTiers || DEFAULT_TIERS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newBenefit, setNewBenefit] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && (!propTiers || propTiers.length === 0)) {
      setLoading(true);
      fetch('/api/creator/tiers', {
        headers: { 'X-User-Id': currentUser?.id },
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.tiers && json.tiers.length > 0) {
            setTiers(json.tiers);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else if (propTiers) {
      setTiers(propTiers);
    }
  }, [open, currentUser, propTiers]);

  const toggleTier = (tierId: string) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === tierId ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const updatePrice = (tierId: string, price: number) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === tierId ? { ...t, price: Math.max(0.99, price) } : t))
    );
  };

  const updateName = (tierId: string, name: string) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === tierId ? { ...t, name } : t))
    );
  };

  const addBenefit = (tierId: string) => {
    const benefit = newBenefit[tierId]?.trim();
    if (!benefit) return;
    setTiers((prev) =>
      prev.map((t) =>
        t.id === tierId ? { ...t, benefits: [...t.benefits, benefit] } : t
      )
    );
    setNewBenefit((prev) => ({ ...prev, [tierId]: '' }));
  };

  const removeBenefit = (tierId: string, index: number) => {
    setTiers((prev) =>
      prev.map((t) =>
        t.id === tierId
          ? { ...t, benefits: t.benefits.filter((_, i) => i !== index) }
          : t
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/creator/tiers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id,
        },
        body: JSON.stringify({ tiers }),
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: 'Tiers updated! ✅',
          description: 'Your subscription tiers have been saved.',
        });
        onSave?.(tiers);
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
        description: 'Failed to save tiers',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-500" />
            Subscription Tiers
          </DialogTitle>
          <DialogDescription>
            Configure your supporter subscription plans
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {tiers.map((tier) => {
              const colors = TIER_COLORS[tier.id] || TIER_COLORS.supporter;
              const IconComp = TIER_ICONS[tier.id] || Sparkles;

              return (
                <div
                  key={tier.id}
                  className={`relative rounded-xl border-2 ${tier.enabled ? colors.border : 'border-muted opacity-60'} bg-background p-4 transition-all`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colors.bg} flex items-center justify-center`}
                      >
                        <IconComp className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <Input
                          value={tier.name}
                          onChange={(e) => updateName(tier.id, e.target.value)}
                          className="h-7 text-sm font-semibold w-32 px-2 border-0 bg-transparent focus-visible:ring-1"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs text-muted-foreground">
                        {tier.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <div
                        className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                          tier.enabled
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                            : 'bg-muted'
                        }`}
                        onClick={() => toggleTier(tier.id)}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                            tier.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </label>
                  </div>

                  {/* Price */}
                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground">Monthly Price</Label>
                    <div className="relative inline-flex items-center">
                      <span className="absolute left-3 text-sm font-medium text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        min="0.99"
                        step="0.01"
                        value={tier.price}
                        onChange={(e) =>
                          updatePrice(tier.id, parseFloat(e.target.value) || 0)
                        }
                        className="pl-7 w-28 h-8 text-sm"
                        disabled={!tier.enabled}
                      />
                      <span className="ml-2 text-xs text-muted-foreground">/month</span>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Benefits</Label>
                    <div className="mt-1 space-y-1">
                      {tier.benefits.map((benefit, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm group"
                        >
                          <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <span className="flex-1">{benefit}</span>
                          <button
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                            onClick={() => removeBenefit(tier.id, idx)}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        placeholder="Add a benefit..."
                        value={newBenefit[tier.id] || ''}
                        onChange={(e) =>
                          setNewBenefit((prev) => ({
                            ...prev,
                            [tier.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addBenefit(tier.id);
                        }}
                        className="h-7 text-xs"
                        disabled={!tier.enabled}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={() => addBenefit(tier.id)}
                        disabled={!tier.enabled || !(newBenefit[tier.id]?.trim())}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
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
                <Check className="w-4 h-4" />
                Save Tiers
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import {
  Crown,
  Star,
  Sparkles,
  Loader2,
  Check,
  X,
  ChevronDown,
  CreditCard,
  AlertTriangle,
  Wallet,
} from 'lucide-react';

interface Tier {
  id: string;
  name: string;
  price: number;
  benefits?: string[];
  enabled?: boolean;
}

interface Subscription {
  tier: string;
  status: string;
}

interface SubscribeButtonProps {
  creatorId: string;
  creatorName: string;
  variant?: 'default' | 'compact';
  tiers?: Tier[];
  currentSubscription?: Subscription | null;
  onSuccess?: () => void;
}

const TIER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  supporter: Heart,
  'super-fan': Star,
  vip: Crown,
};

function Heart(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

export function SubscribeButton({
  creatorId,
  creatorName,
  variant = 'default',
  tiers: propTiers,
  currentSubscription: propSubscription,
  onSuccess,
}: SubscribeButtonProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Internal state for self-fetched data
  const [fetchedTiers, setFetchedTiers] = useState<Tier[]>([]);
  const [fetchedSubscription, setFetchedSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);

  // Use props if provided, otherwise fetch internally
  const tiers = propTiers && propTiers.length > 0 ? propTiers : fetchedTiers;
  const currentSubscription = propSubscription ?? fetchedSubscription;

  // Fetch tiers and subscription if not provided via props
  useEffect(() => {
    if (!currentUser || currentUser.id === creatorId) return;

    // If props are provided, don't fetch
    if (propTiers && propTiers.length > 0 && propSubscription !== undefined) return;

    setLoading(true);
    Promise.all([
      fetch(`/api/creator/tiers?creatorId=${creatorId}`, {
        headers: { 'X-User-Id': currentUser.id },
      }).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/subscriptions?creatorId=${creatorId}`, {
        headers: { 'X-User-Id': currentUser.id },
      }).then((r) => r.json()).catch(() => ({})),
    ]).then(([tiersRes, subRes]) => {
      if (tiersRes.tiers) setFetchedTiers(tiersRes.tiers);
      if (subRes.subscription) setFetchedSubscription(subRes.subscription);
    }).finally(() => setLoading(false));
  }, [creatorId, currentUser, propTiers, propSubscription]);

  if (!currentUser || currentUser.id === creatorId) return null;

  if (loading) {
    if (variant === 'compact') {
      return (
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
      );
    }
    return (
      <Button size="sm" disabled className="gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading...
      </Button>
    );
  }

  const enabledTiers = tiers.filter((t) => t.enabled !== false);
  const isSubscribed = !!currentSubscription && currentSubscription.status === 'active';
  const currentTierData = isSubscribed ? tiers.find((t) => t.id === currentSubscription?.tier) : null;
  const walletBalance = currentUser?.walletBalance ?? 0;

  const handleSubscribe = async (tierId: string) => {
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier) return;

    // Check wallet balance
    if (walletBalance < tier.price) {
      toast({
        title: 'Insufficient balance',
        description: `You need $${tier.price.toFixed(2)} in your wallet to subscribe. Current balance: $${walletBalance.toFixed(2)}`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubscribing(true);
    try {
      const res = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify({ creatorId, tier: tierId }),
      });
      const json = await res.json();

      if (json.success) {
        toast({
          title: `Subscribed to @${creatorName}! 🎉`,
          description: `You're now a ${json.subscription?.tierName || 'subscriber'}`,
        });
        useAuthStore.getState().refreshUser();
        onSuccess?.();
        setIsDropdownOpen(false);
        // Update local state
        setFetchedSubscription({ tier: tierId, status: 'active' });
      } else {
        toast({
          title: 'Subscription failed',
          description: json.error || 'Could not process subscription',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Network error',
        description: 'Failed to subscribe',
        variant: 'destructive',
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleCancel = async () => {
    setIsCanceling(true);
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify({ creatorId }),
      });
      const json = await res.json();

      if (json.success) {
        toast({
          title: 'Subscription cancelled',
          description: `You unsubscribed from @${creatorName}`,
        });
        useAuthStore.getState().refreshUser();
        onSuccess?.();
        setIsDropdownOpen(false);
        // Update local state
        setFetchedSubscription(null);
      } else {
        toast({
          title: 'Cancellation failed',
          description: json.error || 'Could not cancel subscription',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Network error',
        description: 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setIsCanceling(false);
    }
  };

  // Compact variant — just an icon
  if (variant === 'compact') {
    if (isSubscribed) {
      return (
        <button
          className="w-8 h-8 rounded-full border border-orange-300 bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-colors"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          title={`Subscribed: ${currentTierData?.name || 'Active'}`}
        >
          <Check className="w-4 h-4 text-orange-500" />
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-border bg-background shadow-lg p-2 space-y-1">
                <div className="px-2 py-1 text-[10px] text-muted-foreground">
                  {currentTierData?.name || 'Subscribed'}
                </div>
                <button
                  className="w-full text-left px-2 py-1.5 text-xs text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1.5"
                  onClick={handleCancel}
                  disabled={isCanceling}
                >
                  {isCanceling ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                  Cancel
                </button>
              </div>
            </>
          )}
        </button>
      );
    }
    if (enabledTiers.length === 0) return null;
    const cheapestTier = enabledTiers[0];
    return (
      <button
        className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center hover:from-orange-600 hover:to-amber-600 transition-colors shadow-sm"
        onClick={() => enabledTiers.length === 1 ? handleSubscribe(cheapestTier.id) : setIsDropdownOpen(!isDropdownOpen)}
        disabled={isSubscribing}
        title={`Subscribe to @${creatorName}`}
      >
        {isSubscribing ? (
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        ) : (
          <Crown className="w-4 h-4 text-white" />
        )}
        {isDropdownOpen && enabledTiers.length > 1 && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-background shadow-lg p-2 space-y-1">
              {enabledTiers.map((tier) => {
                const canAfford = walletBalance >= tier.price;
                return (
                  <button
                    key={tier.id}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-orange-50 dark:hover:bg-orange-950/30 text-left text-sm"
                    onClick={() => handleSubscribe(tier.id)}
                    disabled={isSubscribing || !canAfford}
                  >
                    <Crown className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="flex-1">{tier.name}</span>
                    <span className="text-xs text-muted-foreground">${tier.price.toFixed(2)}/mo</span>
                    {!canAfford && (
                      <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </button>
    );
  }

  // === Default variant ===

  if (isSubscribed) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <Check className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">
            {currentTierData?.name || 'Subscribed'}
          </span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </Button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-background shadow-lg p-2 space-y-1">
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
              Current Plan
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-orange-50 dark:bg-orange-950/30">
              <Crown className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">{currentTierData?.name}</span>
              <Badge className="ml-auto text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                ${currentTierData?.price?.toFixed(2)}/mo
              </Badge>
            </div>

            {enabledTiers.length > 1 && (
              <>
                <div className="border-t my-1" />
                <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                  Change Tier
                </div>
                {enabledTiers
                  .filter((t) => t.id !== currentSubscription?.tier)
                  .map((tier) => {
                    const canAfford = walletBalance >= tier.price;
                    return (
                      <button
                        key={tier.id}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm text-left transition-colors"
                        onClick={() => handleSubscribe(tier.id)}
                        disabled={isSubscribing || !canAfford}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span className="flex-1">{tier.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ${tier.price.toFixed(2)}/mo
                        </span>
                        {!canAfford && (
                          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
              </>
            )}

            <div className="border-t my-1" />
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-sm text-red-600 dark:text-red-400 text-left transition-colors"
              onClick={handleCancel}
              disabled={isCanceling}
            >
              {isCanceling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              Cancel Subscription
            </button>
          </div>
        )}
      </div>
    );
  }

  // Not subscribed — show subscribe button with dropdown
  if (enabledTiers.length === 0) {
    return (
      <Button
        size="sm"
        className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm"
        disabled
      >
        <CreditCard className="w-3.5 h-3.5" />
        No tiers available
      </Button>
    );
  }

  if (enabledTiers.length === 1) {
    const tier = enabledTiers[0];
    const canAfford = walletBalance >= tier.price;
    return (
      <div className="relative">
        <Button
          size="sm"
          className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm"
          onClick={() => handleSubscribe(tier.id)}
          disabled={isSubscribing}
        >
          {isSubscribing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Crown className="w-3.5 h-3.5" />
          )}
          Subscribe ${tier.price.toFixed(2)}
        </Button>
        {!canAfford && (
          <div className="absolute left-0 top-full mt-1 z-50 w-52 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800/40 p-2 flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Insufficient balance</p>
              <p className="text-[10px] mt-0.5 flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                Balance: ${walletBalance.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        size="sm"
        className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <Crown className="w-3.5 h-3.5" />
        Subscribe
        <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isDropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border border-border bg-background shadow-lg p-2 space-y-1">
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
              Choose a tier for @{creatorName}
            </div>

            {/* Wallet balance display */}
            <div className="px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
              <Wallet className="w-3 h-3" />
              Balance: ${walletBalance.toFixed(2)}
            </div>

            {enabledTiers.map((tier) => {
              const IconComp = TIER_ICONS[tier.id] || Star;
              const canAfford = walletBalance >= tier.price;
              return (
                <button
                  key={tier.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-orange-50 dark:hover:bg-orange-950/30 text-left transition-colors group disabled:opacity-50"
                  onClick={() => handleSubscribe(tier.id)}
                  disabled={isSubscribing || !canAfford}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 flex items-center justify-center shrink-0">
                    <IconComp className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium group-hover:text-orange-600 dark:group-hover:text-orange-400">
                      {tier.name}
                    </p>
                    {tier.benefits && tier.benefits.length > 0 && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {tier.benefits.slice(0, 2).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <Badge className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                      ${tier.price.toFixed(2)}/mo
                    </Badge>
                    {!canAfford && (
                      <span className="flex items-center gap-0.5 text-[9px] text-red-500">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Low balance
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

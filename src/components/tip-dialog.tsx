'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Heart, DollarSign, Send } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';

interface TipDialogProps {
  recipientId: string;
  recipientUsername: string;
  videoId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TipDialog({
  recipientId,
  recipientUsername,
  videoId,
  open,
  onOpenChange,
  onSuccess,
}: TipDialogProps) {
  const { currentUser, updateWalletBalance } = useAuthStore();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const presetAmounts = [1, 2, 5, 10, 25];
  const balance = currentUser?.walletBalance ?? 0;
  const numAmount = parseFloat(amount) || 0;
  const isInvalid = numAmount < 0.5 || numAmount > balance;
  const canSubmit = numAmount >= 0.5 && numAmount <= balance && !isSubmitting;

  const handlePreset = (preset: number) => {
    setAmount(String(preset));
    setSelectedPreset(preset);
  };

  const handleCustomAmount = (value: string) => {
    setAmount(value);
    setSelectedPreset(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) return;

    setIsSubmitting(true);
    try {
      const body: { recipientId: string; amount: number; videoId?: string; message?: string } = {
        recipientId,
        amount: numAmount,
      };
      if (videoId) body.videoId = videoId;
      if (message.trim()) body.message = message.trim();

      const res = await fetch('/api/wallet/tip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Tip failed',
          description: data.error || 'Could not send tip',
          variant: 'destructive',
        });
        return;
      }

      updateWalletBalance(data.newBalance);
      toast({
        title: `Tip sent to @${recipientUsername}! 💝`,
        description: `$${numAmount.toFixed(2)} has been sent.`,
      });

      setAmount('');
      setMessage('');
      setSelectedPreset(null);
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({
        title: 'Network error',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAmount('');
      setMessage('');
      setSelectedPreset(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Send Tip to @{recipientUsername}
          </DialogTitle>
          <DialogDescription>
            Support this creator with a tip
          </DialogDescription>
        </DialogHeader>

        {/* Recipient display */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold">
            {recipientUsername.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm">@{recipientUsername}</p>
            <p className="text-xs text-muted-foreground">Receiving your tip</p>
          </div>
        </div>

        {/* Preset amounts */}
        <div className="space-y-2">
          <Label className="text-sm">Quick Amount</Label>
          <div className="flex gap-2 flex-wrap">
            {presetAmounts.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant={selectedPreset === preset ? 'default' : 'outline'}
                size="sm"
                className={
                  selectedPreset === preset
                    ? 'bg-gradient-to-r from-pink-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 text-white shadow-sm rounded-full px-4'
                    : 'rounded-full px-4 hover:border-pink-300'
                }
                onClick={() => handlePreset(preset)}
              >
                ${preset}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom amount */}
        <div className="space-y-2">
          <Label htmlFor="tip-amount">Custom Amount</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="tip-amount"
              type="number"
              step="0.01"
              min="0.50"
              placeholder="0.00"
              value={amount}
              onChange={(e) => handleCustomAmount(e.target.value)}
              className="pl-8"
            />
          </div>
          {numAmount > 0 && numAmount < 0.5 && (
            <p className="text-xs text-destructive">Minimum tip is $0.50</p>
          )}
          {numAmount > balance && (
            <p className="text-xs text-destructive">Insufficient balance</p>
          )}
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="tip-message">Message (optional)</Label>
          <Textarea
            id="tip-message"
            placeholder="Say something nice..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
          />
        </div>

        {/* Balance display */}
        <div className="flex items-center justify-between text-sm px-3 py-2 rounded-md bg-muted/50">
          <span className="text-muted-foreground">Your Balance</span>
          <span className="font-semibold text-orange-600 dark:text-orange-400">
            ${balance.toFixed(2)}
          </span>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-gradient-to-r from-pink-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 text-white gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send ${numAmount > 0 ? numAmount.toFixed(2) : '0.00'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

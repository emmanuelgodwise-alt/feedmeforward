'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Flag, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'video' | 'comment';
  targetId: string;
  targetTitle?: string;
}

const REPORT_REASONS = [
  { value: 'offensive', label: 'Offensive Content', description: 'Hate speech, harassment, or inappropriate material' },
  { value: 'spam', label: 'Spam', description: 'Unsolicited advertising or repetitive content' },
  { value: 'misleading', label: 'Misleading', description: 'False information, clickbait, or deceptive content' },
  { value: 'other', label: 'Other', description: 'Any other concern not listed above' },
] as const;

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetTitle,
}: ReportDialogProps) {
  const { currentUser } = useAuthStore();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('');
      setDescription('');
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (!currentUser || !reason) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
        },
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Report failed',
          description: data.error || 'Could not submit report',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Report submitted',
        description: 'Thank you for helping keep our community safe.',
      });

      setReason('');
      setDescription('');
      onOpenChange(false);
    } catch {
      toast({
        title: 'Network error',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeLabel = targetType === 'video' ? 'Video' : 'Comment';
  const previewText = targetTitle
    ? targetTitle.length > 60
      ? targetTitle.slice(0, 60) + '...'
      : targetTitle
    : `${typeLabel} #${targetId.slice(0, 8)}`;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-orange-500" />
            Report Content
          </AlertDialogTitle>
          <AlertDialogDescription>
            Help us maintain a safe community by reporting content that violates our guidelines.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Target Info */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
              Reporting {typeLabel}
            </p>
            <p className="text-sm truncate">{previewText}</p>
          </div>
        </div>

        {/* Reason Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Reason</Label>
          <div className="grid gap-2">
            {REPORT_REASONS.map((r) => (
              <label
                key={r.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  reason === r.value
                    ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-600'
                    : 'border-border hover:border-orange-200 dark:hover:border-orange-800'
                }`}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 accent-orange-500"
                />
                <div>
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Optional Description */}
        <div className="space-y-2">
          <Label htmlFor="report-description" className="text-sm font-medium">
            Additional Details <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="report-description"
            placeholder="Provide any additional context about your report..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <AlertDialogFooter className="flex-row gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            disabled={!reason || isSubmitting}
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Flag className="w-4 h-4" />
                Submit Report
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

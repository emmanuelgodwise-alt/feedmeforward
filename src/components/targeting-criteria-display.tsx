'use client';

import { Badge } from '@/components/ui/badge';
import type { SegmentCriteria } from '@/lib/build-where-clause';
import { criteriaToBreakdown } from '@/lib/build-where-clause';

interface TargetingCriteriaDisplayProps {
  criteria: SegmentCriteria;
  compact?: boolean;
}

const FIELD_COLORS: Record<string, string> = {
  Age: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Location: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Gender: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Language: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  Interest: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'Score ≥': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

export function TargetingCriteriaDisplay({ criteria, compact = false }: TargetingCriteriaDisplayProps) {
  const items = criteriaToBreakdown(criteria);

  if (items.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {items.map((item, idx) => (
          <Badge
            key={`${item.label}-${item.value}-${idx}`}
            variant="secondary"
            className={`text-xs ${FIELD_COLORS[item.label] || ''}`}
          >
            {item.value}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Target Audience</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, idx) => (
          <Badge
            key={`${item.label}-${item.value}-${idx}`}
            variant="secondary"
            className={`text-xs ${FIELD_COLORS[item.label] || ''}`}
          >
            <span className="text-muted-foreground mr-1">{item.label}:</span>
            <span className="capitalize">{item.value}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Sparkles, DollarSign, Info } from 'lucide-react';

interface WorthyBadgeProps {
  /** Whether this video is ad-worthy */
  isWorthy: boolean;
  /** Display mode */
  variant?: 'badge' | 'icon' | 'pill';
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

function WorthyBadgeComponent({
  isWorthy,
  variant = 'badge',
  size = 'sm',
  className = '',
}: WorthyBadgeProps) {
  if (!isWorthy) return null;

  const tooltipContent =
    'This video meets the quality & engagement threshold to display advertisements. The creator earns revenue from ad impressions.';

  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  const badge = (
    <Badge
      className={`${sizeClasses} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold border-0 gap-0.5 ${className}`}
    >
      {variant === 'badge' && (
        <>
          <Sparkles className={iconSize} />
          Worthy
        </>
      )}
      {variant === 'pill' && (
        <>
          <DollarSign className={iconSize} />
          Ad Eligible
        </>
      )}
      {variant === 'icon' && (
        <motion.div
          whileHover={{ scale: 1.2, rotate: 15 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          <Sparkles className={iconSize} />
        </motion.div>
      )}
    </Badge>
  );

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center">
            {badge}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-[220px] text-xs bg-popover text-popover-foreground border-border"
        >
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <p>{tooltipContent}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const WorthyBadge = memo(WorthyBadgeComponent);

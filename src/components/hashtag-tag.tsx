'use client';

import { motion } from 'framer-motion';
import { Hash } from 'lucide-react';

interface HashtagTagProps {
  tag: string;
  onClick?: (tag: string) => void;
  size?: 'sm' | 'md';
}

export function HashtagTag({ tag, onClick, size = 'md' }: HashtagTagProps) {
  const displayTag = tag.startsWith('#') ? tag : `#${tag}`;

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5 gap-1'
    : 'text-sm px-3 py-1 gap-1.5';

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(tag);
      }}
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        bg-gradient-to-r from-orange-100 to-amber-100
        dark:from-orange-900/30 dark:to-amber-900/30
        text-orange-700 dark:text-orange-300
        border border-orange-200 dark:border-orange-800/50
        hover:from-orange-200 hover:to-amber-200
        dark:hover:from-orange-900/50 dark:hover:to-amber-900/50
        hover:border-orange-300 dark:hover:border-orange-700
        transition-colors cursor-pointer select-none
        ${sizeClasses}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <Hash className="w-3 h-3" />
      <span>{displayTag.slice(1)}</span>
    </motion.button>
  );
}

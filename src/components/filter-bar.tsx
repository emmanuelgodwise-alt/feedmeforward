'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import type { VideoFilters } from '@/types';
import { CATEGORIES } from '@/types';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'answered', label: 'Answered' },
];

interface FilterBarProps {
  filters: VideoFilters;
  onFilterChange: (filters: Partial<VideoFilters>) => void;
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-3">
      {/* Top Row: Search + Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search lead clips..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="pl-9 h-10"
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className="h-10 w-10 shrink-0"
        >
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <Badge
            key={tab.value}
            variant={filters.status === tab.value ? 'default' : 'outline'}
            className={`cursor-pointer whitespace-nowrap px-3 py-1 text-sm transition-colors ${
              filters.status === tab.value
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0'
                : 'hover:bg-orange-50 dark:hover:bg-orange-950/30'
            }`}
            onClick={() => onFilterChange({ status: tab.value })}
          >
            {tab.label}
          </Badge>
        ))}
      </div>

      {/* Expandable Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-3"
        >
          <Select
            value={filters.category}
            onValueChange={(value) => onFilterChange({ category: value === 'all' ? '' : value })}
          >
            <SelectTrigger className="w-[180px] h-10">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>
      )}
    </div>
  );
}

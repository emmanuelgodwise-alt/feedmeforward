'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Hash, X, Loader2 } from 'lucide-react';
import { HashtagTag } from '@/components/hashtag-tag';

interface HashtagInputProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export function HashtagInput({
  selectedTags,
  onChange,
  placeholder = 'Add tags (type # to start)...',
  maxTags = 10,
}: HashtagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<{ tag: string; useCount: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/hashtags/suggestions?q=${encodeURIComponent(query)}&limit=8`);
      const data = await res.json();
      if (data.success) {
        // Filter out already selected tags
        const filtered = data.hashtags.filter(
          (h: { tag: string }) => !selectedTags.includes(h.tag)
        );
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingSuggestions(false);
    }
  }, [selectedTags]);

  const handleInputChange = (value: string) => {
    setInputValue(value);

    // Detect hashtag being typed (text after #)
    const hashIndex = value.lastIndexOf('#');
    if (hashIndex !== -1) {
      const query = value.slice(hashIndex + 1).trim();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(query.toLowerCase());
      }, 200);
    } else {
      setShowSuggestions(false);
    }
  };

  const addTag = (tag: string) => {
    const normalized = tag.replace(/^#/, '').trim().toLowerCase();
    if (
      normalized.length === 0 ||
      selectedTags.includes(normalized) ||
      selectedTags.length >= maxTags
    ) {
      return;
    }
    onChange([...selectedTags, normalized]);
    setInputValue('');
    setShowSuggestions(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const hashIndex = inputValue.lastIndexOf('#');
      if (hashIndex !== -1) {
        addTag(inputValue.slice(hashIndex + 1));
      } else if (inputValue.trim()) {
        addTag(inputValue.trim());
      }
    } else if (e.key === 'Backspace' && inputValue === '' && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    } else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (tag: string) => {
    addTag(tag);
  };

  return (
    <div className="relative">
      {/* Selected tags as chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedTags.map((tag) => (
            <div
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50 px-2.5 py-1 text-sm"
            >
              <Hash className="w-3 h-3" />
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 hover:text-orange-900 dark:hover:text-orange-100 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            const hashIndex = inputValue.lastIndexOf('#');
            if (hashIndex !== -1 && inputValue.slice(hashIndex + 1).trim().length > 0) {
              fetchSuggestions(inputValue.slice(hashIndex + 1).trim().toLowerCase());
            }
          }}
          placeholder={selectedTags.length >= maxTags ? `Max ${maxTags} tags reached` : placeholder}
          disabled={selectedTags.length >= maxTags}
          className="pl-9"
        />
        {loadingSuggestions && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.tag}
              type="button"
              className={`
                w-full px-3 py-2 text-left flex items-center justify-between gap-2
                transition-colors text-sm
                ${index === activeIndex
                  ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300'
                  : 'hover:bg-muted'
                }
              `}
              onClick={() => handleSuggestionClick(suggestion.tag)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-orange-500" />
                <span className="font-medium">{suggestion.tag}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {suggestion.useCount} {suggestion.useCount === 1 ? 'post' : 'posts'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Hint */}
      <p className="text-xs text-muted-foreground mt-1">
        {selectedTags.length}/{maxTags} tags • Press Enter or , to add
      </p>
    </div>
  );
}

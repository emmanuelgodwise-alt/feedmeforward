'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, Search, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { THUMBNAIL_GRADIENTS } from '@/types';

interface GlobalSearchProps {
  onNavigate: (view: string) => void;
  setProfileUserId: (id: string) => void;
}

interface SearchResult {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isFollowing: boolean;
}

function getAvatarGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return THUMBNAIL_GRADIENTS[Math.abs(hash) % THUMBNAIL_GRADIENTS.length];
}

export function GlobalSearch({ onNavigate, setProfileUserId }: GlobalSearchProps) {
  const { currentUser } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchUsers = useCallback(async (searchTerm: string) => {
    if (!currentUser || searchTerm.length < 2) {
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(searchTerm)}&limit=5`,
        { headers: { 'X-User-Id': currentUser.id } }
      );
      const data = await res.json();
      if (data.users) {
        setResults(data.users);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  }, [currentUser]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchUsers(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchUsers]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSelectUser = (userId: string) => {
    setProfileUserId(userId);
    onNavigate('profile');
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setIsOpen(false);
  };

  const handleFocus = () => {
    if (results.length > 0 || (hasSearched && query.length >= 2)) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.length >= 2) {
              setIsOpen(true);
            }
          }}
          onFocus={handleFocus}
          className="pl-9 pr-8 h-9 rounded-lg border-border bg-background text-sm"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-background shadow-lg z-50 overflow-hidden">
          {/* Loading State */}
          {isSearching && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          )}

          {/* Results */}
          {!isSearching && results.length > 0 && (
            <div className="py-1 max-h-64 overflow-y-auto">
              {results.map((user) => {
                const gradient = getAvatarGradient(user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors text-left"
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden`}
                    >
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML =
                              user.username.charAt(0).toUpperCase();
                          }}
                        />
                      ) : (
                        user.username.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">
                          {user.displayName || user.username}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        @{user.username}
                      </p>
                    </div>

                    {/* Follow status */}
                    {user.isFollowing && (
                      <span className="text-xs text-orange-600 dark:text-orange-400 font-medium shrink-0">
                        Following
                      </span>
                    )}
                    {!user.isFollowing && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        Follow
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* No Results */}
          {!isSearching && hasSearched && results.length === 0 && query.length >= 2 && (
            <div className="flex items-center justify-center py-6 px-4">
              <p className="text-sm text-muted-foreground">No users found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

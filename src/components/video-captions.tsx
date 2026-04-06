'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Globe,
  Loader2,
  Subtitles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Languages,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useLocaleStore } from '@/stores/locale-store';
import { useAuthStore } from '@/stores/auth-store';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', flag: '🇹🇼' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]['code'];

interface CaptionData {
  source: string;
  target: string;
  segments: string[];
  language: string;
  sourceType: 'asr' | 'description';
}

interface VideoCaptionsProps {
  videoId: string;
  videoUrl?: string;
  description?: string;
}

export function VideoCaptions({ videoId, videoUrl, description }: VideoCaptionsProps) {
  const { locale } = useLocaleStore();
  const { currentUser } = useAuthStore();

  const [showPanel, setShowPanel] = useState(false);
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(
    (locale as LanguageCode) || 'en'
  );
  const [showSource, setShowSource] = useState(false);

  // Use a ref for caption cache to avoid stale closure issues with useCallback
  const captionCacheRef = useRef<Record<string, CaptionData | 'unavailable'>>({});
  // Use state for rendering triggers
  const [captionCache, setCaptionCache] = useState<Record<string, CaptionData | 'unavailable'>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingLang, setLoadingLang] = useState<string | null>(null);

  const currentCaption =
    captionCache[selectedLang] === 'unavailable' ? null : captionCache[selectedLang] || null;
  const isUnavailable = captionCache[selectedLang] === 'unavailable';
  const sourceType = currentCaption?.sourceType || null;

  const updateCache = useCallback((langCode: string, value: CaptionData | 'unavailable') => {
    captionCacheRef.current[langCode] = value;
    setCaptionCache((prev) => ({ ...prev, [langCode]: value }));
  }, []);

  const fetchCaptions = useCallback(
    async (langCode: string, forceRefresh = false) => {
      // Check cache first (unless forcing refresh)
      if (!forceRefresh && captionCacheRef.current[langCode] !== undefined) return;

      setIsLoading(true);
      setError(null);
      setLoadingLang(langCode);

      try {
        const params = new URLSearchParams({ targetLanguage: langCode });
        const res = await fetch(`/api/videos/${videoId}/captions?${params}`, {
          headers: { 'X-User-Id': currentUser?.id || '' },
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to fetch captions');
          return;
        }

        if (data.success && data.captions) {
          updateCache(langCode, data.captions);
        } else {
          updateCache(langCode, 'unavailable');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setIsLoading(false);
        setLoadingLang(null);
      }
    },
    [videoId, currentUser?.id, updateCache]
  );

  const handleLanguageSelect = useCallback(
    (langCode: LanguageCode) => {
      setSelectedLang(langCode);
      setError(null);
      // Fetch if not cached
      fetchCaptions(langCode);
    },
    [fetchCaptions]
  );

  const handleRefresh = useCallback(() => {
    // Clear cache for current language and re-fetch
    delete captionCacheRef.current[selectedLang];
    setCaptionCache((prev) => {
      const next = { ...prev };
      delete next[selectedLang];
      return next;
    });
    setError(null);
    fetchCaptions(selectedLang, true);
  }, [selectedLang, fetchCaptions]);

  const handleTogglePanel = () => {
    setShowPanel((prev) => {
      const next = !prev;
      if (next) {
        // Auto-fetch for current language when opening
        fetchCaptions(selectedLang);
      }
      return next;
    });
  };

  const currentLangInfo = LANGUAGES.find((l) => l.code === selectedLang) || LANGUAGES[0];

  return (
    <div className="mt-2">
      {/* Controls row: CC toggle + language selector */}
      <div className="flex items-center gap-2">
        <Button
          variant={showPanel ? 'default' : 'outline'}
          size="sm"
          className={`gap-1.5 ${
            showPanel
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
              : 'hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-500 hover:border-orange-300'
          }`}
          onClick={handleTogglePanel}
        >
          <Subtitles className="w-4 h-4" />
          <span className="text-xs font-semibold">CC</span>
        </Button>

        {/* Language selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-500 hover:border-orange-300"
              disabled={!showPanel}
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="text-xs">{currentLangInfo.flag} {currentLangInfo.name}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto w-52">
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                className={`text-xs gap-2 cursor-pointer ${
                  selectedLang === lang.code
                    ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400'
                    : ''
                }`}
                onSelect={() => handleLanguageSelect(lang.code)}
              >
                <span className="text-base">{lang.flag}</span>
                <span>{lang.name}</span>
                {selectedLang === lang.code && (
                  <span className="ml-auto text-orange-500 font-semibold text-[10px]">✓</span>
                )}
                {loadingLang === lang.code && (
                  <Loader2 className="w-3 h-3 animate-spin text-orange-500 ml-auto" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Refresh button */}
        {showPanel && !isLoading && (currentCaption || isUnavailable || error) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-orange-500"
            onClick={handleRefresh}
            title="Refresh captions"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Caption display panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mt-3"
          >
            <div className="rounded-xl border border-orange-200 dark:border-orange-800/40 bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10 p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-orange-500" />
                  <Badge
                    variant="secondary"
                    className="text-xs bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/40"
                  >
                    Translated to {currentLangInfo.name} {currentLangInfo.flag}
                  </Badge>
                </div>
                {currentCaption && selectedLang !== 'en' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowSource(!showSource)}
                  >
                    {showSource ? (
                      <>
                        <Languages className="w-3 h-3" />
                        Hide Source
                        <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        <Languages className="w-3 h-3" />
                        Show Source
                        <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Loading state */}
              {isLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5" />
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                    <span className="text-xs text-muted-foreground">
                      {selectedLang === 'en' ? 'Generating captions...' : 'Transcribing & translating...'}
                    </span>
                  </div>
                </div>
              )}

              {/* Error state */}
              {!isLoading && error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs mt-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => fetchCaptions(selectedLang, true)}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              {/* Unavailable state */}
              {!isLoading && !error && isUnavailable && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed">
                  <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Captions are not available for this video. External videos require a description to generate captions.
                  </p>
                </div>
              )}

              {/* Caption text */}
              {!isLoading && !error && currentCaption && (
                <div className="space-y-3">
                  {/* Source type notice */}
                  {sourceType === 'description' && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                      <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        AI speech-to-text captions were unavailable for this video. The text below is sourced from the video description instead.
                      </p>
                    </div>
                  )}

                  {showSource && currentCaption.source !== currentCaption.target && (
                    <div className="p-3 rounded-lg bg-white dark:bg-card border border-orange-100 dark:border-orange-900/30">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5 tracking-wider">
                        Original (English)
                      </p>
                      <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {currentCaption.source}
                      </div>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-white dark:bg-card border border-orange-200 dark:border-orange-800/40 shadow-sm">
                    <p className="text-[10px] uppercase font-semibold text-orange-600 dark:text-orange-400 mb-1.5 tracking-wider">
                      {currentLangInfo.flag} {currentLangInfo.name} Translation
                    </p>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {currentCaption.target}
                    </div>
                    {currentCaption.segments.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-orange-100 dark:border-orange-900/30">
                        <p className="text-[10px] text-muted-foreground mb-1">
                          {currentCaption.segments.length} caption segments
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {currentCaption.segments.slice(0, 6).map((seg, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-[10px] font-normal px-2 py-0.5 border-orange-200 dark:border-orange-800/40 text-orange-700 dark:text-orange-300"
                            >
                              {seg.length > 40 ? seg.slice(0, 40) + '...' : seg}
                            </Badge>
                          ))}
                          {currentCaption.segments.length > 6 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-normal px-2 py-0.5 text-muted-foreground"
                            >
                              +{currentCaption.segments.length - 6} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

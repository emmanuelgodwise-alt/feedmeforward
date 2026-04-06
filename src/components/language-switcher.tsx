'use client';

import { Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocaleStore } from '@/stores/locale-store';
import { locales, type Locale } from '@/i18n';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocaleStore();

  const currentLocale = locales.find(l => l.code === locale);

  return (
    <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
      <SelectTrigger size="sm" className="h-8 gap-1.5 px-2 text-xs font-medium">
        <Globe className="size-3.5 shrink-0" />
        <SelectValue>
          <span className="flex items-center gap-1">
            <span>{currentLocale?.flag}</span>
            <span className="hidden sm:inline">{currentLocale?.name}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {locales.map((l) => (
          <SelectItem key={l.code} value={l.code}>
            <span className="flex items-center gap-2">
              <span>{l.flag}</span>
              <span>{l.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

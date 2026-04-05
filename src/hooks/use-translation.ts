'use client';

import { useLocaleStore } from '@/stores/locale-store';
import { t } from '@/i18n';

export function useTranslation() {
  const locale = useLocaleStore(s => s.locale);
  
  const translate = (key: string, params?: Record<string, string | number>) => {
    return t(locale, key, params);
  };
  
  return { t: translate, locale };
}

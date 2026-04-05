import en from './en.json';
import fr from './fr.json';
import es from './es.json';
import hi from './hi.json';

export type Locale = 'en' | 'fr' | 'es' | 'hi';

export const locales: { code: Locale; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
];

export const translations: Record<Locale, typeof en> = { en, fr, es, hi };

export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: unknown = translations[locale];
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = (value as Record<string, unknown>)[k];
    } else {
      value = undefined;
      break;
    }
  }
  if (typeof value !== 'string') {
    // Fallback to English
    value = translations.en;
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key; // Return key if not found
      }
    }
    if (typeof value !== 'string') return key;
  }
  // Replace params like {username} with actual values
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, param) => String(params[param] ?? `{${param}}`));
  }
  return value;
}

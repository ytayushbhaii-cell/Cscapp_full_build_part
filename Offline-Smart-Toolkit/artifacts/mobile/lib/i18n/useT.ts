// useT — translation hook backed by SettingsContext.
// Usage: const t = useT(); then t('nav.dashboard')
import { useCallback } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { getTranslations, type TranslationKey } from './translations';

export function useT() {
  const { language } = useSettings();
  const strings = getTranslations(language as 'en' | 'hi');

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      let str: string = strings[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return str;
    },
    [strings]
  );

  return t;
}

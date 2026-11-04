'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en, { MessageKey } from './messages/en';
import sw from './messages/sw';
import type { Locale } from './types';

const KEY = 'whisper_locale';
interface I18n { locale: Locale; setLocale: (l: Locale) => void; t: (key: MessageKey) => string }
const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'sw') setLocaleState(saved);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(KEY, l);
    document.documentElement.lang = l;
  }, []);

  const value = useMemo<I18n>(() => ({
    locale, setLocale,
    // Falls back to English when a Kiswahili string is missing.
    t: (key) => (locale === 'sw' ? sw[key] ?? en[key] : en[key]),
  }), [locale, setLocale]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be used inside <I18nProvider>');
  return v;
}

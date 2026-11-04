'use client';
import { AuthProvider } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n';
import { PresenceProvider } from '@/lib/presence';
import { ThemeProvider } from '@/lib/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider><I18nProvider><AuthProvider><PresenceProvider>{children}</PresenceProvider></AuthProvider></I18nProvider></ThemeProvider>;
}

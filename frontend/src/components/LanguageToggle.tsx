'use client';
import { api, tokenStore } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <div className={cn('inline-flex rounded-full bg-white p-1 ring-1 ring-brand-200', className)} role="group" aria-label="Language">
      {(['en', 'sw'] as const).map((l) => (
        <button key={l} onClick={() => { setLocale(l); if (tokenStore.get()) void api('/users/me', { method: 'PATCH', body: { locale: l } }).catch(() => undefined); }} aria-pressed={locale === l}
          className={cn('rounded-full px-4 py-1.5 text-xs font-semibold', locale === l ? 'bg-brand-600 text-white' : 'text-brand-700 hover:bg-brand-50')}>
          {l === 'en' ? 'English' : 'Kiswahili'}
        </button>
      ))}
    </div>
  );
}

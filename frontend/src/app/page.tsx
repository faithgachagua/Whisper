'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ButtonLink } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

export default function Splash() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  useEffect(() => { if (!loading && user) router.replace(user.role === 'moderator' ? '/moderator' : user.onboarded ? '/home' : '/onboarding'); }, [user, loading, router]);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-brand-100 via-brand-300 to-brand-600">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-6"><Logo /><div className="flex items-center gap-2"><ThemeToggle /><LanguageToggle /></div></div>
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 pb-48 pt-10">
        <h1 className="max-w-xl text-5xl font-extrabold leading-[1.05] tracking-tight text-brand-950 sm:text-6xl">{t('app.tagline')}</h1>
        <p className="mt-5 max-w-md text-lg text-brand-900/80">{t('splash.sub')}</p>
        <div className="mt-8 flex max-w-sm flex-col gap-3 sm:flex-row">
          <ButtonLink href="/register" className="flex-1 py-3.5">{t('common.getStarted')}</ButtonLink>
          <ButtonLink href="/login" variant="secondary" className="flex-1 py-3.5">{t('common.login')}</ButtonLink>
        </div>
        <p className="mt-6 max-w-md text-xs text-brand-900/70">Whisper connects you with peers, not therapists. In an emergency call 999, or Childline Kenya on 116.</p>
      </div>
      {/* Layered hills and moon */}
      <svg aria-hidden viewBox="0 0 1200 320" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-64 w-full sm:h-80">
        <circle cx="930" cy="90" r="46" fill="#F5F2FF" opacity=".85" />
        <path d="M0 200 C150 120 280 170 420 140 C600 100 700 190 880 150 C1020 120 1120 150 1200 120 L1200 320 L0 320Z" fill="#7C56E8" opacity=".55" />
        <path d="M0 240 C170 190 300 250 470 215 C640 180 760 260 940 220 C1060 195 1140 220 1200 205 L1200 320 L0 320Z" fill="#5F37D1" opacity=".8" />
        <path d="M0 282 C200 250 330 300 520 275 C720 250 860 305 1040 280 C1120 270 1170 276 1200 272 L1200 320 L0 320Z" fill="#3A2088" />
      </svg>
    </main>
  );
}

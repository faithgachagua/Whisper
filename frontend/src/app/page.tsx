'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, HeartHandshake, Lock, Sprout, Heart } from 'lucide-react';
import { useEffect } from 'react';
import { AnimatedBackdrop, HeroCopy } from '@/components/auth';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ButtonLink } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

export default function Landing() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.replace(user.role === 'moderator' ? '/moderator' : user.onboarded ? '/home' : '/onboarding');
  }, [user, loading, router]);

  const pills = [
    { icon: Lock, label: t('about.anon') }, { icon: Heart, label: t('about.community') },
    { icon: Sprout, label: t('about.wellbeing') }, { icon: HeartHandshake, label: t('about.here') },
  ];

  return (
    <main>
      <section className="relative min-h-screen overflow-hidden text-white">
        <AnimatedBackdrop />
        <div className="absolute right-5 top-5 z-20 flex items-center gap-2"><ThemeToggle /><LanguageToggle /></div>
        <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-5 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-10">
          <HeroCopy>
            <div className="mt-8 flex max-w-sm animate-fade-up flex-col gap-3 [animation-delay:1.4s] sm:flex-row">
              <Link href="/register" className="group relative inline-flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-mint via-brand-300 to-brand-400 px-5 py-3.5 text-sm font-bold text-brand-950 shadow-lg shadow-black/25 transition-transform hover:-translate-y-0.5">
                <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent group-hover:animate-shimmer" />
                <span className="relative flex items-center gap-2">{t('common.getStarted')}<ArrowRight className="h-4 w-4" aria-hidden /></span>
              </Link>
              <Link href="/login" className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 py-3.5 text-sm font-bold backdrop-blur hover:bg-white/20">{t('common.login')}</Link>
            </div>
            <p className="mt-6 max-w-md text-xs text-white/60">Whisper connects you with peers, not therapists. In an emergency call 999, or Childline Kenya on 116.</p>
          </HeroCopy>
          {/* Live-feed preview */}
          <div className="relative hidden animate-slide-in lg:block" aria-hidden>
            <div className="glass mx-auto w-full max-w-sm animate-float space-y-3 rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
              {[['A', 'Anonymous member', 'It’s been a tough week, I just needed a place to say this.'], ['K', 'KindListener', 'You are still you, and you are enough.']].map(([a, n, b]) => (
                <div key={n} className="rounded-2xl bg-white/10 p-4">
                  <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">{a}</span><span className="text-sm font-bold">{n}</span></div>
                  <p className="mt-2 text-sm text-white/85">{b}</p>
                  <div className="mt-3 flex gap-2 text-xs font-semibold"><span className="rounded-full bg-white/15 px-3 py-1">{t('react.listening')}</span><span className="rounded-full bg-mint/25 px-3 py-1 text-mint">{t('react.not_alone')}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-brand-50 to-white px-5 py-20 dark:from-[#170F36] dark:to-[#120D2B]">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-700"><Heart className="h-4 w-4 fill-current" aria-hidden />{t('about.badge')}</span>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-brand-900 sm:text-5xl">{t('app.tagline')}</h2>
            <p className="mt-4 max-w-xl text-lg text-ink/75">{t('about.body')}</p>
            <ul className="mt-8 flex flex-wrap gap-3">
              {pills.map(({ icon: Icon, label }) => <li key={label} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-card ring-1 ring-brand-100"><Icon className="h-4 w-4" aria-hidden />{label}</li>)}
            </ul>
            <ButtonLink href="/register" className="mt-8">{t('about.join')}<ArrowRight className="h-4 w-4" aria-hidden /></ButtonLink>
          </div>
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-card">
            <div role="img" aria-label="Two friends smiling and giving a thumbs up" className="h-56 bg-cover bg-[position:50%_25%]" style={{ backgroundImage: 'url(/about-hero.jpg)' }} />
            <div className="p-6">
              <Heart className="h-7 w-7 animate-heartbeat fill-mint text-mint" aria-hidden />
              <p className="mt-3 text-2xl font-semibold italic leading-snug">“{t('about.quote')}”</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

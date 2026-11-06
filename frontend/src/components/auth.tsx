'use client';
import { BookOpen, Loader2, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { LogoMark } from './Logo';

/**
 * Animated gradient, drifting orbs and floating "whisper" bubbles.
 * Want a photo? Drop `public/login-hero.jpg` into the frontend and it fades in behind the gradient automatically.
 */
const PHOTO_MASK = 'linear-gradient(to right, transparent 0%, #000 14%, #000 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 22%, #000 100%)';

export function AnimatedBackdrop() {
  const { t } = useI18n();
  const bubbles = [
    { text: t('react.not_alone'), pos: 'left-[44%] top-[11%]', delay: '0s' },
    { text: t('react.listening'), pos: 'left-[52%] bottom-[14%]', delay: '1.6s' },
    { text: t('react.sending_support'), pos: 'left-[33%] bottom-[7%]', delay: '3.2s' },
  ];
  return (
    <div aria-hidden className="auth-bg absolute inset-0 animate-gradient">
      {/* Small screens: the photo is a faint full-bleed backdrop */}
      <div className="absolute inset-0 bg-cover bg-[position:35%_20%] opacity-25 lg:hidden" style={{ backgroundImage: 'url(/login-hero.jpg)' }} />
      {/* Large screens: the couple sits in the gap between the headline and the login card, edges faded into the gradient */}
      <div className="absolute bottom-0 left-[29.5%] hidden aspect-[1220/1106] w-[41%] max-w-[780px] bg-cover bg-center lg:block"
        style={{ backgroundImage: 'url(/login-hero.jpg)', WebkitMaskImage: PHOTO_MASK, maskImage: PHOTO_MASK, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' }} />
      <div className="absolute -left-24 top-10 h-96 w-96 animate-drift rounded-full bg-brand-500/50 blur-3xl" />
      <div className="absolute -bottom-24 right-1/4 h-[28rem] w-[28rem] animate-drift rounded-full bg-mint/30 blur-3xl [animation-delay:-8s]" />
      <div className="absolute right-0 top-0 h-80 w-80 animate-drift rounded-full bg-fuchsia-500/25 blur-3xl [animation-delay:-4s]" />
      {bubbles.map((b) => (
        <span key={b.text} className={cn('absolute hidden animate-float items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-md xl:flex', b.pos)} style={{ animationDelay: b.delay }}>
          <span className="h-2 w-2 rounded-full bg-mint" />{b.text}
        </span>
      ))}
    </div>
  );
}

const FEATURES: Array<{ icon: LucideIcon; title: 'hero.f1t' | 'hero.f2t' | 'hero.f3t'; desc: 'hero.f1d' | 'hero.f2d' | 'hero.f3d' }> = [
  { icon: ShieldCheck, title: 'hero.f1t', desc: 'hero.f1d' }, { icon: Users, title: 'hero.f2t', desc: 'hero.f2d' }, { icon: BookOpen, title: 'hero.f3t', desc: 'hero.f3d' },
];

export function HeroCopy({ children, showFeatures = true }: { children?: ReactNode; showFeatures?: boolean }) {
  const { t } = useI18n();
  const tagline = t('app.tagline');
  const parts = tagline.match(/[^.]+\./g)?.map((p) => p.trim()) ?? [tagline];
  return (
    <div className="relative z-10">
      <div className="flex animate-fade-up items-center gap-4">
        <LogoMark className="h-14 w-14 animate-heartbeat drop-shadow-[0_0_18px_rgba(45,212,191,0.55)]" />
        <div><p className="text-4xl font-extrabold tracking-tight">Whisper</p><p className="text-sm text-white/75">{t('hero.tag')}</p></div>
      </div>
      <h1 className="mt-8 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
        {parts.map((p, i) => (
          <span key={p} className={cn('mr-3 inline-block animate-fade-up', i === parts.length - 1 && 'bg-gradient-to-r from-mint to-brand-300 bg-clip-text text-transparent')} style={{ animationDelay: `${0.15 + i * 0.18}s` }}>{p}</span>
        ))}
      </h1>
      <p className="mt-4 max-w-sm animate-fade-up text-lg text-white/85 [animation-delay:.7s]">{t('hero.sub')}</p>
      {showFeatures && (
        <ul className="mt-8 hidden space-y-4 lg:block">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <li key={title} className="flex animate-fade-up items-center gap-4" style={{ animationDelay: `${0.9 + i * 0.15}s` }}>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mint/20 text-mint ring-1 ring-mint/40"><Icon className="h-5 w-5" aria-hidden /></span>
              <span><span className="block font-bold">{t(title)}</span><span className="block text-sm text-white/70">{t(desc)}</span></span>
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}

export function GradientButton({ loading, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button {...rest} disabled={rest.disabled || loading}
      className={cn('group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-mint via-brand-300 to-brand-400 px-5 py-3.5 text-sm font-bold text-brand-950 shadow-lg shadow-black/25 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60', className)}>
      <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent group-hover:animate-shimmer" />
      <span className="relative flex items-center gap-2">{loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{children}</span>
    </button>
  );
}

export function IconInput({ icon: Icon, right, ...props }: InputHTMLAttributes<HTMLInputElement> & { icon: LucideIcon; right?: ReactNode }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" aria-hidden />
      <input {...props} className="input pl-11 pr-12" />
      {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
  );
}

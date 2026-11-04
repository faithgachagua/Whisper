import { cn } from '@/lib/utils';

export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9B7CF7" /><stop offset="1" stopColor="#4C2AB0" />
        </linearGradient>
      </defs>
      <path d="M24 42S5 30.5 5 17.5C5 11.7 9.4 7 15 7c3.6 0 7 1.9 9 5 2-3.1 5.4-5 9-5 5.6 0 10 4.700 10 10.500C43 30.500 24 42 24 42Z" fill="url(#wg)" />
      <path d="M14 22.500c3-3 5.500-3 8 0s5 3 8 0 3.500-2.500 5-1" fill="none" stroke="#fff" strokeWidth="2.600" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-bold tracking-tight', className)}>
      <LogoMark />
      <span className={cn('text-2xl', dark ? 'text-white' : 'text-brand-700')}>Whisper</span>
    </span>
  );
}

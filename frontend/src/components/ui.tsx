'use client';
import Link from 'next/link';
import { Loader2, X } from 'lucide-react';
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50',
  ghost: 'text-brand-700 hover:bg-brand-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export function Button({ variant = 'primary', loading, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button {...rest} disabled={rest.disabled || loading} className={cn(base, variants[variant], className)}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = 'primary', className, children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return <Link href={href} className={cn(base, variants[variant], className)}>{children}</Link>;
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink/60">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

export function Chip({ active, onClick, children, disabled }: { active?: boolean; onClick?: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active}
      className={cn('rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors disabled:opacity-50',
        active ? 'border-brand-500 bg-brand-100 text-brand-800' : 'border-brand-200 bg-white text-ink hover:bg-brand-50')}>
      {children}
    </button>
  );
}

export function Spinner({ label }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink/60" role="status"><Loader2 className="h-5 w-5 animate-spin" aria-hidden />{label}</div>;
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-10 text-center">
      <p className="max-w-sm text-sm text-ink/70">{title}</p>
      {action}
    </div>
  );
}

export function Notice({ tone = 'error', children }: { tone?: 'error' | 'info' | 'success'; children: ReactNode }) {
  const tones = { error: 'bg-red-50 text-red-800 ring-red-200', info: 'bg-brand-50 text-brand-800 ring-brand-200', success: 'bg-emerald-50 text-emerald-800 ring-emerald-200' };
  return <div role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-xl px-4 py-3 text-sm ring-1', tones[tone])}>{children}</div>;
}

export function Avatar({ name, size = 'md', online }: { name: string; size?: 'sm' | 'md' | 'lg'; online?: boolean }) {
  const dim = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-16 w-16 text-xl' : 'h-10 w-10 text-sm';
  const dot = size === 'sm' ? 'h-2.5 w-2.5' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3';
  return (
    <span className="relative inline-flex shrink-0">
      <span aria-hidden className={cn('flex items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700', dim)}>{name.trim().charAt(0).toUpperCase() || '?'}</span>
      {online && <span role="img" aria-label="Online" className={cn('absolute bottom-0 right-0 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#1D1640]', dot)} />}
    </span>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-ink/60">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand-800">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink/50">{hint}</p>}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full overflow-y-auto rounded-t-card bg-white p-6 shadow-card sm:max-w-md sm:rounded-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-brand-50"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink/60">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

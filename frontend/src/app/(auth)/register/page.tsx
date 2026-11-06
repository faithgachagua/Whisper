'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { GradientButton, IconInput } from '@/components/auth';
import { Field, Notice } from '@/components/ui';
import { api, errMsg } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { User } from '@/lib/types';

export default function RegisterPage() {
  const { t, locale } = useI18n();
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError(t('auth.mismatch')); return; }
    setBusy(true); setError('');
    try {
      const { token, user } = await api<{ token: string; user: User }>('/auth/register', { body: { email, password, acceptedTerms: agree, locale } });
      signIn(token, user);
      router.replace('/onboarding');
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center"><h2 className="text-3xl font-extrabold text-brand-900">{t('auth.createTitle')}</h2><p className="mt-1 text-sm text-ink/70">{t('auth.createSub')}</p></div>
      {error && <Notice>{error}</Notice>}
      <Field label={t('auth.email')} hint="Only used to sign in and keep your account safe. It is never shown to others.">
        <IconInput icon={Mail} type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label={t('auth.password')} hint="At least 8 characters, with a letter and a number.">
        <IconInput icon={Lock} type="password" autoComplete="new-password" required minLength={8} placeholder={t('auth.createPassword')} value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label={t('auth.confirm')}>
        <IconInput icon={Lock} type="password" autoComplete="new-password" required placeholder={t('auth.confirmPh')} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <label className="flex items-start gap-3 text-sm text-ink/85">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required className="mt-0.5 h-4 w-4" />
        <span>{t('auth.agreePre')} <Link href="/help" className="font-semibold text-brand-600 underline">{t('auth.terms')}</Link> {t('auth.and')} <Link href="/help" className="font-semibold text-brand-600 underline">{t('auth.privacy')}</Link></span>
      </label>
      <GradientButton type="submit" loading={busy}>{t('common.next')}<ArrowRight className="h-4 w-4" aria-hidden /></GradientButton>
      <p className="text-center text-sm text-ink/80">{t('auth.haveAccount')} <Link href="/login" className="font-bold text-brand-600 hover:underline">{t('common.login')}</Link></p>
    </form>
  );
}

'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { GradientButton, IconInput } from '@/components/auth';
import { Field, Notice } from '@/components/ui';
import { api, errMsg } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { User } from '@/lib/types';

export default function LoginPage() {
  const { t } = useI18n();
  const { signIn } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { token, user } = await api<{ token: string; user: User }>('/auth/login', { body: { identifier, password } });
      signIn(token, user);
      router.replace(user.role === 'moderator' ? '/moderator' : user.onboarded ? '/home' : '/onboarding');
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="text-center"><h2 className="text-3xl font-extrabold text-brand-900">{t('auth.welcomeBack')}!</h2><p className="mt-1 text-sm text-ink/70">{t('auth.loginSub')}</p></div>
      {error && <Notice>{error}</Notice>}
      <Field label={t('auth.identifier')}>
        <IconInput icon={Mail} autoComplete="username" required placeholder={t('auth.identifierPh')} value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
      </Field>
      <Field label={t('auth.password')}>
        <IconInput icon={Lock} type={show ? 'text' : 'password'} autoComplete="current-password" required placeholder={t('auth.passwordPh')} value={password} onChange={(e) => setPassword(e.target.value)}
          right={<button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="text-white/60 hover:text-white">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>} />
      </Field>
      <GradientButton type="submit" loading={busy}>{t('common.login')}<ArrowRight className="h-4 w-4" aria-hidden /></GradientButton>
      <p className="text-center text-sm text-ink/80">{t('auth.noAccount')} <Link href="/register" className="font-bold text-brand-600 hover:underline">{t('auth.createOne')}</Link></p>
    </form>
  );
}

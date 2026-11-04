'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Field, Notice } from '@/components/ui';
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
      <div><h1 className="text-2xl font-bold text-brand-900">{t('auth.welcomeBack')}</h1><p className="mt-1 text-sm text-ink/60">{t('auth.loginSub')}</p></div>
      {error && <Notice>{error}</Notice>}
      <Field label={t('auth.identifier')}>
        <input className="input" autoComplete="username" required placeholder={t('auth.identifierPh')} value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
      </Field>
      <Field label={t('auth.password')}>
        <div className="relative">
          <input className="input pr-12" type={show ? 'text' : 'password'} autoComplete="current-password" required placeholder={t('auth.passwordPh')} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </div>
      </Field>
      <Button type="submit" className="w-full" loading={busy}>{t('common.login')}</Button>
      <p className="text-center text-sm text-ink/70">{t('auth.noAccount')} <Link href="/register" className="font-semibold text-brand-600 hover:underline">{t('auth.createOne')}</Link></p>
    </form>
  );
}

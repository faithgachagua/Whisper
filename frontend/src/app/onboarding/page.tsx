'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Chip, Field, Notice } from '@/components/ui';
import { api, ApiError, errMsg } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LAUNCH_COMMUNITIES } from '@/lib/communities';
import { useI18n } from '@/lib/i18n';
import type { Community, User } from '@/lib/types';
import { cn } from '@/lib/utils';

const AGES = ['under_13', '13_17', '18_24', '25_34', '35_44', '45_plus', 'prefer_not_to_say'] as const;
const GENDERS = ['female', 'male', 'non_binary', 'prefer_not_to_say', 'other'] as const;

export default function OnboardingPage() {
  const { t, locale } = useI18n();
  const { user, loading, setUser, signOut } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [age, setAge] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [loading, user, router]);
  useEffect(() => { if (user && step < 3) setUsername(user.pseudonym); }, [user, step]);

  // Anyone who is not a self-reported adult only sees youth-safe topics.
  const adult = age !== null && ['18_24', '25_34', '35_44', '45_plus'].includes(age);
  const topics = LAUNCH_COMMUNITIES.filter((c) => adult || c.youthSafe);

  async function finish() {
    setBusy(true); setError('');
    try {
      const body = { ageBand: age ?? undefined, gender: gender ?? undefined, interests, locale };
      const { user: updated } = await api<{ user: User }>('/users/me/onboarding', { body });
      setUser(updated);
      // Join the communities they picked (the server enforces age rules).
      if (interests.length) {
        const { items } = await api<{ items: Community[] }>('/communities');
        await Promise.all(items.filter((c) => interests.includes(c.slug)).map((c) => api(`/communities/${c.id}/join`, { method: 'POST' }).catch(() => undefined)));
      }
      setStep(3);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'UNDERAGE_NOT_ELIGIBLE') setBlocked(e.message);
      else setError(errMsg(e));
    } finally { setBusy(false); }
  }

  async function enter() {
    setBusy(true); setError('');
    try {
      if (user && username && username !== user.pseudonym) {
        const { user: updated } = await api<{ user: User }>('/users/me', { method: 'PATCH', body: { pseudonym: username } });
        setUser(updated);
      }
      router.replace('/home');
    } catch (e) { setError(errMsg(e)); setBusy(false); }
  }

  if (blocked) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
        <div className="card space-y-4 p-6"><h1 className="text-xl font-bold text-brand-900">We can’t open an account for you yet</h1><p className="text-sm text-ink/80">{blocked}</p>
          <Button variant="secondary" onClick={() => { signOut(); router.replace('/'); }}>OK</Button></div>
      </div>
    );
  }

  const steps = [t('onb.age'), t('onb.gender'), t('onb.interests'), t('onb.complete')];

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-brand-50 to-canvas px-4 py-8">
      <ol className="mb-6 flex w-full max-w-md items-center justify-between" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col items-center gap-1 text-xs" aria-current={i === step ? 'step' : undefined}>
            <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold', i <= step ? 'bg-brand-600 text-white' : 'bg-white text-ink/50 ring-1 ring-brand-200')}>{i + 1}</span>
            <span className={i === step ? 'font-semibold text-brand-800' : 'text-ink/50'}>{s}</span>
          </li>
        ))}
      </ol>
      <div className="card w-full max-w-md space-y-5 p-6 sm:p-8">
        {error && <Notice>{error}</Notice>}

        {step === 0 && (<>
          <div><h1 className="text-xl font-bold text-brand-900">{t('onb.ageTitle')}</h1><p className="mt-1 text-sm text-ink/60">{t('onb.ageSub')}</p></div>
          <div className="space-y-2" role="radiogroup">{AGES.map((a) => <Chip key={a} active={age === a} onClick={() => setAge(a)}>{t(`age.${a}` as const)}</Chip>)}</div>
          <p className="text-xs text-ink/60">{t('onb.ageNote')}</p>
          <div className="flex gap-3"><Button variant="ghost" onClick={() => { setAge(null); setStep(1); }}>{t('common.skip')}</Button><Button className="flex-1" disabled={!age} onClick={() => setStep(1)}>{t('common.next')}</Button></div>
        </>)}

        {step === 1 && (<>
          <div><h1 className="text-xl font-bold text-brand-900">{t('onb.genderTitle')}</h1><p className="mt-1 text-sm text-ink/60">{t('onb.genderSub')}</p></div>
          <div className="space-y-2" role="radiogroup">{GENDERS.map((g) => <Chip key={g} active={gender === g} onClick={() => setGender(g)}>{t(`gender.${g}` as const)}</Chip>)}</div>
          <div className="flex gap-3"><Button variant="ghost" onClick={() => setStep(0)}>{t('common.back')}</Button><Button variant="ghost" onClick={() => { setGender(null); setStep(2); }}>{t('common.skip')}</Button><Button className="flex-1" onClick={() => setStep(2)}>{t('common.next')}</Button></div>
        </>)}

        {step === 2 && (<>
          <div><h1 className="text-xl font-bold text-brand-900">{t('onb.interestsTitle')}</h1><p className="mt-1 text-sm text-ink/60">{t('onb.interestsSub')}</p></div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {topics.map((c) => (
              <Chip key={c.slug} active={interests.includes(c.slug)} onClick={() => setInterests((cur) => (cur.includes(c.slug) ? cur.filter((x) => x !== c.slug) : [...cur, c.slug]))}>{locale === 'sw' ? c.sw : c.en}</Chip>
            ))}
          </div>
          <div className="flex gap-3"><Button variant="ghost" onClick={() => setStep(1)}>{t('common.back')}</Button><Button className="flex-1" loading={busy} onClick={finish}>{t('common.finish')}</Button></div>
        </>)}

        {step === 3 && (<>
          <div><h1 className="text-xl font-bold text-brand-900">{t('onb.doneTitle')}</h1><p className="mt-1 text-sm text-ink/60">{t('onb.doneSub')}</p></div>
          <Field label={t('onb.username')} hint="3–24 characters. Pick something that doesn’t reveal who you are.">
            <input className="input" value={username} maxLength={24} onChange={(e) => setUsername(e.target.value)} />
          </Field>
          <Button className="w-full" loading={busy} onClick={enter}>{t('onb.enter')}</Button>
        </>)}
      </div>
    </main>
  );
}

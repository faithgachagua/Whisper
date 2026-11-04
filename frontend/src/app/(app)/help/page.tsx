'use client';
import { useEffect, useState } from 'react';
import { SafetyCard } from '@/components/SafetyCard';
import { PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { SafetyPayload } from '@/lib/types';

export default function HelpPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [data, setData] = useState<{ resources: (SafetyPayload['resources'][number] & { audience: string })[]; rules: string[] } | null>(null);
  useEffect(() => { api<typeof data>('/safety/resources').then(setData).catch(() => undefined); }, []);
  const resources = data?.resources.filter((r) => r.audience === 'all' || user?.ageTier !== 'adult') ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={t('help.title')} />
      <section className="space-y-3">
        <h2 className="font-bold text-brand-900">{t('help.urgent')}</h2>
        <SafetyCard safety={{ message: 'If you or someone else is in danger, call emergency services now. These lines are free and confidential.', resources }} />
        <p className="text-xs text-ink/50">{t('help.note')}</p>
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="font-bold text-brand-900">{t('help.rules')}</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink/80">{(data?.rules ?? []).map((r) => <li key={r}>{r}</li>)}</ul>
      </section>
      <section className="card space-y-2 p-5 text-sm text-ink/80">
        <h2 className="font-bold text-brand-900">Reporting and blocking</h2>
        <p>Use the ⋯ menu on any post to report, mute or block. In a support chat, use the flag or block buttons at the top. Moderators review every report, and urgent ones first.</p>
      </section>
    </div>
  );
}

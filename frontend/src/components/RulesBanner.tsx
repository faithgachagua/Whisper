'use client';
import { ShieldAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Community } from '@/lib/types';

/** Community-specific rules (e.g. the Cheating and Betrayal community). */
export function RulesBanner({ community }: { community: Pick<Community, 'rules' | 'rulesSw'> }) {
  const { locale } = useI18n();
  const rules = (locale === 'sw' && community.rulesSw?.length ? community.rulesSw : community.rules) ?? [];
  if (rules.length === 0) return null;
  return (
    <div role="note" className="mb-5 rounded-card border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
      <p className="mb-2 flex items-center gap-2 font-bold"><ShieldAlert className="h-4 w-4" aria-hidden />{locale === 'sw' ? 'Kanuni za jamii hii' : 'Rules for this community'}</p>
      <ul className="list-disc space-y-1 pl-5">{rules.map((r) => <li key={r}>{r}</li>)}</ul>
    </div>
  );
}

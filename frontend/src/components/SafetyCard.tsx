'use client';
import { HeartHandshake } from 'lucide-react';
import type { SafetyPayload } from '@/lib/types';

export function SafetyCard({ safety }: { safety: Pick<SafetyPayload, 'message' | 'resources'> }) {
  return (
    <div role="status" className="rounded-card border border-brand-200 bg-brand-50 p-5">
      <div className="flex items-start gap-3">
        <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-brand-900">{safety.message}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {safety.resources.map((r) => (
              <li key={r.id}>
                <span className="font-semibold">{r.name}: </span>
                <a href={`tel:${r.contact.replace(/[^+\d]/g, '')}`} className="font-bold text-brand-700 underline">{r.contact}</a>
                <span className="block text-xs text-ink/60">{r.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

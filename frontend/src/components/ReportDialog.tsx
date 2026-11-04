'use client';
import { useState } from 'react';
import { api, errMsg } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Button, Modal, Notice } from './ui';

const REASONS = [
  ['harassment', 'Harassment or bullying'], ['hate', 'Hate or discrimination'], ['self_harm', 'Self-harm or crisis'],
  ['grooming', 'Unsafe contact with a young person'], ['sexual_content', 'Sexual content'], ['spam', 'Spam'], ['other', 'Something else'],
] as const;

export function ReportDialog({ targetType, targetId, onClose }: { targetType: 'post' | 'comment' | 'user' | 'conversation'; targetId: string; onClose: () => void }) {
  const { t } = useI18n();
  const [reason, setReason] = useState<string>('harassment');
  const [details, setDetails] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  async function submit() {
    setState('sending'); setError('');
    try { await api('/reports', { body: { targetType, targetId, reason, details: details || undefined } }); setState('done'); }
    catch (e) { setError(errMsg(e)); setState('idle'); }
  }

  return (
    <Modal title={t('post.reportTitle')} onClose={onClose}>
      {state === 'done' ? (
        <div className="space-y-4">
          <Notice tone="success">Thank you. Our moderators will review this.</Notice>
          <Button className="w-full" onClick={onClose}>OK</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{t('post.reportWhy')}</legend>
            <div className="space-y-2">
              {REASONS.map(([id, label]) => (
                <label key={id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-brand-200 px-4 py-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                  <input type="radio" name="reason" checked={reason === id} onChange={() => setReason(id)} className="accent-brand-600" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <textarea className="input min-h-20" placeholder="Anything else we should know? (optional)" maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
          {error && <Notice>{error}</Notice>}
          <Button className="w-full" onClick={submit} loading={state === 'sending'}>{t('common.report')}</Button>
        </div>
      )}
    </Modal>
  );
}

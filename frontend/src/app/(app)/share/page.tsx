'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ImagePicker, type Img } from '@/components/ImagePicker';
import { RulesBanner } from '@/components/RulesBanner';
import { SafetyCard } from '@/components/SafetyCard';
import { Button, Field, Notice, PageHeader } from '@/components/ui';
import { api, errMsg } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { Community, Post, SafetyPayload } from '@/lib/types';

export default function SharePage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [communityId, setCommunityId] = useState('');
  const [body, setBody] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [safety, setSafety] = useState<SafetyPayload | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [images, setImages] = useState<Img[]>([]);
  const selected = communities.find((c) => c.id === communityId);
  const photoBlock = user && user.ageTier !== 'adult' ? 'Photos are for adult members only, to keep younger members safe.' : selected?.noImages ? 'Photos aren’t allowed in this community.' : undefined;

  useEffect(() => { api<{ items: Community[] }>('/communities').then((r) => { setCommunities(r.items); if (r.items[0]) setCommunityId(r.items[0].id); }).catch((e) => setError(errMsg(e))); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await api<{ post: Post; safety: SafetyPayload | null }>('/posts', { body: { communityId, body, anonymous, imageIds: photoBlock ? [] : images.map((i) => i.id) } });
      if (r.safety) { setSafety(r.safety); setPostId(r.post.id); } else router.push(`/posts/${r.post.id}`);
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  }

  if (safety) {
    return (
      <div className="space-y-4">
        <Notice tone="success">Your post has been shared.</Notice>
        <SafetyCard safety={safety} />
        <div className="flex gap-3"><Button onClick={() => router.push('/talk')}>{t('nav.talk')}</Button><Button variant="secondary" onClick={() => router.push(`/posts/${postId}`)}>View post</Button></div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <PageHeader title={t('share.title')} sub={t('share.sub')} />
      {error && <Notice>{error}</Notice>}
      <Field label={t('share.community')}>
        <select className="input" value={communityId} onChange={(e) => setCommunityId(e.target.value)} required>
          {communities.map((c) => <option key={c.id} value={c.id}>{locale === 'sw' ? c.nameSw : c.name}</option>)}
        </select>
      </Field>
      {selected && <RulesBanner community={selected} />}
      <Field label={t('share.placeholder')} hint={t('share.noPersonal')}>
        <textarea className="input min-h-44 resize-y" value={body} maxLength={2000} required onChange={(e) => setBody(e.target.value)} />
        <span className="mt-1 block text-right text-xs text-ink/40">{body.length}/2000</span>
      </Field>
      <ImagePicker value={images} onChange={setImages} context="post" blockedReason={photoBlock} />
      <label className="flex items-center gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
        <span><span className="font-semibold">{t('post.postAnon')}</span><span className="block text-xs text-ink/60">{anonymous ? 'Shown as “Anonymous member”.' : `${t('post.posting')} ${user?.pseudonym}.`}</span></span>
      </label>
      <Button type="submit" className="w-full" loading={busy} disabled={body.trim().length < 3 || !communityId}>{t('share.publish')}</Button>
    </form>
  );
}

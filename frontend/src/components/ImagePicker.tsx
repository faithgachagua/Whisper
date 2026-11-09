'use client';
import { ImageOff, ImagePlus, Loader2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { assetUrl, errMsg, uploadImage } from '@/lib/api';

export interface Img { id: string; url: string }
const OK = ['image/jpeg', 'image/png', 'image/webp'];

export function ImagePicker({ value, onChange, context, max = 4, blockedReason }: { value: Img[]; onChange: (v: Img[]) => void; context: 'post' | 'message'; max?: number; blockedReason?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (blockedReason) return <p className="flex items-center gap-2 text-xs text-ink/55"><ImageOff className="h-4 w-4 shrink-0" aria-hidden />{blockedReason}</p>;

  async function onFiles(files: FileList | null) {
    if (!files) return;
    setError(''); setBusy(true);
    try {
      let list = [...value];
      for (const f of Array.from(files)) {
        if (list.length >= max) break;
        if (!OK.includes(f.type)) { setError('Use JPEG, PNG or WebP photos.'); continue; }
        if (f.size > 5 * 1024 * 1024) { setError('Each photo must be under 5 MB.'); continue; }
        list = [...list, await uploadImage(f, context)];
        onChange(list);
      }
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); if (ref.current) ref.current.value = ''; }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {value.map((img) => (
          <div key={img.id} className="relative h-16 w-16 overflow-hidden rounded-xl ring-1 ring-brand-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetUrl(img.url)} alt="Selected photo" className="h-full w-full object-cover" />
            <button type="button" onClick={() => onChange(value.filter((x) => x.id !== img.id))} aria-label="Remove photo" className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"><X className="h-3 w-3" /></button>
          </div>
        ))}
        {value.length < max && (
          <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="flex items-center gap-2 rounded-xl border border-dashed border-brand-300 px-4 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}Add photo
          </button>
        )}
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" multiple={max > 1} hidden onChange={(e) => onFiles(e.target.files)} />
      </div>
      {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
      <p className="text-xs text-ink/55">Other members see photos blurred until they tap. Don’t share faces, ID cards, screens or anything that identifies you or someone else.</p>
    </div>
  );
}

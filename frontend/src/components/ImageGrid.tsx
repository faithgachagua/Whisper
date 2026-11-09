'use client';
import { useState } from 'react';
import { assetUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Modal } from './ui';

/** Photos from other people are blurred until tapped; tap again to enlarge. */
export function ImageGrid({ images, autoReveal = false }: { images: { id: string; url: string }[]; autoReveal?: boolean }) {
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [big, setBig] = useState<string | null>(null);
  if (images.length === 0) return null;

  return (
    <>
      <div className={cn('mt-3 grid gap-2', images.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
        {images.map((img) => {
          const visible = autoReveal || shown[img.id];
          return (
            <button key={img.id} type="button" onClick={() => (visible ? setBig(img.url) : setShown((s) => ({ ...s, [img.id]: true })))}
              aria-label={visible ? 'Enlarge photo' : 'Show photo'} className="relative overflow-hidden rounded-xl bg-brand-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl(img.url)} alt="Photo shared by a member" loading="lazy" className={cn('w-full object-cover', images.length === 1 ? 'max-h-96' : 'h-40', !visible && 'scale-110 blur-2xl')} />
              {!visible && <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs font-bold text-white">Tap to view</span>}
            </button>
          );
        })}
      </div>
      {big && (
        <Modal title="Photo" onClose={() => setBig(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assetUrl(big)} alt="Photo shared by a member" className="max-h-[70vh] w-full rounded-xl object-contain" />
        </Modal>
      )}
    </>
  );
}

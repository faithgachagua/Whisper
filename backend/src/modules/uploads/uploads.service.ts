import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import { env } from '../../config/env';
import { db, newId, now } from '../../core/db';
import { badRequest, forbidden } from '../../core/errors';
import type { ImageRecord } from '../../core/types';
import { scanImage } from './scan';

/** Identify the real file type from its first bytes — never trust the Content-Type header. */
export function sniff(buf: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

const fileOf = (id: string) => path.join(env.uploadDir, `${id}.webp`);

/** Validate, strip metadata (EXIF/GPS), shrink and store. Everything is re-encoded as WebP. */
export async function saveImage(ownerId: string, buf: Buffer, context: ImageRecord['context']): Promise<ImageRecord> {
  if (!sniff(buf)) throw badRequest('Please upload a JPEG, PNG or WebP photo.', 'UNSUPPORTED_IMAGE');
  const verdict = await scanImage(buf);
  if (!verdict.ok) throw forbidden(verdict.reason ?? 'This image can’t be shared on Whisper.', 'IMAGE_REJECTED');
  let out: { data: Buffer; info: { width: number; height: number } };
  try {
    out = await sharp(buf, { failOn: 'error', limitInputPixels: 40_000_000 })
      .rotate() // apply EXIF orientation; metadata is dropped on output
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw badRequest('That image could not be read. Try a different photo.', 'BAD_IMAGE');
  }
  const id = newId();
  fs.mkdirSync(env.uploadDir, { recursive: true });
  fs.writeFileSync(fileOf(id), out.data);
  const rec: ImageRecord = { id, ownerId, status: 'pending', context, bytes: out.data.length, width: out.info.width, height: out.info.height, createdAt: now() };
  db.data.images.push(rec);
  db.save();
  return rec;
}

/** Short-lived link: <img> tags cannot send an Authorization header, so access is granted when the API builds a post/message the viewer may see. */
export const signedUrl = (id: string) => `/uploads/${id}?t=${jwt.sign({ img: id }, env.jwtSecret, { expiresIn: '1h' })}`;

export function verifyToken(id: string, token: unknown): boolean {
  try { return typeof token === 'string' && (jwt.verify(token, env.jwtSecret) as { img?: string }).img === id; } catch { return false; }
}

export const fileFor = (id: string) => {
  const rec = db.data.images.find((i) => i.id === id);
  return rec && rec.status !== 'removed' && fs.existsSync(fileOf(id)) ? fileOf(id) : null;
};

/** Images that belong to this user, are unattached and were uploaded for this purpose. */
export function validateImages(userId: string, ids: string[], context: ImageRecord['context']): ImageRecord[] {
  return [...new Set(ids)].map((id) => {
    const rec = db.data.images.find((i) => i.id === id);
    if (!rec || rec.ownerId !== userId || rec.status !== 'pending' || rec.context !== context) {
      throw badRequest('One of the photos is no longer available. Please add it again.', 'IMAGE_INVALID');
    }
    return rec;
  });
}
export const markAttached = (recs: ImageRecord[]) => recs.forEach((r) => { r.status = 'attached'; });

export const attachedImages = (ids: string[] = []) =>
  ids.filter((id) => db.data.images.some((i) => i.id === id && i.status === 'attached')).map((id) => ({ id, url: signedUrl(id) }));

export function removeImages(ids: string[]) {
  for (const id of ids) {
    const rec = db.data.images.find((i) => i.id === id);
    if (!rec) continue;
    rec.status = 'removed';
    try { fs.unlinkSync(fileOf(id)); } catch { /* already gone */ }
  }
  db.save();
}

/** Delete photos that were uploaded but never attached to a post or message. */
export function purgeStaleUploads() {
  const cutoff = Date.now() - 24 * 3_600_000;
  const stale = db.data.images.filter((i) => i.status === 'pending' && new Date(i.createdAt).getTime() < cutoff).map((i) => i.id);
  if (stale.length) removeImages(stale);
}

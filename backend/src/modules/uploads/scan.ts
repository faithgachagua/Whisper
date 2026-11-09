/**
 * Hook for automated image moderation. It currently allows everything.
 * BEFORE LAUNCH connect a real classifier (e.g. Google Cloud Vision SafeSearch, AWS Rekognition Moderation,
 * Hive, Sightengine) and reject nudity, sexual content involving minors, gore and violence here.
 */
export async function scanImage(_data: Buffer): Promise<{ ok: boolean; reason?: string }> {
  return { ok: true };
}

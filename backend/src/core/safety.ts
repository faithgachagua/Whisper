import { SAFETY_RESOURCES } from '../config/safety';

const CRISIS = [
  /kill (myself|me)\b/i, /end (my|it all|my life)/i, /\bsuicid/i, /want to die/i, /don'?t want to (live|be here)/i,
  /self[- ]?harm/i, /hurt myself/i, /\bcut(ting)? myself/i,
  // Kiswahili
  /kujiua/i, /kujiumiza/i, /nataka kufa/i, /sitaki kuishi/i, /nimechoka na maisha/i,
];

const PII = [
  /[\w.+-]+@[\w-]+\.[\w.]+/,                         // email
  /(\+?254|0)[\s-]?[17]\d{2}[\s-]?\d{3}[\s-]?\d{3}/, // Kenyan mobile numbers
  /\b(whats?app|telegram|snap(chat)?|insta(gram)?|tiktok)\b.{0,20}(@|\d{6,})/i,
  /(^|\s)@[a-z0-9_.]{3,}/i,                          // social handle
];

const RISKY_REQUESTS = [/\bsend (me )?(a )?(pic|photo|nudes?)/i, /\bnitumie picha/i, /\b(dm|inbox) me\b/i, /\bkeep (this|it) (a )?secret\b/i];

export const hasCrisisLanguage = (text: string) => CRISIS.some((r) => r.test(text));
export const hasPersonalInfo = (text: string) => PII.some((r) => r.test(text));
export const hasRiskyContactRequest = (text: string) => RISKY_REQUESTS.some((r) => r.test(text));

export function safetyPayload(audience: 'youth' | 'adult' | 'unknown') {
  return {
    crisis: true as const,
    message: 'It sounds like things are really heavy right now. You are not alone, and support is available.',
    resources: SAFETY_RESOURCES.filter((r) => r.audience === 'all' || audience !== 'adult'),
  };
}

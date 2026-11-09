/**
 * Crisis and safeguarding resources shown when risky language is detected.
 * IMPORTANT: confirm every contact below with the organisation before launch —
 * numbers and opening hours change.
 */
export const SAFETY_RESOURCES = [
  { id: 'childline', name: 'Childline Kenya', contact: '116', note: 'Free child helpline for anyone under 18.', audience: 'youth' },
  { id: 'redcross', name: 'Kenya Red Cross', contact: '1199', note: 'Free counselling line.', audience: 'all' },
  { id: 'befrienders', name: 'Befrienders Kenya', contact: '+254 722 178 177', note: 'Emotional support from trained volunteers.', audience: 'all' },
  { id: 'emergency', name: 'Emergency services', contact: '999 / 112', note: 'If someone is in immediate danger.', audience: 'all' },
] as const;

export const COMMUNITY_RULES = [
  'Be kind. No bullying, hate or harassment.',
  'Never share personal details (phone, email, social handles, school or home address).',
  'Listeners are peers, not licensed therapists. They cannot diagnose or prescribe.',
  'If you or someone else is in danger, contact emergency services or a helpline right away.',
];

/**
 * Photos are limited to self-reported adults. Young members and anyone whose age is unknown cannot upload,
 * and cannot be sent photos in support chats. Changing this needs a child-safety review first.
 */
export const IMAGES_ADULTS_ONLY = true;

/** Self-reported under-13 users cannot take part. Confirm the final age with legal review before launch. */
export const MIN_PARTICIPATION_AGE = 13;

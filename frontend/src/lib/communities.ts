/** Static copy of the launch communities, used where the API is not available yet (onboarding). Keep slugs in sync with the backend seed. */
export const LAUNCH_COMMUNITIES = [
  { slug: 'mental-wellness', youthSafe: true, en: 'Mental Wellness', sw: 'Afya ya Akili' },
  { slug: 'love-relationships', youthSafe: false, en: 'Love and Relationships', sw: 'Mapenzi na Mahusiano' },
  { slug: 'family-marriage', youthSafe: false, en: 'Family and Marriage', sw: 'Familia na Ndoa' },
  { slug: 'friendship-loneliness', youthSafe: true, en: 'Friendship and Loneliness', sw: 'Urafiki na Upweke' },
  { slug: 'school-career', youthSafe: true, en: 'School and Career', sw: 'Shule na Kazi' },
  { slug: 'secrets-confessions', youthSafe: false, en: 'Secrets and Confessions', sw: 'Siri na Maungamo' },
  { slug: 'bullying-unfair-treatment', youthSafe: true, en: 'Bullying and Unfair Treatment', sw: 'Uonevu na Kutendewa Isivyo Haki' },
  { slug: 'personal-growth', youthSafe: true, en: 'Personal Growth and Life Advice', sw: 'Ukuaji Binafsi na Ushauri wa Maisha' },
] as const;

export const SUPPORT_TOPICS = [
  { id: 'mental_health', en: 'Mental health', sw: 'Afya ya akili' },
  { id: 'relationships', en: 'Relationships', sw: 'Mahusiano' },
  { id: 'family', en: 'Family', sw: 'Familia' },
  { id: 'school_career', en: 'School / Career', sw: 'Shule / Kazi' },
  { id: 'loneliness', en: 'Loneliness', sw: 'Upweke' },
  { id: 'other', en: 'Other', sw: 'Nyingine' },
] as const;

import bcrypt from 'bcryptjs';
import { env } from './config/env';
import { db, newId, now } from './core/db';
import type { Community, Post, User } from './core/types';

const COMMUNITIES: Array<Omit<Community, 'id'>> = [
  { slug: 'mental-wellness', name: 'Mental Wellness', nameSw: 'Afya ya Akili', description: 'Support, coping, self-esteem and wellbeing.', descriptionSw: 'Msaada, kukabiliana na changamoto na ustawi.', youthSafe: true },
  { slug: 'love-relationships', name: 'Love and Relationships', nameSw: 'Mapenzi na Mahusiano', description: 'Dating, breakups, trust and communication.', descriptionSw: 'Uchumba, kuachana, uaminifu na mawasiliano.', youthSafe: false },
  { slug: 'family-marriage', name: 'Family and Marriage', nameSw: 'Familia na Ndoa', description: 'Family life, parenting, marriage and home.', descriptionSw: 'Maisha ya familia, malezi, ndoa na nyumbani.', youthSafe: false },
  { slug: 'friendship-loneliness', name: 'Friendship and Loneliness', nameSw: 'Urafiki na Upweke', description: 'Making friends and feeling included.', descriptionSw: 'Kupata marafiki na kujisikia kukubalika.', youthSafe: true },
  { slug: 'school-career', name: 'School and Career', nameSw: 'Shule na Kazi', description: 'Exams, campus life, employment and goals.', descriptionSw: 'Mitihani, maisha ya chuo, ajira na malengo.', youthSafe: true },
  { slug: 'secrets-confessions', name: 'Secrets and Confessions', nameSw: 'Siri na Maungamo', description: 'Share without judgment.', descriptionSw: 'Shiriki bila hukumu.', youthSafe: false },
  { slug: 'bullying-unfair-treatment', name: 'Bullying and Unfair Treatment', nameSw: 'Uonevu na Kutendewa Isivyo Haki', description: 'Speak up about bullying and unfair treatment.', descriptionSw: 'Sema kuhusu uonevu na kutendewa isivyo haki.', youthSafe: true },
  { slug: 'personal-growth', name: 'Personal Growth and Life Advice', nameSw: 'Ukuaji Binafsi na Ushauri wa Maisha', description: 'Habits, goals and life lessons.', descriptionSw: 'Mazoea, malengo na mafunzo ya maisha.', youthSafe: true },
];

export function seed() {
  if (db.data.communities.length === 0) {
    db.data.communities = COMMUNITIES.map((c) => ({ id: newId(), ...c }));
  }
  if (!env.seedDemo || db.data.users.length > 0) { db.save(); return; }

  const hash = bcrypt.hashSync(env.seedPassword, 10);
  const mk = (email: string, pseudonym: string, role: User['role'], extra: Partial<User> = {}): User => ({
    id: newId(), email, passwordHash: hash, pseudonym, role, status: 'active', ageBand: '25_34', ageTier: 'adult', gender: 'prefer_not_to_say',
    interests: [], locale: 'en', onboarded: true, strikes: 0, showOnline: true, createdAt: now(), lastSeenAt: now(), ...extra,
  });
  const admin = mk('admin@whisper.local', 'WhisperAdmin', 'admin');
  const mod = mk('moderator@whisper.local', 'WhisperMod', 'moderator');
  const listener = mk('listener@whisper.local', 'KindListener', 'listener', { listener: { vetted: true, youthApproved: true, online: true, topics: [] } });
  const member = mk('member@whisper.local', 'QuietRiver', 'member', { ageBand: '18_24', interests: ['mental-wellness', 'school-career'] });
  const youth = mk('youth@whisper.local', 'YoungStar', 'member', { ageBand: '13_17', ageTier: 'youth', interests: ['school-career', 'friendship-loneliness'] });
  db.data.users.push(admin, mod, listener, member, youth);

  const bySlug = (slug: string) => db.data.communities.find((c) => c.slug === slug)!;
  const samples: Array<[User, string, string, boolean]> = [
    [member, 'school-career', 'It’s been a tough week. I feel overwhelmed with school and I just needed a place to say this.', true],
    [listener, 'love-relationships', 'To anyone going through a breakup… it gets better. You are still you, and you are enough.', false],
    [youth, 'school-career', 'Does anyone else struggle with anxiety before exams? How do you manage it?', true],
    [member, 'mental-wellness', 'Small win today: I went for a walk even though I did not feel like it.', true],
  ];
  samples.forEach(([author, slug, body, anonymous], i) => {
    const p: Post = { id: newId(), authorId: author.id, communityId: bySlug(slug).id, body, anonymous, status: 'visible', crisisFlag: false, createdAt: new Date(Date.now() - (i + 1) * 3_600_000).toISOString() };
    db.data.posts.push(p);
  });
  [member, youth].forEach((u) => ['mental-wellness', 'school-career'].forEach((s) => db.data.memberships.push({ userId: u.id, communityId: bySlug(s).id, joinedAt: now() })));
  db.save();

  console.log('\nDemo accounts (password: %s)\n  admin@whisper.local · moderator@whisper.local · listener@whisper.local · member@whisper.local · youth@whisper.local\n', env.seedPassword);
}

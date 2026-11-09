# Whisper — Speak. Share. Be Heard.

Anonymous, text-first community and peer-support platform (Kenya first, English + Kiswahili).

| Area     | Technology                                   |
|----------|----------------------------------------------|
| Frontend | Next.js 14 (App Router) + TypeScript        |
| Styling  | Tailwind CSS                                 |
| Backend  | Node.js + Express + TypeScript, modular API  |

## Run it

```bash
# 1. API  (http://localhost:4000)
cd backend
cp .env.example .env
npm install
npm run dev

# 2. Web  (http://localhost:3000)
cd ../frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Demo accounts (password `Whisper#2026`, created when `SEED_DEMO=true`):
`admin@` · `moderator@` · `listener@` · `member@` · `youth@` + `whisper.local`.

## Backend layout (one folder per feature)

```
backend/src
  config/      env, safety resources + community rules
  core/        store, auth middleware, validation, safety scanner, serializers
  modules/     auth · users · communities · posts · support · reports
               moderation · notifications · search · safety · admin
```
Add a feature = add a folder and one line in `modules/index.ts`.
Data is a file-backed JSON store (`backend/data/db.json`) so it runs with zero setup.
**Before launch, replace `core/db.ts` + the services with PostgreSQL** (Prisma/Drizzle/Knex).

## Frontend layout

```
frontend/src
  app/(auth)   login · register · onboarding (age → gender → interests → username)
  app/(app)    home · communities · talk (+ chat) · share · my-space · search
               notifications · help · posts/[id] · dashboard · listener · moderator · admin
  components/  AppShell, PostCard, ReportDialog, SafetyCard, ui
  lib/         api client, auth, i18n (messages/en.ts, sw.ts), types
```

## How the safety rules from the overview are implemented

- **Anonymity**: anonymous posts/comments never expose the account; blocking/reporting a post's author goes through the post, not the user id. Emails/phones/handles are rejected in posts and (for young members) in chat.
- **Age**: self-reported band is demographics *and* a safeguard tier (`youth`, `adult`, `unknown`). `unknown` ("prefer not to say"/skipped) gets youth protections. Age can't be edited later to unlock features. Under-13 is blocked (`MIN_PARTICIPATION_AGE`).
- **Youth protections**: youth/unknown members only see youth-safe communities and are only matched with vetted listeners an admin marked `youthApproved`; risky listener messages auto-flag a safeguarding report.
- **Peer support**: request → vetted, online, eligible listener accepts → text chat with report/block/leave. Listeners are labelled peers, never therapists. Crisis language triggers helplines and an urgent moderator flag.
- **Moderation**: reports queue (urgent first), remove/warn/restrict/suspend (ban = admin only), all audit-logged.
- **Admin**: aggregated stats, small groups (<5) suppressed in demographics, emails visible to admins only.
- **Presence**: the web app pings `/api/presence/heartbeat` every 30s while the tab is visible; someone is online if seen in the last 2 minutes. Members see only the number of *listeners* online and a dot on the other person inside their own chat (hidden if that person turns off “Show when I’m online”). Totals, the “N online now” pill, per-community activity and dots on avatars are **moderator/admin only**, never shown on anonymous posts, and staff see true presence. There is no public list of online members. Moderators and admins also get a 14-day complaints graph.
- **UI**: animated login/landing (gradient, floating bubbles, staggered reveals; hero photos live in `frontend/public/login-hero.jpg` and `about-hero.jpg`; swap them to change the imagery), full-width top bar, feed pages with a right rail, dark/light theme.
- **Photos** (posts and 1-to-1 chats): adults only (`IMAGES_ADULTS_ONLY`), max 4 per post / 1 per message, 5 MB. The server checks the real file type, strips EXIF/GPS, shrinks and re-encodes to WebP, and serves them through short-lived signed links (never public files). Other members see photos blurred until tapped. No photos in chats with young/unknown-age members, in the *Cheating and Betrayal* community, or in comments. Moderators can see reported photos and remove them. **Before launch, plug a real image classifier into `backend/src/modules/uploads/scan.ts`.**
- **Cheating and Betrayal community**: a place to share stories without naming or exposing anyone. No photos, no links, identity-free rules shown on the page and when posting, and a “Names or exposes a real person” report reason that goes to moderators as urgent. There is intentionally no public “expose” page.
- **Bilingual**: English/Kiswahili switch; missing Kiswahili strings fall back to English.

## Must-do before launch

1. Have a Kiswahili speaker review `frontend/src/lib/messages/sw.ts`.
2. Verify every helpline in `backend/src/config/safety.ts`.
3. Legal review: minimum age, parental consent, Kenya Data Protection Act, child-protection duties, listener vetting/training and escalation policy. Whether adults-vetted listeners may chat with 13–17s at all is a policy decision — the code makes it opt-in per listener.
4. Swap the JSON store for PostgreSQL, set a strong `JWT_SECRET`, serve over HTTPS.
5. Consider httpOnly-cookie sessions instead of localStorage tokens, email verification, password reset (not included), and websockets instead of polling for chat.
6. Voice calls are shown as "coming soon".

# Family Travel Atlas

Track individual and family journeys on one shared atlas.

## Stack

- Next.js 16 (App Router)
- Better Auth (email/password)
- Drizzle ORM + Aiven MySQL
- Tailwind CSS 4

## Setup

```bash
cp .env.example .env.local
# fill MYSQL_* from Aiven + BETTER_AUTH_SECRET (openssl rand -base64 32)
# optional for password emails: RESEND_API_KEY + EMAIL_FROM
# (without RESEND_API_KEY, reset links print in the server console)

npm install
npm run db:push
npm run db:seed
npm run dev
```

Database: Aiven MySQL (see `.env.local`). Local SQLite is no longer used.

### Password reset / change

- Forgot password: `/forgot-password` → email (or console link in dev) → `/reset-password?token=…`
- Change password: Settings → Password
- Vercel env: `BETTER_AUTH_URL` (production URL), `RESEND_API_KEY`, `EMAIL_FROM`


Open [http://localhost:3000](http://localhost:3000).

### Demo account (after seed)

- Email: `demo@familytravel.app`
- Password: `demo1234`

### Countries catalog

- UI: [/countries](http://localhost:3000/countries)
- API: `GET /api/countries?continent=Europe&q=serb`

### Trips

- List: `/trips`
- New: `/trips/new`
- Country detail: `/countries/RS`

### Map

- Interactive 2D + 3D globe: `/map`
- Toggle **2D | 3D** (shared filters)
- Modes: Anyone · Individual · Couple · Whole family
- Demo trips light up RS / IT / JP

### Statistics

- `/stats` with scope filters (Anyone / Individual / Couple / Family)
- Coverage %, days, continents, months, seasons, top country/city

### Timeline

- `/timeline` tabs: Timeline · Year · Calendar
- Scope filters + travel-day calendar

```bash
npm run db:seed:countries
npm run db:seed:trips
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run db:push` | Sync schema to Aiven MySQL |
| `npm run db:seed` | Seed demo family + countries + trips |
| `npm run db:seed:countries` | Upsert country catalog only |
| `npm run db:seed:trips` | Seed sample trips for demo family |
| `npm run db:studio` | Open Drizzle Studio |

## Current scope

- Auth (register / login)
- Family account + members
- Countries catalog (~196)
- Trips CRUD
- Interactive 2D world map + 3D globe
- Statistics
- Timeline / year overview / calendar
- App shell + light / dark theme

Not yet: achievements, wishlist, media, export.

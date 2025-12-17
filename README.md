# GameStats Hub
Live football (soccer) scores, standings, team search, and favorites in one hub. Built for the INST377 final deliverable with an Express backend, Supabase persistence, and a modern, gradient-forward UI using Chart.js + dayjs on the front end.

## Target browsers
- Chrome 121+ (desktop & Android)
- Safari 17+ (iOS/iPadOS, macOS)
- Firefox 122+
- Edge 121+

## Quick links
- Live pages: `/` (Home), `/dashboard`, `/about`
- Developer manual: see below and `docs/developer-manual.md`
- Repo: https://github.com/mromalis11/Project-Final-Deliverable

---

## Developer manual
Audience: developers extending or deploying the project.

### 1) Setup
1. Install dependencies: `npm install`
2. Copy env vars: `cp .env.example .env`
3. Fill in:
   - `API_FOOTBALL_KEY` – API-FOOTBALL v3 key
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
   - optional `PORT` (default 3000)
4. Supabase table:
   ```sql
   create table if not exists public.favorites (
     id uuid primary key default uuid_generate_v4(),
     team_name text not null,
     league text not null,
     note text,
     created_at timestamptz default now()
   );
   ```
   If RLS is enabled, allow inserts/selects for the role tied to your key.

### 2) Run locally
```bash
npm start
# visit http://localhost:3000
```
Routes:
- Home: live fixtures + standings
- Dashboard: team search, upcoming fixtures, Chart.js goals trend, Supabase favorites
- About: project context

### 3) API (served from `/api`)
- `GET /api/live` – live fixtures (falls back to `data/sampleData.json` without a key)
- `GET /api/standings?league=39&season=2024` – league table
- `GET /api/teams/search?name=Arsenal` – search teams
- `GET /api/teams/:teamId/fixtures?next=5` – fixtures for a team
- `GET /api/favorites` – favorites from Supabase or in-memory fallback
- `POST /api/favorites` – save `{ team_name, league, note? }`

### 4) Front-end notes
- Uses Fetch API exclusively for data loads (live fixtures, standings, favorites, team search, fixtures).
- JavaScript libraries: Chart.js for trends, dayjs for date formatting.
- Three pages: Home, About, Dashboard (project functionality page).
- Responsive CSS with custom gradients and expressive typography (Space Grotesk + Manrope).

### 5) Testing
- Automated tests not included. Quick checks:
  - `curl http://localhost:3000/api/health` to confirm keys/Supabase detection.
  - Run a team search on the dashboard to validate API-FOOTBALL access.
  - Add a favorite and confirm it appears (and persists in Supabase when configured).

### 6) Known bugs & roadmap
- Without API keys the app serves demo data; add keys for full live behavior.
- Favorites rely on anon/service key; tighten RLS policies for production.
- Add automated tests (Jest + Supertest) and CI linting.
- Future: move UI to React/Vite for richer interactivity and deploy to Vercel.

### 7) Deployment (Vercel)
- Set `API_FOOTBALL_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in Vercel project env vars.
- Deploy as a Node/Express server; static assets come from `public/`.
- Verify `/api/health` after deployment, then point the public URL to Vercel output.

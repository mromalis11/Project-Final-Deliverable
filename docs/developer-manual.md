# Developer Manual – GameStats Hub

Audience: future developers extending the INST377 GameStats Hub project.

## Prerequisites
- Node.js 20.x (ships with native `fetch`)
- npm
- API-FOOTBALL v3 key (`API_FOOTBALL_KEY`)
- Supabase project with a `favorites` table

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and fill it in:
   ```bash
   cp .env.example .env
   ```
   - `API_FOOTBALL_KEY` – API-FOOTBALL v3 key
   - `SUPABASE_URL` – your Supabase project URL
   - `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
   - `PORT` – optional, defaults to 3000
3. Create the Supabase table:
   ```sql
   create table if not exists public.favorites (
     id uuid primary key default uuid_generate_v4(),
     team_name text not null,
     league text not null,
     note text,
     created_at timestamptz default now()
   );
   ```
   If you enable RLS, allow inserts/selects for your chosen roles.

## Running the app
```bash
npm start
# then visit http://localhost:3000
```
Pages:
- `/` – Home (live fixtures + standings)
- `/dashboard` – Team search, fixtures, Chart.js trendline, Supabase favorites
- `/about` – Project overview

## API overview (served from `/api`)
- `GET /api/live` – live fixtures (falls back to `data/sampleData.json` when no API key)
- `GET /api/standings?league=39&season=2024` – standings snapshot
- `GET /api/teams/search?name=Arsenal` – search teams
- `GET /api/teams/:teamId/fixtures?next=5` – upcoming fixtures for a team
- `GET /api/favorites` – favorites from Supabase or in-memory fallback
- `POST /api/favorites` – save a favorite `{ team_name, league, note? }`

## Tests
Automated tests are not included. Quick validation steps:
- `npm start` then hit `/api/health` to confirm API key and Supabase flags.
- Use the dashboard search to confirm API-FOOTBALL connectivity.
- Add a favorite and verify it persists in Supabase.

## Known issues / next steps
- Live data requires valid API keys; otherwise sample data is used.
- Favorites POST uses anon/service key; tighten RLS and swap to service key in production.
- Add automated tests (Jest + Supertest) and CI linting.
- Upgrade to a React/Vite front end for richer interactions (this prototype keeps zero-build tooling).

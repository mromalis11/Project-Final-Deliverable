# Developer Manual – GameStats Hub

## Prerequisites
- Node.js 20.x, npm
- API-FOOTBALL v3 key (`API_FOOTBALL_KEY`)
- Supabase project with `favorites` table

## Setup
1) Install deps: `npm install`
2) Copy envs: `cp .env.example .env`
3) Fill in:
   - `API_FOOTBALL_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (preferred with RLS) or `SUPABASE_ANON_KEY`
   - `PORT` (optional, default 3000)
4) Supabase table:
   ```sql
   create table if not exists public.favorites (
     id uuid primary key default uuid_generate_v4(),
     team_name text not null,
     league text not null,
     note text,
     created_at timestamptz default now()
   );
   alter table public.favorites enable row level security;
   create policy "service role full access" on public.favorites
     for all using (auth.role() = 'service_role') with check (true);
   ```

## Run
```bash
npm start
# open http://localhost:3000
```
Pages: `/` (home), `/dashboard`, `/about`.

## API (served from `/api`)
- `GET /live` – live fixtures (sample fallback when empty/error)
- `GET /standings?league=39&season=2023` – standings (falls back with reason if empty)
- `GET /teams/search?name=Arsenal` – team search
- `GET /teams/:teamId/fixtures?next=5` – tries recent/upcoming, then season fixtures (first 5), else sample with fallback note
- `GET /favorites` – Supabase favorites or in-memory fallback
- `POST /favorites` – `{ team_name, league, note? }`

## Tests (manual)
- `curl http://localhost:3000/api/health` → expect `supabase:true`, `apiKey:true`
- Visit `/` to confirm `source: api` on standings when key works
- Dashboard: search a team, click “View fixtures” and confirm `source: api` (or fallback reason) and chart updates if scores exist
- Add a favorite and confirm it appears in Supabase

## Known limitations / next steps
- Free API plans block `next`/`last`; fixtures route now falls back to season fixtures then sample.
- Favorites rely on Supabase service/anon key; tighten RLS for production.
- Add automated API tests and CI when ready.

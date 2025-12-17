require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const sampleData = require('./data/sampleData.json');

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.API_FOOTBALL_KEY;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
let localFavorites = [...(sampleData.favorites || [])];

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const buildApiUrl = (endpoint, params = {}) => {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

const fetchFromFootballApi = async (endpoint, params = {}) => {
  if (!API_KEY) {
    return { ok: false, reason: 'Missing API key' };
  }
  const url = buildApiUrl(endpoint, params);
  try {
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': API_KEY,
        accept: 'application/json'
      }
    });
    if (!response.ok) {
      return { ok: false, reason: `API responded with status ${response.status}` };
    }
    const payload = await response.json();
    return { ok: true, data: payload.response || [] };
  } catch (error) {
    console.error('Football API error', error);
    return { ok: false, reason: error.message };
  }
};

const seasonCandidates = (explicit) => {
  if (explicit) return [explicit];
  const currentYear = new Date().getFullYear();
  // Prefer 2023 first because free-tier data is reliable there, then current and recent years.
  const seeds = ['2023', String(currentYear), String(currentYear - 1), String(currentYear - 2), '2022'];
  return Array.from(new Set(seeds));
};

const getSupabaseClient = () => {
  if (!supabase) {
    return null;
  }
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return supabase;
};

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    supabase: Boolean(getSupabaseClient()),
    apiKey: Boolean(API_KEY)
  });
});

app.get('/api/live', async (req, res) => {
  const result = await fetchFromFootballApi('/fixtures', { live: 'all' });
  if (result.ok) {
    return res.json({ source: 'api', data: result.data });
  }
  return res.json({ source: 'sample', data: sampleData.liveFixtures, fallback: result.reason });
});

app.get('/api/standings', async (req, res) => {
  const { league = '39', season = '2024' } = req.query;
  const result = await fetchFromFootballApi('/standings', { league, season });
  if (result.ok) {
    const rows = result.data[0]?.league?.standings?.[0] || [];
    if (rows.length > 0) {
      return res.json({ source: 'api', data: rows });
    }
    // Empty but successful response; fall back for demo.
    return res.json({
      source: 'sample',
      data: sampleData.standings,
      fallback: 'No standings returned for this league/season'
    });
  }
  return res.json({ source: 'sample', data: sampleData.standings, fallback: result.reason });
});

app.get('/api/teams/search', async (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: 'Missing name query parameter' });
  }
  const result = await fetchFromFootballApi('/teams', { search: name });
  if (result.ok) {
    return res.json({ source: 'api', data: result.data });
  }
  // simple filter on the sample data
  const filtered = sampleData.teamSearch.filter(entry =>
    entry.team.name.toLowerCase().includes(name.toLowerCase())
  );
  return res.json({ source: 'sample', data: filtered, fallback: result.reason });
});

app.get('/api/teams/:teamId/fixtures', async (req, res) => {
  const { teamId } = req.params;
  const { next = 5, season } = req.query;
  const seasonsToTry = seasonCandidates(season);

  // helper to loop seasons with given params
  const tryFixtures = async (params) => {
    for (const s of seasonsToTry) {
      const result = await fetchFromFootballApi('/fixtures', { ...params, season: s });
      if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
        return { ...result, seasonUsed: s };
      }
      if (!result.ok) {
        return { error: result.reason };
      }
    }
    return null;
  };

  const trySeasonCatchAll = async () => {
    for (const s of seasonsToTry) {
      const result = await fetchFromFootballApi('/fixtures', { team: teamId, season: s });
      if (result.ok && Array.isArray(result.data) && result.data.length > 0) {
        const sorted = [...result.data].sort(
          (a, b) => new Date(a.fixture?.date || 0) - new Date(b.fixture?.date || 0)
        );
        return { data: sorted.slice(0, 5), seasonUsed: s };
      }
      if (!result.ok) {
        return { error: result.reason };
      }
    }
    return null;
  };

  // Free plans block ?next; try recent fixtures first (last) so free tier still works.
  const recent = await tryFixtures({ team: teamId, last: 5 });
  if (recent?.data?.length) {
    return res.json({
      source: 'api',
      data: recent.data,
      note: `Recent fixtures (season ${recent.seasonUsed})`
    });
  }

  // Then attempt upcoming fixtures; if plan blocks ?next we’ll surface the reason.
  const upcoming = await tryFixtures({ team: teamId, next });
  if (upcoming?.data?.length) {
    return res.json({
      source: 'api',
      data: upcoming.data,
      note: `Upcoming fixtures (season ${upcoming.seasonUsed})`
    });
  }

  // As a final attempt (free plans often allow this), fetch season fixtures without next/last and trim.
  const catchAll = await trySeasonCatchAll();
  if (catchAll?.data?.length) {
    return res.json({
      source: 'api',
      data: catchAll.data,
      note: `Season ${catchAll.seasonUsed} fixtures (first 5)`
    });
  }

  return res.json({
    source: 'sample',
    data: sampleData.teamFixtures,
    fallback: upcoming?.error || recent?.error || catchAll?.error || 'No fixtures returned for this team'
  });
});

app.get('/api/favorites', async (req, res) => {
  const client = getSupabaseClient();
  if (!client) {
    return res.json({ source: 'local', data: localFavorites });
  }
  const { data, error } = await client.from('favorites').select().order('created_at', { ascending: false });
  if (error) {
    console.error('Supabase read error', error);
    return res.status(500).json({ error: 'Unable to load favorites from Supabase' });
  }
  return res.json({ source: 'supabase', data });
});

app.post('/api/favorites', async (req, res) => {
  const { team_name, league, note } = req.body;
  if (!team_name || !league) {
    return res.status(400).json({ error: 'team_name and league are required' });
  }
  const payload = {
    team_name,
    league,
    note: note || ''
  };
  const client = getSupabaseClient();
  if (!client) {
    const record = { ...payload, id: `local-${Date.now()}` };
    localFavorites = [record, ...localFavorites];
    return res.status(201).json({ source: 'local', data: record });
  }
  const { data, error } = await client.from('favorites').insert(payload).select().single();
  if (error) {
    console.error('Supabase write error', error);
    return res.status(500).json({ error: 'Unable to save favorite to Supabase' });
  }
  return res.status(201).json({ source: 'supabase', data });
});

// Send 404 for missing API routes to avoid interfering with static pages.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Pretty routes for static pages.
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Serve static pages for deep links.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.VERCEL) {
  // Export the app for Vercel serverless.
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`GameStats Hub server listening on http://localhost:${PORT}`);
  });
}

import { fetchJSON, formatKickoff, formatStatus, renderMessage } from './common.js';

const form = document.getElementById('search-form');
const searchResults = document.getElementById('search-results');
const favoritesList = document.getElementById('favorites-list');
const favoritesMeta = document.getElementById('favorites-meta');
const fixtureList = document.getElementById('fixture-list');
const fixturesMeta = document.getElementById('fixtures-meta');
const chartCanvas = document.getElementById('fixture-chart');

let fixtureChart;

const clearChart = () => {
  if (fixtureChart) {
    fixtureChart.destroy();
    fixtureChart = null;
  }
};

const renderTeamCard = (entry) => {
  const team = entry.team;
  const venue = entry.venue;
  const wrapper = document.createElement('div');
  wrapper.className = 'favorite';
  wrapper.innerHTML = `
    <div>
      <div class="team-line" style="font-size: 16px;">
        <img src="${team.logo || 'https://dummyimage.com/32x32/1f2937/ffffff&text=T'}" alt="${team.name}" />
        <strong>${team.name}</strong>
      </div>
      <div class="muted">${team.country} · Founded ${team.founded || '—'}</div>
      <div class="chip">${venue?.name || 'Stadium TBD'} · ${venue?.city || ''}</div>
    </div>
    <div class="stack" style="align-items: flex-end;">
      <button class="button" data-team="${team.name}" data-league="${team.country}" data-action="favorite">Save favorite</button>
      <button class="button primary" data-team-id="${team.id}" data-team-name="${team.name}" data-action="fixtures">View fixtures</button>
    </div>
  `;
  return wrapper;
};

const renderFixtures = (fixtures) => {
  fixtureList.innerHTML = '';
  if (!fixtures || fixtures.length === 0) {
    renderMessage(fixtureList, 'No fixtures returned for this team yet.', 'alert');
    return;
  }
  fixtures.forEach((fx) => {
    const row = document.createElement('div');
    row.className = 'fixture';
    row.innerHTML = `
      <div class="teams">
        <div class="team-line"><span>${fx.teams?.home?.name || 'Home'}</span></div>
        <div class="team-line"><span>${fx.teams?.away?.name || 'Away'}</span></div>
        <span class="muted">${fx.league?.name || 'League'}</span>
      </div>
      <div class="score">${fx.goals?.home ?? '-'} : ${fx.goals?.away ?? '-'}</div>
      <div class="status">
        <div>${formatStatus(fx.fixture?.status)}</div>
        <div class="muted">${formatKickoff(fx.fixture?.date)}</div>
      </div>
    `;
    fixtureList.appendChild(row);
  });
};

const updateChart = (fixtures, teamName) => {
  clearChart();
  if (!fixtures || fixtures.length === 0) return;
  const labels = fixtures.map((fx) => (fx.fixture?.date ? dayjs(fx.fixture.date).format('MMM D') : 'TBD'));
  const normalizedName = (teamName || '').toLowerCase();
  const teamGoals = fixtures.map((fx) => {
    const homeName = fx.teams?.home?.name?.toLowerCase();
    const awayName = fx.teams?.away?.name?.toLowerCase();
    const isHome = homeName === normalizedName;
    const isAway = awayName === normalizedName;
    if (isHome) return fx.goals?.home ?? 0;
    if (isAway) return fx.goals?.away ?? 0;
    return fx.goals?.home ?? 0;
  });
  const opponentGoals = fixtures.map((fx) => {
    const homeName = fx.teams?.home?.name?.toLowerCase();
    const isHome = homeName === normalizedName;
    return isHome ? fx.goals?.away ?? 0 : fx.goals?.home ?? 0;
  });
  fixtureChart = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `${teamName} goals`,
          data: teamGoals,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.25)',
          tension: 0.35,
          fill: true
        },
        {
          label: 'Opponent goals',
          data: opponentGoals,
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.2)',
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#e2e8f0' } }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.15)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.15)' }, beginAtZero: true }
      }
    }
  });
};

const loadFavorites = async () => {
  favoritesMeta.textContent = 'Loading...';
  favoritesList.innerHTML = '';
  const { data, source, error } = await fetchJSON('/api/favorites');
  if (error) {
    favoritesMeta.textContent = 'Error loading favorites';
    renderMessage(favoritesList, 'Unable to load favorites right now.');
    return;
  }
  favoritesMeta.textContent = `source: ${source}`;
  (data || []).forEach((fav) => {
    const card = document.createElement('div');
    card.className = 'favorite';
    card.innerHTML = `
      <div>
        <div class="team-line"><strong>${fav.team_name}</strong></div>
        <div class="muted">${fav.league}</div>
        ${fav.note ? `<div class="chip">${fav.note}</div>` : ''}
      </div>
      <span class="tag">Saved</span>
    `;
    favoritesList.appendChild(card);
  });
  if (!data || data.length === 0) {
    renderMessage(favoritesList, 'No favorites yet. Search a team and save it!', 'success');
  }
};

const saveFavorite = async (teamName, league) => {
  const body = JSON.stringify({ team_name: teamName, league });
  const { error } = await fetchJSON('/api/favorites', { method: 'POST', body });
  if (error) {
    alert('Could not save favorite: ' + error);
    return;
  }
  loadFavorites();
};

const loadFixtures = async (teamId, teamName) => {
  fixturesMeta.textContent = 'Loading fixtures...';
  const { data, source, error, raw } = await fetchJSON(`/api/teams/${teamId}/fixtures?next=5`);
  if (error) {
    fixturesMeta.textContent = 'Error fetching fixtures';
    renderMessage(fixtureList, 'Unable to load fixtures for this team.');
    return;
  }
  fixturesMeta.textContent = `source: ${source || 'api'} · ${data?.length || 0} results`;
  if (raw?.fallback) {
    fixturesMeta.textContent += ` (${raw.fallback})`;
  }
  if (raw?.note) {
    fixturesMeta.textContent += ` (${raw.note})`;
  }
  renderFixtures(data);
  updateChart(data, teamName);
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const teamName = document.getElementById('team-input').value.trim();
  if (!teamName) return;
  searchResults.innerHTML = '';
  renderMessage(searchResults, 'Searching...');
  const { data, source, error } = await fetchJSON(`/api/teams/search?name=${encodeURIComponent(teamName)}`);
  if (error) {
    renderMessage(searchResults, 'Could not search teams right now.');
    return;
  }
  searchResults.innerHTML = '';
  if (!data || data.length === 0) {
    renderMessage(searchResults, 'No teams found. Try another query.', 'alert');
    return;
  }
  const header = document.createElement('div');
  header.className = 'muted';
  header.textContent = `Source: ${source}`;
  searchResults.appendChild(header);
  data.slice(0, 5).forEach((entry) => searchResults.appendChild(renderTeamCard(entry)));
});

searchResults.addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  if (!action) return;
  if (action === 'fixtures') {
    const teamId = e.target.dataset.teamId;
    const teamName = e.target.dataset.teamName;
    loadFixtures(teamId, teamName);
  }
  if (action === 'favorite') {
    const teamName = e.target.dataset.team;
    const league = e.target.dataset.league || 'League';
    saveFavorite(teamName, league);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loadFavorites();
});

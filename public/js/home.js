import { fetchJSON, formatKickoff, formatStatus, renderMessage } from './common.js';

const liveList = document.getElementById('live-list');
const liveMeta = document.getElementById('live-meta');
const standingsBody = document.querySelector('#standings-table tbody');

const buildFixtureCard = (fixture) => {
  const leagueName = fixture.league?.name || 'League';
  const home = fixture.teams?.home;
  const away = fixture.teams?.away;
  const scoreHome = fixture.goals?.home ?? '-';
  const scoreAway = fixture.goals?.away ?? '-';
  const status = formatStatus(fixture.fixture?.status);
  const kickoff = formatKickoff(fixture.fixture?.date);

  const wrapper = document.createElement('div');
  wrapper.className = 'fixture';
  wrapper.innerHTML = `
    <div class="teams">
      <div class="team-line">
        <img alt="${home?.name || 'Home'}" src="${home?.logo || 'https://dummyimage.com/40x40/1f2937/ffffff&text=H'}" />
        <span>${home?.name || 'Home Team'}</span>
      </div>
      <div class="team-line">
        <img alt="${away?.name || 'Away'}" src="${away?.logo || 'https://dummyimage.com/40x40/1f2937/ffffff&text=A'}" />
        <span>${away?.name || 'Away Team'}</span>
      </div>
      <span class="muted">${leagueName}</span>
    </div>
    <div class="score">${scoreHome} : ${scoreAway}</div>
    <div class="status">
      <div>${status}</div>
      <div class="muted">${kickoff}</div>
    </div>
  `;
  return wrapper;
};

async function loadLiveFixtures() {
  liveMeta.textContent = 'loading...';
  liveList.innerHTML = '';
  const { data, source, error } = await fetchJSON('/api/live');
  if (error) {
    renderMessage(liveList, 'Could not load live fixtures.');
    liveMeta.textContent = 'error';
    return;
  }
  if (!data || data.length === 0) {
    renderMessage(liveList, 'No live fixtures right now. Check back soon!', 'success');
    liveMeta.textContent = source || 'api';
    return;
  }
  data.forEach((fixture) => liveList.appendChild(buildFixtureCard(fixture)));
  liveMeta.textContent = `source: ${source || 'api'}`;
}

async function loadStandings() {
  standingsBody.innerHTML = '';
  // Premier League season 2023 has stable data across plans.
  const { data, source, error, raw } = await fetchJSON('/api/standings?league=39&season=2023');
  if (error) {
    standingsBody.innerHTML = `<tr><td colspan="8">Could not load standings.</td></tr>`;
    return;
  }
  const rows = data || [];
  if (rows.length === 0) {
    standingsBody.innerHTML = `<tr><td colspan="8">No standings data available.</td></tr>`;
  }
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.rank ?? '-'}</td>
      <td><div class="team-line"><img src="${row.team?.logo ||
        'https://dummyimage.com/32x32/1f2937/ffffff&text=T'}" alt="${row.team?.name}" />${row.team?.name ||
      'Team'}</div></td>
      <td>${row.points ?? '-'}</td>
      <td>${row.all?.win ?? '-'}</td>
      <td>${row.all?.draw ?? '-'}</td>
      <td>${row.all?.lose ?? '-'}</td>
      <td>${row.all?.goals?.for ?? '-'}</td>
      <td>${row.all?.goals?.against ?? '-'}</td>
    `;
    standingsBody.appendChild(tr);
  });
  const badge = document.createElement('span');
  badge.className = 'tag';
  badge.classList.add('source-badge');
  badge.textContent = `source: ${source || 'api'}`;
  if (raw?.fallback) {
    badge.title = raw.fallback;
  }
  const header = document.getElementById('standings-header');
  if (header) {
    header.querySelectorAll('.source-badge').forEach((b) => b.remove());
    header.appendChild(badge);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadLiveFixtures();
  loadStandings();
});

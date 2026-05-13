'use strict';
// json-home.js — search filter + recent tools + category tabs

function filterTools(query) {
  if (typeof gaTrackSiteSearch === 'function') gaTrackSiteSearch('json', query, 0);
  const q = (query || '').trim().toLowerCase();
  document.querySelectorAll('.jt-tool-card').forEach(card => {
    card.style.display = (!q || card.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
}

function filterGroup(group) {
  document.querySelectorAll('.jt-category-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.group === group);
  });
  document.querySelectorAll('.jt-tool-card').forEach(card => {
    const cardGroup = card.dataset.group;
    card.style.display = (group === 'all' || cardGroup === group) ? '' : 'none';
  });
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-filter-' + group);
}

function loadRecentTools() {
  try {
    const recent = JSON.parse(localStorage.getItem('jt_recent_tools') || '[]');
    if (recent.length === 0) return;
    const container = document.getElementById('recentList');
    const section   = document.getElementById('recentTools');
    if (!container || !section) return;
    container.innerHTML = recent.map(t =>
      `<a class="jt-recent-chip" href="/json/${t.key}"><span>${t.icon}</span>${t.name}</a>`
    ).join('');
    section.style.display = 'block';
  } catch(e) {}
}

document.addEventListener('DOMContentLoaded', loadRecentTools);


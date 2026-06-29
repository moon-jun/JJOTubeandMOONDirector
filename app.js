/* ═══════════════════════════════════════════════
   JJO & MOON Director — app.js
   ═══════════════════════════════════════════════ */

'use strict';

// ── Config ──────────────────────────────────────
const CONFIG = {
  VIDEOS_FILE:       'videos.txt',
  NOEMBED_BASE:      'https://noembed.com/embed',
  THUMB_QUALITIES:   ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault'],
  STAGGER_DELAY:     80,   // ms between card animations
  TOAST_DURATION:    2800, // ms
};

// ── State ────────────────────────────────────────
const state = {
  videos:      [],   // { url, id, title, channel, thumb, error }
  filtered:    [],
  query:       '',
  filter:      'all',
  layout:      'grid',  // 'grid' | 'list'
  sortMode:    0,       // 0=default, 1=title-asc, 2=title-desc
  channels:    new Set(),
};

// ── DOM refs ─────────────────────────────────────
const $ = id => document.getElementById(id);
const grid        = $('videoGrid');
const searchInput = $('searchInput');
const searchClear = $('searchClear');
const emptyState  = $('emptyState');
const statTotal   = $('statTotal');
const videoCount  = $('videoCount');
const filterBar   = $('filterBar');
const header      = $('header');
const modalBD     = $('modalBackdrop');
const modalClose  = $('modalClose');
const modalIframe = $('modalIframe');
const modalTitle  = $('modalTitle');
const modalChannel= $('modalChannel');
const modalYtLink = $('modalYtLink');
const btnLayout   = $('btnLayout');
const btnSort     = $('btnSort');
const toast       = $('toast');

// ── Utilities ────────────────────────────────────
function extractVideoId(url) {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0];
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.includes('/shorts/')) return u.pathname.split('/shorts/')[1].split('/')[0];
      if (u.pathname.includes('/embed/'))  return u.pathname.split('/embed/')[1].split('/')[0];
      return u.searchParams.get('v');
    }
  } catch (_) {}
  // fallback regex
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function thumbUrl(id, quality) {
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`;
}

function ytWatchUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

function ytEmbedUrl(id) {
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), CONFIG.TOAST_DURATION);
}

// ── Fetch metadata via noembed ───────────────────
async function fetchMeta(url) {
  const apiUrl = `${CONFIG.NOEMBED_BASE}?url=${encodeURIComponent(url)}&maxwidth=560`;
  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return {
      title:        data.title   || '제목 없음',
      channel:      data.author_name || '알 수 없는 채널',
      thumbFromAPI: data.thumbnail_url || null,
    };
  } catch (e) {
    return { title: null, channel: null, thumbFromAPI: null };
  }
}

// ── Parse videos.txt ────────────────────────────
async function loadVideosTxt() {
  const res = await fetch(CONFIG.VIDEOS_FILE + '?_=' + Date.now());
  if (!res.ok) throw new Error('videos.txt를 불러올 수 없어요 (' + res.status + ')');
  const text = await res.text();
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}

// ── Build card HTML ──────────────────────────────
function buildCard(v, index) {
  const card = document.createElement('div');
  card.className = 'video-card' + (v.error ? ' card-error' : '');
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', v.title || v.url);
  card.style.animationDelay = `${index * CONFIG.STAGGER_DELAY}ms`;
  card.dataset.id = v.id || '';
  card.dataset.title = (v.title || '').toLowerCase();
  card.dataset.channel = (v.channel || '').toLowerCase();

  if (v.error || !v.id) {
    card.innerHTML = `
      <div class="thumbnail-wrap">
        <div class="error-thumb-inner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          </svg>
          <span>불러오기 실패</span>
        </div>
      </div>
      <div class="card-body">
        <div class="channel-avatar">⚠️</div>
        <div class="card-text">
          <div class="card-title">${v.url}</div>
          <div class="card-channel">URL을 확인해주세요</div>
        </div>
      </div>`;
    return card;
  }

  const avatarBg = stringToColor(v.channel || '');
  card.innerHTML = `
    <div class="thumbnail-wrap">
      <img
        src="${thumbUrl(v.id, 'hqdefault')}"
        alt="${escHtml(v.title)}"
        loading="lazy"
        onerror="this.src='${thumbUrl(v.id, 'mqdefault')}'"
      />
      <div class="play-overlay">
        <div class="play-btn">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>
    </div>
    <div class="card-body">
      <div class="channel-avatar generated" style="background:${avatarBg}">${initials(v.channel)}</div>
      <div class="card-text">
        <div class="card-title">${escHtml(v.title)}</div>
        <div class="card-channel">${escHtml(v.channel)}</div>
      </div>
    </div>`;

  card.addEventListener('click', () => openModal(v));
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(v); } });

  return card;
}

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
}

// ── Render filtered list ─────────────────────────
function renderVideos() {
  let list = [...state.videos];

  // channel filter
  if (state.filter !== 'all') {
    list = list.filter(v => (v.channel || '') === state.filter);
  }

  // search filter
  if (state.query) {
    const q = state.query.toLowerCase();
    list = list.filter(v =>
      (v.title   || '').toLowerCase().includes(q) ||
      (v.channel || '').toLowerCase().includes(q)
    );
  }

  // sort
  if (state.sortMode === 1) list.sort((a,b) => (a.title||'').localeCompare(b.title||''));
  if (state.sortMode === 2) list.sort((a,b) => (b.title||'').localeCompare(a.title||''));

  state.filtered = list;

  // clear grid (except skeletons will already be gone)
  grid.innerHTML = '';

  if (list.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  list.forEach((v, i) => grid.appendChild(buildCard(v, i)));
}

// ── Update filter tab channels ───────────────────
function updateFilterTabs() {
  const channels = [...state.channels].sort();
  filterBar.innerHTML = `<button class="filter-btn ${state.filter==='all'?'active':''}" data-filter="all">전체</button>`;
  channels.forEach(ch => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (state.filter === ch ? ' active' : '');
    btn.dataset.filter = ch;
    btn.textContent = ch;
    filterBar.appendChild(btn);
  });
}

function updateStats() {
  const total = state.videos.filter(v => !v.error).length;
  statTotal.textContent    = total;
  videoCount.textContent   = `${total} videos`;
}

// ── Modal ────────────────────────────────────────
function openModal(v) {
  modalIframe.src   = ytEmbedUrl(v.id);
  modalTitle.textContent   = v.title || '제목 없음';
  modalChannel.textContent = v.channel || '';
  modalYtLink.href  = ytWatchUrl(v.id);
  modalBD.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalBD.classList.remove('open');
  setTimeout(() => { modalIframe.src = ''; }, 300);
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalBD.addEventListener('click', e => { if (e.target === modalBD) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Search ───────────────────────────────────────
searchInput.addEventListener('input', () => {
  state.query = searchInput.value.trim();
  searchClear.classList.toggle('visible', state.query.length > 0);
  renderVideos();
});
searchClear.addEventListener('click', () => {
  searchInput.value = '';
  state.query = '';
  searchClear.classList.remove('visible');
  searchInput.focus();
  renderVideos();
});

// ── Filter tabs ──────────────────────────────────
filterBar.addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  state.filter = btn.dataset.filter;
  filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
  renderVideos();
});

// ── Layout toggle ────────────────────────────────
btnLayout.addEventListener('click', () => {
  state.layout = state.layout === 'grid' ? 'list' : 'grid';
  grid.classList.toggle('list-view', state.layout === 'list');
  btnLayout.querySelector('.icon-grid').style.display = state.layout === 'grid' ? '' : 'none';
  btnLayout.querySelector('.icon-list').style.display = state.layout === 'list' ? '' : 'none';
  showToast(state.layout === 'list' ? '📋 리스트 뷰' : '⊞ 그리드 뷰');
});

// ── Sort toggle ──────────────────────────────────
const sortLabels = ['🔀 기본 순서', '🔤 제목 오름차순', '🔤 제목 내림차순'];
btnSort.addEventListener('click', () => {
  state.sortMode = (state.sortMode + 1) % 3;
  showToast(sortLabels[state.sortMode]);
  renderVideos();
});

// ── Header scroll effect ─────────────────────────
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ── Main loader ──────────────────────────────────
async function init() {
  let urls;
  try {
    urls = await loadVideosTxt();
  } catch (e) {
    grid.innerHTML = '';
    showToast('⚠️ ' + e.message);
    console.error(e);
    return;
  }

  if (urls.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  // Show skeletons (already in HTML, adjust count)
  const skeletons = grid.querySelectorAll('.skeleton-card');
  const extra = urls.length - skeletons.length;
  for (let i = 0; i < extra; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton-card';
    grid.appendChild(sk);
  }

  // Fetch metadata in parallel (batched to avoid rate-limiting)
  const BATCH = 6;
  const results = new Array(urls.length).fill(null);

  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      batch.map(async (url, bi) => {
        const idx = i + bi;
        const id = extractVideoId(url);
        if (!id) {
          results[idx] = { url, id: null, error: true };
          return;
        }
        const { title, channel } = await fetchMeta(url);
        results[idx] = {
          url,
          id,
          title:   title   || `YouTube (${id})`,
          channel: channel || '알 수 없는 채널',
          error:   false,
        };
        if (channel) state.channels.add(channel);
      })
    );
    // Render progressively as batches complete
    state.videos = results.filter(Boolean);
    updateStats();
    updateFilterTabs();
    renderVideos();
  }

  // Final render
  state.videos = results.filter(Boolean);
  updateStats();
  updateFilterTabs();
  renderVideos();
}

init();

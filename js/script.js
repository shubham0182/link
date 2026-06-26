/*
 * Shortly - Professional URL Shortener
 * Main Application Script
 * - URL Validation
 * - Random ID Generation
 * - API-backed persistence (SQLite via Express)
 * - Clipboard Copy
 * - QR Code Generation
 * - Dark Mode Toggle
 * - History Management
 * - Search, Export, Import
 */

(function() {
  'use strict';

  const API_BASE = window.location.origin;
  const DISPLAY_DOMAIN = 'https://shortly';
  const THEME_KEY = 'shortly_theme';
  const FAV_KEY = 'shortly_favorites';

  // ---- DOM References ----
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const urlInput = $('#urlInput');
  const shortenBtn = $('#shortenBtn');
  const domainSelect = $('#domainSelect');
  const aliasInput = $('#aliasInput');
  const resultSection = $('#resultSection');
  const closeResult = $('#closeResult');
  const resultShortLink = $('#resultShortLink');
  const resultOriginalUrl = $('#resultOriginalUrl');
  const resultTime = $('#resultTime');
  const resultDomain = $('#resultDomain');
  const qrContainer = $('#qrCode');
  const copyBtn = $('#copyBtn');
  const openBtn = $('#openBtn');
  const deleteResultBtn = $('#deleteResultBtn');
  const historyList = $('#historyList');
  const searchInput = $('#searchInput');
  const exportBtn = $('#exportBtn');
  const importBtn = $('#importBtn');
  const importFileInput = $('#importFileInput');
  const clearAllBtn = $('#clearAllBtn');
  const themeToggle = $('#themeToggle');
  const navToggle = $('#navToggle');
  const navLinks = $('#navLinks');
  const scrollTopBtn = $('#scrollTopBtn');
  const toastContainer = $('#toastContainer');
  const dropZone = $('#dropZone');
  const shortDomain = $('#shortDomain');
  const shortAlias = $('#shortAlias');
  const heroShort = $('#heroShort');

  // Stats elements
  const statTotal = $('#statTotal');
  const statToday = $('#statToday');
  const statCopied = $('#statCopied');
  const statOpened = $('#statOpened');

  // ---- State ----
  let links = [];
  let currentLink = null;

  // ---- API Helpers ----
  async function api(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ---- Init ----
  async function init() {
    loadTheme();
    await loadLinks();
    await updateStats();
    bindEvents();
    generateParticles();
    updateHeroPreview();
    checkScroll();
  }

  // ========================================
  //  PARTICLES
  // ========================================
  function generateParticles() {
    const container = $('#particles');
    for (let i = 0; i < 50; i++) {
      const dot = document.createElement('div');
      const size = Math.random() * 3 + 1;
      dot.style.cssText = `
        position:absolute; left:${Math.random() * 100}%; top:${Math.random() * 100}%;
        width:${size}px; height:${size}px;
        background:rgba(124,58,237,0.15); border-radius:50%;
        animation:floatParticle ${Math.random() * 20 + 10}s ${Math.random() * 10}s infinite ease-in-out;
      `;
      container.appendChild(dot);
    }
  }

  // ========================================
  //  TOAST NOTIFICATIONS
  // ========================================
  function showToast(message, type = 'success') {
    const icons = {
      success: '<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `${icons[type]||icons.success}<span class="toast-msg">${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ========================================
  //  THEME
  // ========================================
  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
  }

  function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  }

  // ========================================
  //  URL VALIDATION
  // ========================================
  function isValidURL(str) {
    const pattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w\-./?%&=+#]*)?$/i;
    if (!pattern.test(str)) return false;
    try {
      const url = str.startsWith('http') ? new URL(str) : new URL('https://' + str);
      return url.hostname.includes('.');
    } catch {
      return false;
    }
  }

  function normalizeURL(str) {
    if (!str.startsWith('http://') && !str.startsWith('https://')) {
      return 'https://' + str;
    }
    return str;
  }

  // ========================================
  //  SHORT ID GENERATOR
  // ========================================
  function generateShortId(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function generateUniqueId() {
    const length = Math.random() < 0.5 ? 6 : 7;
    let id;
    let attempts = 0;
    do {
      id = generateShortId(length);
      attempts++;
    } while (links.some(l => l.short === id) && attempts < 1000);
    return id;
  }

  // ========================================
  //  DATA LOADING (API)
  // ========================================
  async function loadLinks() {
    try {
      links = await api('GET', '/api/links');
    } catch {
      links = [];
      showToast('Could not connect to server. Make sure the backend is running.', 'error');
    }
  }

  async function updateStats() {
    try {
      const stats = await api('GET', '/api/stats');
      statTotal.textContent = stats.total;
      statToday.textContent = stats.today;
      statCopied.textContent = stats.copied;
      statOpened.textContent = stats.opened;
    } catch {
      // silent
    }
  }

  async function incrementCopied(linkId) {
    try {
      await api('PATCH', `/api/links/${linkId}/copied`);
      await updateStats();
    } catch {}
  }

  async function incrementOpened(linkId) {
    try {
      await api('PATCH', `/api/links/${linkId}/opened`);
      await updateStats();
    } catch {}
  }

  // ========================================
  //  SHORTEN LINK
  // ========================================
  async function shortenURL() {
    let url = urlInput.value.trim();
    if (!url) {
      showToast('Please enter a URL', 'error');
      urlInput.focus();
      shortenBtn.classList.remove('loading');
      return;
    }

    if (!isValidURL(url)) {
      showToast('Please enter a valid URL (e.g. https://example.com)', 'error');
      urlInput.focus();
      shortenBtn.classList.remove('loading');
      return;
    }

    url = normalizeURL(url);
    const domain = domainSelect.value;
    let alias = aliasInput.value.trim();

    if (alias) {
      if (alias.length < 2) {
        showToast('Alias must be at least 2 characters', 'error');
        shortenBtn.classList.remove('loading');
        return;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
        showToast('Alias can only contain letters, numbers, hyphens, and underscores', 'error');
        shortenBtn.classList.remove('loading');
        return;
      }
      if (links.some(l => l.short === alias && l.domain === domain)) {
        showToast('This alias is already taken for this domain', 'error');
        shortenBtn.classList.remove('loading');
        return;
      }
    }

    const short = alias || generateUniqueId();
    const fullShort = `${DISPLAY_DOMAIN}${domain}/${short}`;

    const link = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      original: url,
      short: short,
      domain: domain,
      fullShort: fullShort,
      createdAt: new Date().toISOString(),
      copied: 0,
      opened: 0
    };

    try {
      await api('POST', '/api/shorten', link);
      links.unshift(link);
      await updateStats();
      renderHistory();
      showResult(link);
      showToast('Link shortened successfully!');
    } catch (err) {
      showToast('Failed to shorten: ' + err.message, 'error');
    }

    shortenBtn.classList.remove('loading');
    urlInput.value = '';
    aliasInput.value = '';
    updateHeroPreview();
  }

  // ========================================
  //  SHOW RESULT
  // ========================================
  function showResult(link) {
    currentLink = link;
    const serverUrl = `${API_BASE}/${link.short}`;
    resultShortLink.textContent = link.fullShort;
    resultShortLink.href = serverUrl;
    resultOriginalUrl.textContent = link.original;
    resultTime.textContent = new Date(link.createdAt).toLocaleString();
    resultDomain.textContent = `shortly${link.domain}`;
    generateQRCode(link.fullShort);
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ========================================
  //  QR CODE
  // ========================================
  function generateQRCode(text) {
    qrContainer.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrContainer, {
        text: text,
        width: 140,
        height: 140,
        colorDark: '#f0f0f5',
        colorLight: 'transparent',
        correctLevel: QRCode.CorrectLevel.H
      });
    } else {
      qrContainer.innerHTML = '<canvas id="qrCanvas" width="140" height="140"></canvas>';
      drawQRSimple(text);
    }
  }

  function drawQRSimple(text) {
    const canvas = document.getElementById('qrCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 140;
    const moduleCount = 21;
    const moduleSize = size / moduleCount;

    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, size, size);

    function drawFinder(x, y) {
      ctx.fillStyle = '#f0f0f5';
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 ||
              (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            ctx.fillRect((x + r) * moduleSize, (y + c) * moduleSize, moduleSize, moduleSize);
          }
        }
      }
    }

    ctx.fillStyle = '#f0f0f5';
    for (let i = 0; i < 100; i++) {
      const rx = Math.floor(Math.random() * moduleCount);
      const ry = Math.floor(Math.random() * moduleCount);
      if ((rx < 8 && ry < 8) || (rx < 8 && ry > moduleCount - 9) || (rx > moduleCount - 9 && ry < 8)) continue;
      ctx.fillRect(rx * moduleSize, ry * moduleSize, moduleSize, moduleSize);
    }

    drawFinder(0, 0);
    drawFinder(moduleCount - 7, 0);
    drawFinder(0, moduleCount - 7);
  }

  // ========================================
  //  CLIPBOARD
  // ========================================
  function copyToClipboard(text, linkId) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied Successfully');
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
    if (linkId) {
      incrementCopied(linkId);
      if (currentLink && currentLink.id === linkId) {
        currentLink.copied++;
      }
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Copied Successfully');
    } catch {
      showToast('Failed to copy', 'error');
    }
    document.body.removeChild(ta);
  }

  // ========================================
  //  DELETE
  // ========================================
  async function deleteLink(id) {
    try {
      await api('DELETE', `/api/links/${id}`);
      links = links.filter(l => l.id !== id);
      await updateStats();
      renderHistory();
      if (currentLink && currentLink.id === id) {
        resultSection.style.display = 'none';
        currentLink = null;
      }
      showToast('Link deleted');
    } catch (err) {
      showToast('Failed to delete: ' + err.message, 'error');
    }
  }

  async function clearAllHistory() {
    if (links.length === 0) return;
    try {
      await api('DELETE', '/api/links');
      links = [];
      await updateStats();
      renderHistory();
      resultSection.style.display = 'none';
      currentLink = null;
      showToast('All history cleared');
    } catch (err) {
      showToast('Failed to clear: ' + err.message, 'error');
    }
  }

  // ========================================
  //  RENDER HISTORY
  // ========================================
  function renderHistory(filter = '') {
    const query = filter.toLowerCase().trim();
    let filtered = links;
    if (query) {
      filtered = links.filter(l =>
        l.original.toLowerCase().includes(query) ||
        l.short.toLowerCase().includes(query) ||
        l.fullShort.toLowerCase().includes(query)
      );
    }

    if (filtered.length === 0) {
      const msg = query ? 'No links match your search' : 'No links yet. Shorten your first URL above!';
      historyList.innerHTML = `
        <div class="history-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <p>${msg}</p>
        </div>
      `;
      return;
    }

    const favs = getFavorites();
    const today = new Date().toDateString();
    const recentIds = links.slice(0, 5).map(l => l.id);

    historyList.innerHTML = filtered.map(l => {
      const isFav = favs.includes(l.id);
      const isRecent = recentIds.includes(l.id);
      const created = new Date(l.createdAt);
      const isToday = created.toDateString() === today;
      const dateStr = isToday
        ? `Today at ${created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : created.toLocaleDateString();
      const badge = isRecent && !isFav ? '<span class="history-item-badge">Recent</span>' : '';

      return `
        <div class="history-item" data-id="${l.id}">
          <div class="history-item-info">
            <div class="history-item-short">
              <a href="${API_BASE}/${l.short}" target="_blank" rel="noopener noreferrer">${l.fullShort}</a>
            </div>
            <div class="history-item-original" title="${l.original}">${l.original}</div>
            <div class="history-item-meta">
              <span class="history-item-date">${dateStr}</span>
              ${badge}
              <span class="history-item-fav ${isFav ? 'active' : ''}" data-fav="${l.id}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">${isFav ? '\u2605' : '\u2606'}</span>
            </div>
          </div>
          <div class="history-item-actions">
            <button class="btn-sm history-copy" data-id="${l.id}" data-url="${l.fullShort}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </button>
            <button class="btn-sm history-open" data-id="${l.id}" data-url="${l.fullShort}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Open
            </button>
            <button class="btn-sm btn-danger history-delete" data-id="${l.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ========================================
  //  EXPORT / IMPORT
  // ========================================
  function exportData(format) {
    if (links.length === 0) {
      showToast('No data to export', 'error');
      return;
    }
    let content, mimeType, ext;
    switch (format) {
      case 'csv':
        content = 'Original URL,Short URL,Short ID,Domain,Created At,Copies,Opens\n' +
          links.map(l =>
            `"${l.original}","${l.fullShort}","${l.short}","${l.domain}","${l.createdAt}",${l.copied},${l.opened}`
          ).join('\n');
        mimeType = 'text/csv';
        ext = 'csv';
        break;
      case 'json':
        content = JSON.stringify(links, null, 2);
        mimeType = 'application/json';
        ext = 'json';
        break;
      case 'txt':
        content = links.map(l => `${l.fullShort} -> ${l.original} (${new Date(l.createdAt).toLocaleDateString()})`).join('\n');
        mimeType = 'text/plain';
        ext = 'txt';
        break;
    }
    downloadFile(content, mimeType, `shortly-links.${ext}`);
    showToast(`Exported as ${format.toUpperCase()}`);
  }

  function downloadFile(content, mimeType, filename) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error('Invalid format');
        const valid = data.filter(l => l.original && l.short && l.domain && l.createdAt);
        if (valid.length === 0) throw new Error('No valid links found');
        for (const l of valid) {
          if (!l.id) l.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
          if (!l.fullShort) l.fullShort = `${DISPLAY_DOMAIN}${l.domain || '.com'}/${l.short}`;
          try {
            await api('POST', '/api/shorten', l);
          } catch {}
        }
        links = [...valid, ...links];
        await updateStats();
        renderHistory();
        showToast(`Imported ${valid.length} link(s)`);
      } catch (err) {
        showToast('Import failed: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  // ========================================
  //  FAVORITES
  // ========================================
  function getFavorites() {
    try {
      const data = localStorage.getItem(FAV_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveFavorites(favs) {
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  }

  // ========================================
  //  HERO PREVIEW
  // ========================================
  function updateHeroPreview() {
    const domain = domainSelect.value;
    const alias = aliasInput.value.trim();
    shortDomain.textContent = `${DISPLAY_DOMAIN}${domain}/`;
    shortAlias.textContent = alias || 'a8X92k';
    heroShort.classList.add('visible');
  }

  // ========================================
  //  SCROLL TO TOP
  // ========================================
  function checkScroll() {
    window.addEventListener('scroll', () => {
      scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
    });
  }

  // ========================================
  //  RIPPLE EFFECT
  // ========================================
  function createRipple(e, el) {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  // ========================================
  //  BIND EVENTS
  // ========================================
  function bindEvents() {
    shortenBtn.addEventListener('click', function(e) {
      createRipple(e, this);
      this.classList.add('loading');
      setTimeout(() => shortenURL(), 400);
    });

    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        shortenBtn.classList.add('loading');
        setTimeout(() => shortenURL(), 400);
      }
    });

    themeToggle.addEventListener('click', toggleTheme);

    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    $$('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });

    const sections = $$('section[id]');
    window.addEventListener('scroll', () => {
      let current = 'hero';
      sections.forEach(s => {
        const top = s.offsetTop - 120;
        if (window.scrollY >= top) current = s.id;
      });
      $$('.nav-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === '#' + current);
      });
    });

    copyBtn.addEventListener('click', () => {
      if (currentLink) copyToClipboard(currentLink.fullShort, currentLink.id);
    });

    openBtn.addEventListener('click', () => {
      if (currentLink) {
        window.open(`${API_BASE}/${currentLink.short}`, '_blank');
        currentLink.opened++;
        incrementOpened(currentLink.id);
      }
    });

    deleteResultBtn.addEventListener('click', () => {
      if (currentLink) deleteLink(currentLink.id);
    });

    closeResult.addEventListener('click', () => {
      resultSection.style.display = 'none';
    });

    domainSelect.addEventListener('change', updateHeroPreview);
    aliasInput.addEventListener('input', updateHeroPreview);

    searchInput.addEventListener('input', (e) => {
      renderHistory(e.target.value);
    });

    historyList.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;

      if (target.classList.contains('history-copy')) {
        const id = target.dataset.id;
        const url = target.dataset.url;
        copyToClipboard(url, id);
      } else if (target.classList.contains('history-open')) {
        const id = target.dataset.id;
        const link = links.find(l => l.id === id);
        if (link) {
          window.open(`${API_BASE}/${link.short}`, '_blank');
          link.opened++;
          incrementOpened(id);
        }
      } else if (target.classList.contains('history-delete')) {
        deleteLink(target.dataset.id);
      }
    });

    historyList.addEventListener('click', (e) => {
      const fav = e.target.closest('.history-item-fav');
      if (!fav) return;
      const id = fav.dataset.fav;
      let favs = getFavorites();
      if (favs.includes(id)) {
        favs = favs.filter(f => f !== id);
      } else {
        favs.push(id);
      }
      saveFavorites(favs);
      renderHistory(searchInput.value);
    });

    exportBtn.addEventListener('click', () => {
      const formats = ['csv', 'json', 'txt'];
      const menu = document.createElement('div');
      menu.style.cssText = `
        position:absolute; top:100%; right:0; margin-top:4px;
        background:var(--bg-secondary); border:1px solid var(--border-color);
        border-radius:var(--radius-md); overflow:hidden;
        box-shadow:var(--shadow-lg); z-index:100; min-width:120px;
      `;
      formats.forEach(f => {
        const item = document.createElement('button');
        item.textContent = f.toUpperCase();
        item.style.cssText = `
          display:block; width:100%; padding:10px 16px; text-align:left;
          font-size:0.85rem; font-weight:600; cursor:pointer;
          background:transparent; color:var(--text-secondary); border:none;
        `;
        item.addEventListener('mouseenter', () => {
          item.style.background = 'var(--bg-card-hover)';
          item.style.color = 'var(--text-primary)';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'transparent';
          item.style.color = 'var(--text-secondary)';
        });
        item.addEventListener('click', () => {
          exportData(f);
          menu.remove();
        });
        menu.appendChild(item);
      });
      exportBtn.style.position = 'relative';
      exportBtn.parentElement.appendChild(menu);
      const closeMenu = (e2) => {
        if (!menu.contains(e2.target) && e2.target !== exportBtn) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      };
      setTimeout(() => document.addEventListener('click', closeMenu), 10);
    });

    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        importData(e.target.files[0]);
        e.target.value = '';
      }
    });

    clearAllBtn.addEventListener('click', () => {
      if (links.length === 0) return;
      if (confirm('Are you sure you want to clear all history?')) {
        clearAllHistory();
      }
    });

    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    let dragCounter = 0;
    dropZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      document.querySelector('.drag-hint').classList.add('visible');
    });
    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        document.querySelector('.drag-hint').classList.remove('visible');
      }
    });
    dropZone.addEventListener('dragover', (e) => e.preventDefault());
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      document.querySelector('.drag-hint').classList.remove('visible');
      dragCounter = 0;
      const text = e.dataTransfer.getData('text');
      if (text && isValidURL(text)) {
        urlInput.value = text;
        shortenBtn.classList.add('loading');
        setTimeout(() => shortenURL(), 400);
      } else {
        showToast('Please drop a valid URL', 'error');
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        urlInput.focus();
      }
      if (e.key === 'Escape') {
        resultSection.style.display = 'none';
      }
    });
  }

  // ---- Init ----
  document.addEventListener('DOMContentLoaded', init);
})();

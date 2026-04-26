// ===== COMMON UTILITIES FOR VOTE SAARTHI =====

// Session check - redirect to login if not authenticated
async function checkSession() {
  try {
    const res = await fetch('/api/auth/session');
    const data = await res.json();
    if (!data.authenticated) {
      window.location.href = '/';
      return null;
    }
    return data;
  } catch {
    window.location.href = '/';
    return null;
  }
}

// Inject navbar into page
function renderNavbar(activePage) {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  nav.className = 'navbar';
  nav.innerHTML = `
    <div class="navbar-brand">
      <div class="flag"><span class="sf"></span><span class="wh"></span><span class="gr"></span></div>
      Vote Saarthi
    </div>
    <div class="nav-links">
      <a href="/dashboard" class="${activePage === 'dashboard' ? 'active' : ''}" data-translate="nav_dashboard">Dashboard</a>
      <a href="/guide" class="${activePage === 'guide' ? 'active' : ''}" data-translate="nav_guide">Election Guide</a>
      <a href="/booth-finder" class="${activePage === 'booth-finder' ? 'active' : ''}" data-translate="nav_booths">Find Booth</a>
      <a href="/vote" class="${activePage === 'vote' ? 'active' : ''}" data-translate="nav_vote">Cast Vote</a>
    </div>
    <div class="nav-right">
      <select class="lang-select" id="globalLangSelect" onchange="changeLanguage(this.value)">
        <option value="en">English</option>
        <option value="hi">हिन्दी</option>
        <option value="ta">தமிழ்</option>
        <option value="te">తెలుగు</option>
        <option value="gu">ગુજરાતી</option>
        <option value="bn">বাংলা</option>
        <option value="mr">मराठी</option>
        <option value="kn">ಕನ್ನಡ</option>
        <option value="ml">മലയാളം</option>
        <option value="pa">ਪੰਜਾਬੀ</option>
      </select>
      <button class="btn btn-sm btn-outline" onclick="logout()" data-translate="nav_logout">Logout</button>
    </div>
  `;
  // Set saved language
  const savedLang = localStorage.getItem('voteSaarthiLang') || 'en';
  const sel = document.getElementById('globalLangSelect');
  if (sel) sel.value = savedLang;
}

// Session timer
function startSessionTimer(remainingMs, elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  let remaining = Math.floor(remainingMs / 1000);
  const interval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(interval);
      showToast('Session expired. Redirecting...', 'error');
      setTimeout(() => window.location.href = '/', 1500);
      return;
    }
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    el.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
    if (remaining < 300) el.style.color = 'var(--danger)';
  }, 1000);
}

// Logout
async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {}
  window.location.href = '/';
}

// Toast notifications
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// Loading overlay
function showLoading(msg) {
  let overlay = document.querySelector('.loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `<div class="spinner"></div><p class="loading-msg"></p>`;
    document.body.appendChild(overlay);
  }
  overlay.querySelector('.loading-msg').textContent = msg || 'Loading...';
  overlay.classList.add('active');
}

function hideLoading() {
  const overlay = document.querySelector('.loading-overlay');
  if (overlay) overlay.classList.remove('active');
}

// API fetch wrapper
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

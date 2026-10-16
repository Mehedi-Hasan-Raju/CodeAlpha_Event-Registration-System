// Shared helpers for both pages
const Store = {
  get token() { return localStorage.getItem('token'); },
  get user() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } },
  save(token, user) { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); },
  clear() { localStorage.removeItem('token'); localStorage.removeItem('user'); },
};

async function api(path, { method = 'GET', body, raw = false } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (Store.token) headers.Authorization = 'Bearer ' + Store.token;
  const res = await fetch('/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (raw) {
    if (!res.ok) throw new Error('Request failed');
    return res;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && Store.token) { Store.clear(); }
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

// Escape user-provided text before putting it in innerHTML
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const fmtDate = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const toLocalInput = (d) => {
  const dt = new Date(d);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().slice(0, 16);
};

let toastTimer;
function toast(msg, isErr = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = isErr ? 'err' : '';
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.style.display = 'none'), 3200);
}

const openModal = (id) => document.getElementById(id).classList.add('open');
const closeModal = (id) => document.getElementById(id).classList.remove('open');

let token = sessionStorage.getItem('admin_token') || '';
let fullData = {};
let currentTab = 'meta';

const SECTION_LABELS = {
  meta: 'Meta / Hero',
  about: 'About',
  skills: 'Skills',
  experience: 'Experience',
  projects: 'Projects',
  certifications: 'Certifications',
  contact: 'Contact',
};

/* ── Login ── */
document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('token-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});

async function login() {
  const t = document.getElementById('token-input').value.trim();
  const err = document.getElementById('login-error');
  if (!t) { err.textContent = 'Please enter a token.'; return; }

  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: t }),
  });

  if (res.ok) {
    token = t;
    sessionStorage.setItem('admin_token', token);
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    await loadData();
  } else {
    err.textContent = 'Invalid token. Try again.';
  }
}

document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('admin_token');
  location.reload();
});

/* ── Auto-login if token stored ── */
if (token) {
  (async () => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      await loadData();
    } else {
      sessionStorage.removeItem('admin_token');
    }
  })();
}

/* ── Load all data ── */
async function loadData() {
  const res = await fetch('/api/data');
  fullData = await res.json();
  renderTab(currentTab);
}

/* ── Tab switching ── */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTab = btn.dataset.tab;
    renderTab(currentTab);
  });
});

function renderTab(tab) {
  document.getElementById('editor-title').textContent = SECTION_LABELS[tab];
  const section = fullData[tab];
  document.getElementById('json-editor').value = JSON.stringify(section, null, 2);
  setStatus('');
}

/* ── Save ── */
document.getElementById('save-btn').addEventListener('click', saveSection);

async function saveSection() {
  const raw = document.getElementById('json-editor').value;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    setStatus('❌ Invalid JSON — ' + e.message, 'err');
    return;
  }

  const res = await fetch(`/api/admin/data/${currentTab}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token,
    },
    body: JSON.stringify(parsed),
  });

  if (res.ok) {
    fullData[currentTab] = parsed;
    setStatus('✓ Saved successfully', 'ok');
    setTimeout(() => setStatus(''), 3000);
  } else {
    setStatus('❌ Save failed — check console', 'err');
  }
}

function setStatus(msg, type = '') {
  const el = document.getElementById('save-status');
  el.textContent = msg;
  el.className = 'save-status ' + type;
}

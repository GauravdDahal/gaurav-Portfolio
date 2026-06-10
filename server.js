const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'data.json');

// ── Middleware ──────────────────────────────────────────
app.use(express.json());

// Serve public frontend
app.use(express.static(path.join(__dirname, 'public')));

// Serve admin panel at /admin
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ── Helpers ─────────────────────────────────────────────
function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── Public API ──────────────────────────────────────────
app.get('/api/data', (req, res) => {
  try {
    res.json(readData());
  } catch (e) {
    res.status(500).json({ error: 'Could not read data' });
  }
});

// ── Admin API (simple token auth) ──────────────────────
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme123';

function requireAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Verify token
app.post('/api/admin/login', (req, res) => {
  const { token } = req.body;
  if (token === ADMIN_TOKEN) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Full data update (admin saves entire JSON)
app.put('/api/admin/data', requireAuth, (req, res) => {
  try {
    writeData(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Could not save data' });
  }
});

// Patch a top-level section only (e.g. PUT /api/admin/data/projects)
app.put('/api/admin/data/:section', requireAuth, (req, res) => {
  try {
    const data = readData();
    data[req.params.section] = req.body;
    writeData(data);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Could not save section' });
  }
});

// ── Start ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Portfolio server running on http://localhost:${PORT}`);
  console.log(`🔐  Admin panel at http://localhost:${PORT}/admin`);
});

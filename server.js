const express = require('express');
const fs = require('fs');
const path = require('path');
const { put, get } = require('@vercel/blob');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'data.json');

// On Vercel the filesystem is read-only, so data lives in Vercel Blob.
// Locally (no blob token) we keep using data/data.json.
// The env var is BLOB_READ_WRITE_TOKEN by default, but Vercel prefixes it
// with the store name if one was set — accept any *_READ_WRITE_TOKEN.
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN ||
  (Object.entries(process.env).find(([k]) => k.endsWith('_READ_WRITE_TOKEN')) || [])[1];
const USE_BLOB = !!BLOB_TOKEN;
const BLOB_KEY = 'portfolio-data.json';

// ── Middleware ──────────────────────────────────────────
app.use(express.json());

// Serve public frontend
app.use(express.static(path.join(__dirname, 'public')));

// Serve admin panel at /admin
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ── Helpers ─────────────────────────────────────────────
async function readData() {
  if (!USE_BLOB) {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }
  const result = await get(BLOB_KEY, { access: 'private', useCache: false, token: BLOB_TOKEN });
  if (!result) {
    // First run: seed the blob from the bundled data file
    const seed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    await writeData(seed);
    return seed;
  }
  return new Response(result.stream).json();
}

async function writeData(data) {
  if (!USE_BLOB) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return;
  }
  await put(BLOB_KEY, JSON.stringify(data, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    token: BLOB_TOKEN,
  });
}

// ── Public API ──────────────────────────────────────────
app.get('/api/data', async (req, res) => {
  try {
    res.json(await readData());
  } catch (e) {
    console.error('readData failed:', e);
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
app.put('/api/admin/data', requireAuth, async (req, res) => {
  try {
    await writeData(req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error('writeData failed:', e);
    res.status(500).json({ error: 'Could not save data' });
  }
});

// Patch a top-level section only (e.g. PUT /api/admin/data/projects)
app.put('/api/admin/data/:section', requireAuth, async (req, res) => {
  try {
    const data = await readData();
    data[req.params.section] = req.body;
    await writeData(data);
    res.json({ ok: true });
  } catch (e) {
    console.error('save section failed:', e);
    res.status(500).json({ error: 'Could not save section', detail: String(e && e.message), blob: USE_BLOB });
  }
});

// Temporary debug: shows whether the Blob token is visible to the function
app.get('/api/health', (req, res) => {
  res.json({ blob: USE_BLOB, node: process.version });
});

// ── Start ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Portfolio server running on http://localhost:${PORT}`);
  console.log(`🔐  Admin panel at http://localhost:${PORT}/admin`);
});

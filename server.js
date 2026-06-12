const express = require('express');
const fs = require('fs');
const path = require('path');
const { put, list } = require('@vercel/blob');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'data.json');

// On Vercel the filesystem is read-only, so data lives in Vercel Blob.
// Locally (no BLOB_READ_WRITE_TOKEN) we keep using data/data.json.
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const BLOB_KEY = 'portfolio-data.json';
let blobUrl = null;

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
  if (!blobUrl) {
    const { blobs } = await list({ prefix: BLOB_KEY, limit: 1 });
    if (blobs.length === 0) {
      // First run: seed the blob from the bundled data file
      const seed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      await writeData(seed);
      return seed;
    }
    blobUrl = blobs[0].url;
  }
  // Unique query param bypasses the CDN cache so we always read the latest save
  const res = await fetch(`${blobUrl}?v=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
  return res.json();
}

async function writeData(data) {
  if (!USE_BLOB) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return;
  }
  const blob = await put(BLOB_KEY, JSON.stringify(data, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
  blobUrl = blob.url;
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

'use strict';

const { app, ipcMain, nativeImage } = require('electron');
const { menubar } = require('menubar');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');

const CONFIG_FILE  = path.join(os.homedir(), '.claude', 'skills-exchange', 'config.json');
const COMMANDS_DIR = path.join(os.homedir(), '.claude', 'commands');
const SEEN_FILE    = path.join(os.homedir(), '.claude', 'skills-exchange', '.seen_ids.json');
const API_BASE     = 'https://skillshare-cc.enspyreinvesting.workers.dev';

// ── Helpers ──────────────────────────────────────────────────────────────────

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { return null; }
}

function readSeen() {
  try { return new Set(JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'))); } catch { return new Set(); }
}

function writeSeen(ids) {
  try { fs.writeFileSync(SEEN_FILE, JSON.stringify([...ids])); } catch {}
}

function apiRequest(pathname, token, method = 'GET', body = null) {
  const cfg = readConfig();
  const base = cfg?.api_url || API_BASE;
  return new Promise((resolve, reject) => {
    const url = new URL(base + pathname);
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const req = https.request(
      { hostname: url.hostname, port: 443, path: url.pathname + url.search, method, headers },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
          catch { resolve({ status: res.statusCode, body: raw }); }
        });
      }
    );
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const SYSTEM_COMMANDS = new Set(['skills-init','skills-send','skills-inbox','skills-who','skills-add']);

// ── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('get-state', async () => {
  const cfg = readConfig();
  if (!cfg) return { initialized: false };
  try {
    const res = await apiRequest('/inbox', cfg.token);
    const messages = res.body?.messages || [];
    const seen = readSeen();
    const newCount = messages.filter((m) => !seen.has(m.id)).length;
    writeSeen(new Set(messages.map((m) => m.id)));
    return { initialized: true, username: cfg.username, messages, newCount };
  } catch (e) {
    return { initialized: true, username: cfg.username, messages: [], error: e.message };
  }
});

ipcMain.handle('register', async (_, username) => {
  const res = await apiRequest('/claim', null, 'POST', { username });
  if (res.status === 200) {
    const dir = path.dirname(CONFIG_FILE);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({
      username: res.body.username,
      token: res.body.token,
      registered_at: new Date().toISOString(),
    }, null, 2));
    // Install slash commands
    try {
      const src = path.join(__dirname, '..', 'commands');
      fs.mkdirSync(COMMANDS_DIR, { recursive: true });
      for (const f of fs.readdirSync(src).filter((f) => f.endsWith('.md'))) {
        fs.copyFileSync(path.join(src, f), path.join(COMMANDS_DIR, f));
      }
    } catch {}
  }
  return res;
});

ipcMain.handle('install-skill', async (_, msgId) => {
  const cfg = readConfig();
  const res = await apiRequest('/inbox', cfg.token);
  const msg = (res.body?.messages || []).find((m) => m.id === msgId);
  if (!msg) return { ok: false, error: 'not found' };
  fs.mkdirSync(COMMANDS_DIR, { recursive: true });
  fs.writeFileSync(path.join(COMMANDS_DIR, `${msg.skill_name}.md`), msg.skill_content);
  try { await apiRequest(`/inbox/${msgId}`, cfg.token, 'DELETE'); } catch {}
  return { ok: true, skill_name: msg.skill_name };
});

ipcMain.handle('get-local-skills', () => {
  try {
    return fs.readdirSync(COMMANDS_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace('.md', ''))
      .filter((n) => !SYSTEM_COMMANDS.has(n));
  } catch { return []; }
});

ipcMain.handle('send-skill', async (_, { to, skillName }) => {
  const cfg = readConfig();
  const content = fs.readFileSync(path.join(COMMANDS_DIR, `${skillName}.md`), 'utf8');
  const res = await apiRequest('/send', cfg.token, 'POST', {
    to, skill_name: skillName, skill_content: content,
  });
  return res.body;
});

ipcMain.handle('sync-skills', async () => {
  const cfg = readConfig();
  let skills = [];
  try {
    skills = fs.readdirSync(COMMANDS_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace('.md', ''))
      .filter((n) => !SYSTEM_COMMANDS.has(n));
  } catch {}
  const res = await apiRequest('/skills', cfg.token, 'POST', { skills });
  return res.body;
});

ipcMain.handle('resize', (_, height) => {
  if (mb?.window) mb.window.setContentSize(300, Math.min(height + 16, 560));
});

// ── App ───────────────────────────────────────────────────────────────────────

let mb;

// 1×1 transparent PNG — tray image is invisible, title carries the icon
const EMPTY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=';

app.whenReady().then(() => {
  const icon = nativeImage.createFromDataURL(`data:image/png;base64,${EMPTY_PNG}`);

  mb = menubar({
    index: `file://${path.join(__dirname, 'index.html')}`,
    icon,
    browserWindow: {
      width: 300,
      height: 460,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
      vibrancy: 'under-window',
      visualEffectState: 'active',
      transparent: true,
      frame: false,
      resizable: false,
      hasShadow: true,
    },
    preloadWindow: true,
    showDockIcon: false,
    tooltip: 'Skills Exchange',
  });

  mb.on('ready', () => {
    mb.tray.setTitle(' ⚡');
  });

  mb.on('after-show', () => {
    mb.window.webContents.send('refresh');
  });
});

#!/usr/bin/env node

// <swiftbar.title>Skills Exchange</swiftbar.title>
// <swiftbar.version>0.1.0</swiftbar.version>
// <swiftbar.author>Enspy</swiftbar.author>
// <swiftbar.desc>Send and receive Claude Code skills with other users</swiftbar.desc>
// <swiftbar.dependencies>node,skillshare-cc</swiftbar.dependencies>
// <swiftbar.hideAbout>true</swiftbar.hideAbout>
// <swiftbar.hideRunInTerminal>true</swiftbar.hideRunInTerminal>
// <swiftbar.hideLastUpdated>true</swiftbar.hideLastUpdated>
// <swiftbar.hideDisablePlugin>false</swiftbar.hideDisablePlugin>

'use strict';

const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const https = require('https');
const { execSync, execFileSync } = require('child_process');

// ── Paths ────────────────────────────────────────────────────────────────────

const CONFIG_DIR  = path.join(os.homedir(), '.claude', 'skills-exchange');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SEEN_FILE   = path.join(CONFIG_DIR, '.seen_ids.json');
const COMMANDS_DIR = path.join(os.homedir(), '.claude', 'commands');

// ── Helpers ──────────────────────────────────────────────────────────────────

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
  catch { return null; }
}

function readSeen() {
  try { return new Set(JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'))); }
  catch { return new Set(); }
}

function writeSeen(ids) {
  try { fs.writeFileSync(SEEN_FILE, JSON.stringify([...ids])); } catch {}
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function notify(title, body) {
  try {
    execSync(
      `osascript -e 'display notification "${body}" with title "${title}" sound name "Glass"'`,
      { stdio: 'ignore' }
    );
  } catch {}
}

// Find the skillshare binary wherever npm put it
function findSkillshare() {
  const candidates = [
    '/usr/local/bin/skillshare',
    '/opt/homebrew/bin/skillshare',
    path.join(os.homedir(), '.npm-global', 'bin', 'skillshare'),
    path.join(os.homedir(), '.volta', 'bin', 'skillshare'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  try { return execSync('which skillshare', { encoding: 'utf8' }).trim(); } catch {}
  return 'skillshare';
}

// List local skill files, excluding system commands
const SYSTEM_CMDS = new Set([
  'skills-init', 'skills-send', 'skills-inbox', 'skills-who', 'skills-add',
]);

function localSkills() {
  try {
    return fs.readdirSync(COMMANDS_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace(/\.md$/, ''))
      .filter(n => !SYSTEM_CMDS.has(n));
  } catch { return []; }
}

// ── API ──────────────────────────────────────────────────────────────────────

function apiRequest(pathname, token) {
  const cfg = readConfig();
  const base = cfg?.api_url || 'https://skillshare-cc.enspyreinvesting.workers.dev';

  return new Promise((resolve, reject) => {
    const url = new URL(base + pathname);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = https.request(
      { hostname: url.hostname, port: 443, path: url.pathname + url.search, method: 'GET', headers },
      res => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); } catch { resolve({}); }
        });
      }
    );
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

// ── Render ───────────────────────────────────────────────────────────────────

function line(text, opts = {}) {
  const parts = [text];
  if (opts.sfimage)   parts.push(`sfimage=${opts.sfimage}`);
  if (opts.color)     parts.push(`color=${opts.color}`);
  if (opts.size)      parts.push(`size=${opts.size}`);
  if (opts.font)      parts.push(`font=${opts.font}`);
  if (opts.bash)      parts.push(`bash=${opts.bash}`);
  for (let i = 1; i <= 9; i++) {
    if (opts[`param${i}`] != null) parts.push(`param${i}=${opts[`param${i}`]}`);
  }
  if (opts.terminal != null) parts.push(`terminal=${opts.terminal}`);
  if (opts.refresh)   parts.push(`refresh=true`);
  if (opts.href)      parts.push(`href=${opts.href}`);
  if (opts.indent)    process.stdout.write('--'.repeat(opts.indent));
  console.log(parts.join(' | '));
}

function sep() { console.log('---'); }

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const cfg = readConfig();
  const skillshare = findSkillshare();

  // ── Not initialized ──────────────────────────────────────────────────────
  if (!cfg?.token) {
    line('⚡', { sfimage: 'bolt', color: '#888888' });
    sep();
    line('Skills Exchange', { size: 13 });
    line('Not set up | size=11 color=#888888');
    sep();
    line('Set up now...', { sfimage: 'arrow.right.circle', bash: skillshare, param1: 'init', terminal: true, refresh: true });
    return;
  }

  // ── Fetch inbox ──────────────────────────────────────────────────────────
  let messages = [];
  let fetchError = false;

  try {
    const res = await apiRequest('/inbox', cfg.token);
    messages = res.messages || [];
  } catch {
    fetchError = true;
  }

  // Detect new messages and notify
  if (!fetchError) {
    const seen = readSeen();
    const allIds = new Set(messages.map(m => m.id));

    for (const msg of messages) {
      if (!seen.has(msg.id)) {
        notify('⚡ Skills Exchange', `@${msg.from} sent you /${msg.skill_name}`);
      }
    }

    writeSeen(allIds);
  }

  // ── Menu bar item ────────────────────────────────────────────────────────
  if (fetchError) {
    line('⚡', { sfimage: 'bolt.slash', color: '#FF453A' });
  } else if (messages.length > 0) {
    line(`⚡ ${messages.length}`, { sfimage: 'bolt.fill', color: '#FFD60A' });
  } else {
    line('⚡', { sfimage: 'bolt.fill', color: '#888888' });
  }

  sep();

  // ── Header ───────────────────────────────────────────────────────────────
  line(`Skills Exchange`, { size: 13 });
  line(`@${cfg.username}  ·  ${localSkills().length} skills`, { size: 11, color: '#888888' });

  sep();

  // ── Inbox ────────────────────────────────────────────────────────────────
  if (fetchError) {
    line('Could not reach server', { sfimage: 'wifi.slash', color: '#FF453A', size: 12 });
    line('Refresh', { sfimage: 'arrow.clockwise', size: 11, color: '#888888', refresh: true });
  } else if (messages.length === 0) {
    line('Inbox is empty', { sfimage: 'tray', color: '#888888', size: 12 });
  } else {
    const label = messages.length === 1 ? '1 skill waiting' : `${messages.length} skills waiting`;
    line(label, { sfimage: 'tray.fill', color: '#FFD60A', size: 11 });

    for (const msg of messages) {
      line(`/${msg.skill_name}`, { sfimage: 'bolt.fill', color: '#FFFFFF', size: 13 });
      line(`from @${msg.from}  ·  ${timeAgo(msg.sent_at)}`, { indent: 1, size: 11, color: '#888888' });
      line(`Install /${msg.skill_name}`, {
        indent: 1,
        sfimage: 'arrow.down.circle.fill',
        color: '#30D158',
        size: 12,
        bash: skillshare,
        param1: 'add',
        param2: msg.id,
        terminal: false,
        refresh: true,
      });
    }
  }

  sep();

  // ── Send submenu ─────────────────────────────────────────────────────────
  const skills = localSkills();
  if (skills.length > 0) {
    line('Send a skill', { sfimage: 'arrow.up.circle', size: 12 });
    for (const skill of skills.slice(0, 15)) {
      // Opens a terminal so user can type the recipient
      line(`/${skill}`, {
        indent: 1,
        sfimage: 'bolt',
        size: 12,
        bash: '/usr/bin/osascript',
        param1: '-e',
        param2: `set u to text returned of (display dialog "Send /${skill} to:" default answer "@username")`,
        param3: '-e',
        param4: `do shell script "${skillshare} send " & u & " ${skill}"`,
        terminal: false,
        refresh: true,
      });
    }
  } else {
    line('Send a skill...', { sfimage: 'arrow.up.circle', size: 12, bash: skillshare, terminal: true });
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  line('Sync my skills', {
    sfimage: 'arrow.triangle.2.circlepath',
    size: 12,
    bash: skillshare,
    param1: 'sync',
    terminal: false,
    refresh: true,
  });

  sep();

  line('Refresh now', { sfimage: 'arrow.clockwise', size: 11, color: '#888888', refresh: true });
  line('Open config', {
    sfimage: 'gear',
    size: 11,
    color: '#888888',
    bash: '/usr/bin/open',
    param1: CONFIG_FILE,
    terminal: false,
  });
}

main().catch(e => {
  line('⚡', { sfimage: 'bolt.badge.xmark', color: '#FF453A' });
  sep();
  line('Skills Exchange error', { size: 13 });
  line(String(e.message).slice(0, 60), { size: 11, color: '#FF453A' });
  sep();
  line('Refresh', { sfimage: 'arrow.clockwise', refresh: true });
});

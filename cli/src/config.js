const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.claude', 'skills-exchange');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const RECEIVED_DIR = path.join(CONFIG_DIR, 'received');

function ensureDirs() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.mkdirSync(RECEIVED_DIR, { recursive: true });
}

function read() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function write(data) {
  ensureDirs();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function requireAuth() {
  const cfg = read();
  if (!cfg?.token) {
    console.error('Not initialized. Run: skillshare init');
    process.exit(1);
  }
  return cfg;
}

module.exports = { CONFIG_DIR, CONFIG_FILE, RECEIVED_DIR, ensureDirs, read, write, requireAuth };

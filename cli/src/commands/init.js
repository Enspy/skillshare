const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config');
const api = require('../api');
const { installCommands } = require('../install-commands');

function installHook() {
  const settingsFile = path.join(os.homedir(), '.claude', 'settings.json');
  let settings = {};
  try { settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8')); } catch {}

  const hook = { type: 'command', command: 'skillshare check 2>/dev/null' };
  settings.hooks = settings.hooks || {};
  settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit || [];

  // Don't add duplicate
  const already = settings.hooks.UserPromptSubmit.some(h =>
    h.hooks?.some(c => c.command?.includes('skillshare check'))
  );
  if (!already) {
    settings.hooks.UserPromptSubmit.push({ hooks: [hook] });
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
  }
}

module.exports = async function init({ reset, username: presetUsername } = {}) {
  const existing = config.read();

  if (existing && !reset) {
    console.log(`Already initialized as @${existing.username}`);
    installHook();
    installCommands();
    console.log(`Run 'skillshare init --reset' to register a new username.`);
    return;
  }

  let username = '';

  // Non-interactive mode: username passed directly (e.g. from SwiftBar widget)
  if (presetUsername) {
    username = presetUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (username.length < 2) {
      console.error('Username must be at least 2 characters.');
      process.exit(1);
    }
  } else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

    console.log('\n  ⚡ Claude Code — Skills Exchange\n');

    while (username.length < 2) {
      const raw = await ask('  Choose a username (letters, numbers, underscores): @');
      username = raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (username.length < 2) console.log('  Username must be at least 2 characters.\n');
    }

    rl.close();
  }

  process.stdout.write(`\n  Registering @${username}...`);

  let res;
  try {
    res = await api.claim(username);
  } catch (e) {
    console.log(`\n  Error: could not reach the Skills Exchange server.\n  ${e.message}\n`);
    process.exit(1);
  }

  if (res.status === 409) {
    console.log('\n  That username is already taken. Run init again and try another.\n');
    process.exit(1);
  }

  if (res.status !== 200) {
    console.log(`\n  Error: ${res.body?.error || 'registration failed'}\n`);
    process.exit(1);
  }

  config.write({
    username: res.body.username,
    token: res.body.token,
    api_url: null,
    registered_at: new Date().toISOString(),
  });

  console.log(' done');
  process.stdout.write('  Installing Claude Code commands...');
  const installed = installCommands();
  console.log(' done');
  process.stdout.write('  Installing inbox hook...');
  installHook();
  console.log(' done\n');

  console.log(`  ✓ You are @${res.body.username} on Skills Exchange`);
  console.log(`  ✓ Slash commands: ${installed.join(', ')}`);
  console.log(`  ✓ Inbox notifications active in Claude Code\n`);
  console.log('  Next: add a friend so you can exchange skills:');
  console.log('    skillshare friends add @username\n');
};

const readline = require('readline');
const config = require('../config');
const api = require('../api');
const { installCommands } = require('../install-commands');

module.exports = async function init({ reset } = {}) {
  const existing = config.read();

  if (existing && !reset) {
    console.log(`Already initialized as @${existing.username}`);
    console.log(`Run 'skillshare init --reset' to register a new username.`);
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  console.log('\n  ⚡ Claude Code — Skills Exchange\n');

  let username = '';
  while (username.length < 2) {
    const raw = await ask('  Choose a username (letters, numbers, underscores): @');
    username = raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (username.length < 2) console.log('  Username must be at least 2 characters.\n');
  }

  rl.close();

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
  console.log(' done\n');

  console.log(`  ✓ You are @${res.body.username} on Skills Exchange`);
  console.log(`  ✓ Commands installed: ${installed.join(', ')}\n`);
  console.log('  Try it inside Claude Code:');
  console.log('    /skills-who @someuser');
  console.log('    /skills-send @someuser /frontend-design\n');
};

/**
 * Reads ~/.claude/commands/ and pushes the list of skill names to the registry
 * so other users can see what you have when they run /skills-who @you.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config');
const api = require('../api');

module.exports = async function sync() {
  const cfg = config.requireAuth();

  const commandsDir = path.join(os.homedir(), '.claude', 'commands');

  let files = [];
  try {
    files = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.md'));
  } catch {
    console.log('No ~/.claude/commands/ directory found. Nothing to sync.');
    return;
  }

  // Exclude the skills-exchange system commands themselves
  const systemCommands = new Set([
    'skills-init',
    'skills-send',
    'skills-inbox',
    'skills-who',
    'skills-add',
  ]);

  const skills = files
    .map((f) => f.replace(/\.md$/, ''))
    .filter((name) => !systemCommands.has(name));

  process.stdout.write(`Syncing ${skills.length} skill(s) to the registry...`);

  let res;
  try {
    res = await api.updateSkills(skills, cfg.token);
  } catch (e) {
    console.log(`\nError: ${e.message}`);
    process.exit(1);
  }

  if (res.status !== 200) {
    console.log(`\nError: ${res.body?.error || 'sync failed'}`);
    process.exit(1);
  }

  console.log(' done');
  console.log(`\n  @${cfg.username} now shows ${skills.length} skill(s) publicly:\n`);
  for (const s of skills) console.log(`  ⚡ /${s}`);
  console.log('');
};

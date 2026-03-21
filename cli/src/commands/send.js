const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config');
const api = require('../api');
const notify = require('../notify');

const QUEUE_FILE = path.join(os.homedir(), '.claude', 'skills-exchange', 'pending-sends.json');

function readQueue() {
  try { return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')); } catch { return []; }
}
function writeQueue(q) {
  try {
    fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true });
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(q, null, 2));
  } catch {}
}

function findSkillFile(skillName) {
  const name = skillName.replace(/^\//, '');
  const candidates = [
    path.join(os.homedir(), '.claude', 'commands', `${name}.md`),
    path.join(os.homedir(), '.claude', 'commands', `skills-${name}.md`),
    path.join(os.homedir(), '.claude', 'skills', name, 'SKILL.md'),
    path.join(os.homedir(), '.claude', 'skills', name, `${name}.md`),
    path.join(process.cwd(), '.claude', 'commands', `${name}.md`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return { file: p, content: fs.readFileSync(p, 'utf8') };
  }
  return null;
}

module.exports = async function send(args) {
  // args: ['@devdan', '/polish']  or  ['@devdan', 'polish']
  if (args.length < 2) {
    console.error('Usage: skillshare send @username /skillname');
    process.exit(1);
  }

  const cfg = config.requireAuth();
  const to = args[0].replace(/^@/, '');
  const skillName = args[1].replace(/^\//, '');

  const found = findSkillFile(skillName);
  if (!found) {
    console.error(`Skill '/${skillName}' not found in ~/.claude/commands/`);
    console.error('Make sure the skill file exists before sending it.');
    process.exit(1);
  }

  process.stdout.write(`Sending /${skillName} to @${to}...`);

  let res;
  try {
    res = await api.send(to, skillName, found.content, cfg.token);
  } catch (e) {
    console.log(`\nError: ${e.message}`);
    process.exit(1);
  }

  if (res.status === 404) {
    console.log(`\n@${to} is not on Skills Exchange yet.`);
    process.exit(1);
  }

  // Not friends yet — auto-send a friend request and queue the skill
  if (res.status === 403) {
    console.log('');
    process.stdout.write(`  Not friends with @${to} yet. Sending friend request...`);
    try {
      const friendRes = await api.friendRequest(to, cfg.token);
      if (friendRes.body?.already_friends) {
        console.log(' (already friends — retrying send)');
        // Retry once in case of a race
        const retry = await api.send(to, skillName, found.content, cfg.token);
        if (retry.status === 200) {
          console.log(`  /${skillName} sent to @${to}`);
          notify('🤝 Skills Exchange', `/${skillName} sent to @${to}`);
          return;
        }
      } else {
        console.log(' done');
      }
    } catch { console.log(' (request failed)'); }

    const queue = readQueue();
    queue.push({ to, skillName, content: found.content, queued_at: new Date().toISOString() });
    writeQueue(queue);
    console.log(`  /${skillName} queued — will deliver once @${to} accepts your request.`);
    console.log(`  Tell @${to} to run: skillshare friends accept @${cfg.username}`);
    return;
  }

  if (res.status !== 200) {
    console.log(`\nError: ${res.body?.error || 'send failed'}`);
    process.exit(1);
  }

  console.log(' done');
  console.log(`/${skillName} sent to @${to}`);
  notify('🤝 Skills Exchange', `/${skillName} sent to @${to}`);
};

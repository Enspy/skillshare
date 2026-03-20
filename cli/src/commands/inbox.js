const config = require('../config');
const api = require('../api');

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

module.exports = async function inbox() {
  const cfg = config.requireAuth();

  let res;
  try {
    res = await api.inbox(cfg.token);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }

  if (res.status !== 200) {
    console.error(`Error: ${res.body?.error || 'could not fetch inbox'}`);
    process.exit(1);
  }

  const messages = res.body.messages || [];

  if (messages.length === 0) {
    console.log('Inbox empty. Share your username so others can send you skills!');
    return;
  }

  console.log(`\n  ⚡ Inbox for @${cfg.username} — ${messages.length} skill(s)\n`);

  for (const msg of messages) {
    console.log(`  ┌─ ⚡ /${msg.skill_name}`);
    console.log(`  │  from: @${msg.from}  ·  ${timeAgo(msg.sent_at)}`);
    console.log(`  │  id:   ${msg.id}`);
    console.log(`  └─ to install: skillshare add ${msg.id}\n`);
  }

  console.log(`  Run 'skillshare add <id>' to install a skill.`);
  console.log(`  Or inside Claude Code: /skills-add <id>\n`);
};

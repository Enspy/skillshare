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

  const all = res.body.messages || [];
  const requests = all.filter(m => m.type === 'friend_request');
  const skills   = all.filter(m => m.type === 'skill' || !m.type);

  if (all.length === 0) {
    console.log('Inbox empty. Share your username so others can send you skills!');
    return;
  }

  console.log(`\n  ⚡ Inbox for @${cfg.username}\n`);

  if (requests.length > 0) {
    console.log(`  Friend requests (${requests.length})\n`);
    for (const r of requests) {
      console.log(`  ┌─ 👤 @${r.from} wants to be friends`);
      console.log(`  │  ${timeAgo(r.sent_at)}  ·  id: ${r.id}`);
      console.log(`  ├─ accept:  skillshare friends accept @${r.from} ${r.id}`);
      console.log(`  └─ decline: skillshare friends decline @${r.from} ${r.id}\n`);
    }
  }

  if (skills.length > 0) {
    console.log(`  Skills (${skills.length})\n`);
    for (const msg of skills) {
      console.log(`  ┌─ ⚡ /${msg.skill_name}`);
      console.log(`  │  from: @${msg.from}  ·  ${timeAgo(msg.sent_at)}`);
      console.log(`  │  id:   ${msg.id}`);
      console.log(`  └─ to install: skillshare add ${msg.id}\n`);
    }
    console.log(`  Run 'skillshare add <id>' to install a skill.`);
    console.log(`  Or inside Claude Code: /skills-add <id>\n`);
  }
};

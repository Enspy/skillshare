const config = require('../config');
const api = require('../api');

async function findRequest(cfg, from) {
  const res = await api.inbox(cfg.token);
  const messages = res.body?.messages || [];
  return messages.find(m => m.type === 'friend_request' && m.from === from);
}

module.exports = async function friends(args) {
  const cfg = config.requireAuth();
  const [sub] = args;

  // skillshare friends add @username
  if (sub === 'add') {
    const to = (args[1] || '').replace(/^@/, '');
    if (!to) { console.error('Usage: skillshare friends add @username'); process.exit(1); }
    process.stdout.write(`Sending friend request to @${to}...`);
    const res = await api.friendRequest(to, cfg.token);
    if (res.body?.already_friends) { console.log(`\nYou're already friends with @${to}.`); return; }
    if (res.body?.already_sent)    { console.log(`\nRequest already sent to @${to}.`); return; }
    if (res.status === 404)        { console.log(`\n@${to} is not on Skills Exchange.`); process.exit(1); }
    if (!res.body?.ok)             { console.log(`\nError: ${res.body?.error || 'failed'}`); process.exit(1); }
    console.log(' done');
    console.log(`@${to} will see your request in their inbox.`);
    return;
  }

  // skillshare friends accept @username [request_id]
  if (sub === 'accept') {
    const from = (args[1] || '').replace(/^@/, '');
    if (!from) { console.error('Usage: skillshare friends accept @username'); process.exit(1); }
    let requestId = args[2];
    if (!requestId) {
      const req = await findRequest(cfg, from);
      if (!req) { console.error(`No pending friend request from @${from}.`); process.exit(1); }
      requestId = req.id;
    }
    const res = await api.friendAccept(requestId, from, cfg.token);
    if (!res.body?.ok) { console.log(`Error: ${res.body?.error || 'failed'}`); process.exit(1); }
    console.log(`✓ You and @${from} are now friends. You can send each other skills.`);
    return;
  }

  // skillshare friends decline @username [request_id]
  if (sub === 'decline') {
    const from = (args[1] || '').replace(/^@/, '');
    let requestId = args[2];
    if (!requestId) {
      const req = await findRequest(cfg, from);
      if (!req) { console.error(`No pending friend request from @${from}.`); process.exit(1); }
      requestId = req.id;
    }
    await api.friendDecline(requestId, cfg.token);
    console.log('Request declined.');
    return;
  }

  // skillshare friends — list
  const res = await api.friends(cfg.token);
  const list = res.body?.friends || [];
  if (list.length === 0) {
    console.log('\n  No friends yet.');
    console.log('  Add someone: skillshare friends add @username\n');
    return;
  }
  console.log(`\n  Friends (${list.length})\n`);
  for (const f of list) console.log(`  ✓ @${f}`);
  console.log('');
};

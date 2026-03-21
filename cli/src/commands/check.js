/**
 * Silent inbox check — called by the Claude Code UserPromptSubmit hook.
 * Prints nothing if inbox is empty. If there are new items, prints a single
 * line that Claude Code injects as context so Claude mentions it inline.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config');
const api = require('../api');
const notify = require('../notify');

const SEEN_FILE  = path.join(os.homedir(), '.claude', 'skills-exchange', '.seen_ids.json');
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

function readSeen() {
  try { return new Set(JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'))); } catch { return new Set(); }
}
function writeSeen(ids) {
  try { fs.writeFileSync(SEEN_FILE, JSON.stringify([...ids])); } catch {}
}

module.exports = async function check() {
  const cfg = config.read();
  if (!cfg?.token) return; // not initialized — stay silent

  let messages;
  try {
    const res = await api.inbox(cfg.token);
    messages = res.body?.messages || [];
  } catch {
    return; // network error — stay silent, don't disrupt the session
  }

  const seen = readSeen();
  const unseen = messages.filter(m => !seen.has(m.id));
  writeSeen(new Set(messages.map(m => m.id)));

  const skills   = unseen.filter(m => m.type === 'skill' || !m.type);
  const requests = unseen.filter(m => m.type === 'friend_request');

  const parts = [];
  if (skills.length === 1)
    parts.push(`@${skills[0].from} sent you the /${skills[0].skill_name} skill`);
  else if (skills.length > 1)
    parts.push(`${skills.length} new skills in your inbox`);

  if (requests.length === 1)
    parts.push(`@${requests[0].from} sent you a friend request`);
  else if (requests.length > 1)
    parts.push(`${requests.length} friend requests waiting`);

  if (parts.length > 0) {
    notify('🤝 Skills Exchange', parts.join(' · '));
  }

  // Process pending-send queue — retry any skills queued while not yet friends
  const queue = readQueue();
  if (queue.length === 0) return;

  const remaining = [];
  for (const item of queue) {
    try {
      const res = await api.send(item.to, item.skillName, item.content, cfg.token);
      if (res.status === 200) {
        notify('🤝 Skills Exchange', `/${item.skillName} delivered to @${item.to}`);
      } else {
        remaining.push(item); // still not friends or other error — keep queued
      }
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
};

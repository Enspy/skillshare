const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config');
const api = require('../api');

module.exports = async function add(args) {
  if (!args[0]) {
    console.error('Usage: skillshare add <message-id>');
    console.error("Run 'skillshare inbox' to see pending skills and their IDs.");
    process.exit(1);
  }

  const cfg = config.requireAuth();
  const msgId = args[0];

  // Fetch inbox to find the message
  let res;
  try {
    res = await api.inbox(cfg.token);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }

  const messages = res.body?.messages || [];
  const msg = messages.find((m) => m.id === msgId);

  if (!msg) {
    console.error(`Message ${msgId} not found in inbox.`);
    console.error("Run 'skillshare inbox' to list available skills.");
    process.exit(1);
  }

  // Write the skill file to ~/.claude/commands/
  const commandsDir = path.join(os.homedir(), '.claude', 'commands');
  fs.mkdirSync(commandsDir, { recursive: true });

  const safeName = msg.skill_name.replace(/[^a-z0-9_-]/g, '').slice(0, 64);
  if (!safeName) {
    console.error('Invalid skill name received — aborting install.');
    process.exit(1);
  }

  const skillFile = path.join(commandsDir, `${safeName}.md`);

  if (fs.existsSync(skillFile)) {
    console.log(`/${msg.skill_name} is already installed. Overwriting with version from @${msg.from}.`);
  }

  fs.writeFileSync(skillFile, msg.skill_content);
  fs.chmodSync(skillFile, 0o644);

  // Remove the message from inbox
  try {
    await api.deleteMessage(msgId, cfg.token);
  } catch {
    // non-fatal — skill is installed even if cleanup fails
  }

  console.log(`⚡ /${safeName} installed to ~/.claude/commands/${safeName}.md`);
  console.log(`   Shared by @${msg.from}`);
  console.log(`   Use it now: /${msg.skill_name}`);
};

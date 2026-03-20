/**
 * Copies the Claude Code slash command .md files into ~/.claude/commands/
 * so that /skills-send, /skills-inbox etc. work inside Claude Code sessions.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const COMMANDS_SRC = path.resolve(__dirname, '../../commands');
const COMMANDS_DEST = path.join(os.homedir(), '.claude', 'commands');

function installCommands() {
  fs.mkdirSync(COMMANDS_DEST, { recursive: true });

  const files = fs.readdirSync(COMMANDS_SRC).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    fs.copyFileSync(path.join(COMMANDS_SRC, file), path.join(COMMANDS_DEST, file));
  }
  return files.map((f) => '/' + f.replace('.md', ''));
}

function uninstallCommands() {
  const files = fs.readdirSync(COMMANDS_SRC).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const dest = path.join(COMMANDS_DEST, file);
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
  }
}

module.exports = { installCommands, uninstallCommands };

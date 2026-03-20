The user wants to send a Claude Code skill to another user via Skills Exchange.

Run this command, using the arguments the user provided (e.g. "@devdan /polish"):

```bash
skillshare send $ARGUMENTS
```

Show the output. If it succeeds, confirm that the skill was delivered.

If the skill file is not found locally, explain that the skill must exist in `~/.claude/commands/` before it can be sent. List what skills are available:

```bash
ls ~/.claude/commands/*.md | xargs -I{} basename {} .md
```

If `skillshare` is not installed, tell the user to run:

```bash
curl -fsSL https://raw.githubusercontent.com/Enspy/skillshare/main/install.sh | bash
```

The user wants to install a skill from their Skills Exchange inbox.

Run this command with the message ID they provided:

```bash
skillshare add $ARGUMENTS
```

Show the output. If the skill is installed successfully, confirm which file was written to `~/.claude/commands/` and tell the user they can use it immediately with `/<skillname>`.

If no ID was provided, first show their inbox:

```bash
skillshare inbox
```

Then ask which skill they want to add.

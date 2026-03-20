The user wants to send one of their Claude Code skills to another user via Skills Exchange.

Parse the arguments naturally — they might say "@alex /polish", "send polish to alex", "@alex polish", or similar. Extract the recipient username and skill name.

Run:

```bash
skillshare send @<username> /<skillname>
```

If you're not sure which skill they mean, first list available skills:

```bash
ls ~/.claude/commands/*.md 2>/dev/null | xargs -I{} basename {} .md
```

Then pick the closest match to what they said and confirm before sending if it's ambiguous.

If the send fails because you're not friends with the recipient, explain they need to add each other first:

```bash
skillshare friends add @<username>
```

If `skillshare` is not installed, tell the user to run `npm install -g skillshare-cc`.

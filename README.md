# skillshare-cc

Send and receive Claude Code skills with other users.

```bash
skillshare send @devdan /polish
⚡ /polish sent to @devdan
```

## Install

```bash
npm install -g skillshare-cc
```

Then open the menu bar app:

```bash
cd electron && npm install && npm start
```

Click `⚡` in your menu bar, choose a username, and you're set up. Your slash commands (`/skills-send`, `/skills-inbox`, etc.) are installed automatically.

## Menu bar

The `⚡` icon lives in your menu bar. Click it to:

- See skills waiting in your inbox and install them with one click
- Send one of your skills to another user
- Sync your skill list so others can see what you have

## Terminal

You can also do everything from the terminal:

```bash
skillshare send @username /skillname   # send a skill
skillshare inbox                       # check what's waiting
skillshare who @username               # see someone's skill list
skillshare sync                        # publish your skill list
```

## How it works

Skills are Claude Code slash commands — markdown files in `~/.claude/commands/`. When you send a skill, the file content is delivered to the recipient's inbox. When they install it, it's written to their `~/.claude/commands/` and available immediately as a slash command.

## Self-hosting the backend

The backend is a Cloudflare Worker. To run your own:

```bash
cd backend
npm install
npx wrangler kv:namespace create USERS
npx wrangler kv:namespace create INBOX
# paste the IDs into wrangler.toml
npx wrangler deploy
skillshare config set api_url https://your-worker.workers.dev
```

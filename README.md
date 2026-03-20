# Skills Exchange for Claude Code

Send and receive Claude Code skills with other users directly from your terminal — no separate app, no context switching.

```
/skills-send @devdan /polish
⚡ /polish sent to @devdan
```

## How it works

Skills Exchange adds four slash commands to your Claude Code setup. Under the hood it's a tiny CLI (`skillshare`) + a Cloudflare Worker registry. Your skills stay as local markdown files; the server only stores metadata and delivers inbound skills to your inbox.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/Enspy/skillshare/main/install.sh | bash
```

Then from inside Claude Code:

```
/skills-init
```

That's it. You'll be prompted to pick a username and the four commands will be installed.

## Commands

| Command | What it does |
|---|---|
| `/skills-init` | Claim your username and install everything |
| `/skills-send @user /skillname` | Send one of your skills to another user |
| `/skills-inbox` | Check what skills people have sent you |
| `/skills-who @user` | See a user's profile and skill list |
| `/skills-add skillname` | Install a skill from your inbox |

You can also use the CLI directly outside of Claude Code:

```bash
skillshare send @devdan /polish
skillshare inbox
skillshare who @maya_chen
skillshare sync          # push your local skill list to the registry
```

## Self-hosting the backend

The backend is a Cloudflare Worker. Deploy your own:

```bash
cd backend
npm install
npx wrangler kv:namespace create USERS
npx wrangler kv:namespace create INBOX
# paste the IDs into wrangler.toml
npx wrangler deploy
```

Then point the CLI at it:

```bash
skillshare config set api_url https://your-worker.workers.dev
```

## Project structure

```
backend/          Cloudflare Worker (REST API + KV)
cli/              Node.js CLI, zero external dependencies
commands/         Claude Code slash command definitions (.md files)
install.sh        One-line installer
```

# skillshare-cc

Send and receive Claude Code skills with other users — straight from your terminal.

```
/skills-send @devdan /polish
⚡ /polish sent to @devdan
```

Optionally pairs with a macOS menu bar widget that notifies you when skills arrive and lets you install them in one click.

## Install

```bash
npm install -g skillshare-cc
skillshare init
```

That's it. `init` claims your username and adds five slash commands to Claude Code.

## Usage

Inside Claude Code:

```
/skills-send @username /skillname   send one of your skills
/skills-inbox                       see skills people sent you
/skills-add <id>                    install a skill from your inbox
/skills-who @username               look up someone's skill list
```

Or from your terminal directly:

```bash
skillshare send @username /skillname
skillshare inbox
skillshare sync    # publish your skill list so others can see it
```

## Menu bar widget (macOS)

Requires [SwiftBar](https://swiftbar.app) (free).

```bash
skillshare swiftbar
```

Shows `⚡` in your menu bar. Turns yellow with a count when skills are waiting. One-click to install.

## Self-hosting

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

#!/usr/bin/env node
'use strict';

const [, , command, ...args] = process.argv;

const HELP = `
  ⚡ skillshare — Claude Code Skills Exchange

  Usage: skillshare <command> [options]

  Commands:
    init              Claim your username and install Claude Code slash commands
    init --reset      Re-register with a new username
    send @user /skill Send one of your skills to a friend
    inbox             List skills and friend requests waiting for you
    add <id>          Install a skill from your inbox
    friends           List your friends
    friends add @user Send a friend request
    friends accept @user <id>  Accept a friend request
    friends decline @user <id> Decline a friend request
    app               Launch the menu bar app
    config get [key]  Show configuration
    config set k v    Set a config value (e.g. api_url)

  Inside Claude Code you can also use:
    /skills-init
    /skills-send @user /skillname
    /skills-inbox
    /skills-add <id>
`;

async function main() {
  switch (command) {
    case 'init': {
      const usernameFlag = args.find(a => a.startsWith('--username='));
      const presetUsername = usernameFlag ? usernameFlag.split('=')[1] : null;
      await require('../src/commands/init')({ reset: args.includes('--reset'), username: presetUsername });
      break;
    }

    case 'send':
      await require('../src/commands/send')(args);
      break;

    case 'inbox':
      await require('../src/commands/inbox')();
      break;

    case 'add':
      await require('../src/commands/add')(args);
      break;

    case 'friends':
      await require('../src/commands/friends')(args);
      break;

    case 'check':
      await require('../src/commands/check')();
      break;

    case 'app':
      require('../src/commands/app')();
      break;

    case 'config':
      require('../src/commands/config-cmd')(args);
      break;

    case '--help':
    case '-h':
    case 'help':
      console.log(HELP);
      break;

    case undefined: {
      const config = require('../src/config');
      const cfg = config.read();
      if (!cfg) {
        await require('../src/commands/init')({});
      } else {
        console.log(`\n  Skills Exchange — @${cfg.username}\n`);
        console.log('  skillshare app                      open the menu bar widget');
        console.log('  skillshare send @user /skill        send a skill to a friend');
        console.log('  skillshare friends add @user        add a friend');
        console.log('  skillshare inbox                    check inbox\n');
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

#!/usr/bin/env node
'use strict';

const [, , command, ...args] = process.argv;

const HELP = `
  ⚡ skillshare — Claude Code Skills Exchange

  Usage: skillshare <command> [options]

  Commands:
    init              Claim your username and install Claude Code slash commands
    init --reset      Re-register with a new username
    send @user /skill Send one of your skills to another user
    inbox             List skills others have sent you
    add <id>          Install a skill from your inbox
    who @user         Look up a user's profile and skill list
    sync              Push your local skill list to the registry
    friends           List your friends
    friends add @user Send a friend request
    friends accept @user <id>  Accept a friend request
    friends decline @user <id> Decline a friend request
    app               Launch the menu bar app
    swiftbar          Install the macOS menu bar widget (requires SwiftBar)
    swiftbar uninstall  Remove the menu bar widget
    config get [key]  Show configuration
    config set k v    Set a config value (e.g. api_url)

  Inside Claude Code you can also use:
    /skills-init
    /skills-send @user /skillname
    /skills-inbox
    /skills-who @user
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

    case 'who':
      await require('../src/commands/who')(args);
      break;

    case 'sync':
      await require('../src/commands/sync')();
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

    case 'swiftbar':
      await require('../src/commands/swiftbar')(args);
      break;

    case 'config':
      require('../src/commands/config-cmd')(args);
      break;

    case '--help':
    case '-h':
    case 'help':
    case undefined:
      console.log(HELP);
      break;

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

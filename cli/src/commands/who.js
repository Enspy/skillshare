const api = require('../api');

module.exports = async function who(args) {
  if (!args[0]) {
    console.error('Usage: skillshare who @username');
    process.exit(1);
  }

  const username = args[0].replace(/^@/, '');

  let res;
  try {
    res = await api.getUser(username);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }

  if (res.status === 404) {
    console.log(`@${username} is not on Skills Exchange.`);
    return;
  }

  if (res.status !== 200) {
    console.error(`Error: ${res.body?.error || 'lookup failed'}`);
    process.exit(1);
  }

  const user = res.body;
  const joined = new Date(user.registered_at).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  console.log(`\n  @${user.username}  ·  joined ${joined}  ·  ${user.skills.length} skill(s)\n`);

  if (user.skills.length === 0) {
    console.log("  No skills listed yet. They haven't run 'skillshare sync'.\n");
  } else {
    for (const skill of user.skills) {
      console.log(`  ⚡ /${skill}`);
    }
    console.log('');
    console.log(`  Send a skill: skillshare send @${user.username} /skillname`);
    console.log('');
  }
};

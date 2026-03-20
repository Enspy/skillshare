const config = require('../config');

module.exports = function configCmd(args) {
  const [action, key, value] = args;

  if (action === 'get') {
    const cfg = config.read();
    if (!cfg) { console.log('Not initialized.'); return; }
    if (key) {
      console.log(cfg[key] ?? '(not set)');
    } else {
      // print everything except the token secret
      const display = { ...cfg, token: cfg.token ? '***' : null };
      console.log(JSON.stringify(display, null, 2));
    }
    return;
  }

  if (action === 'set') {
    if (!key || value === undefined) {
      console.error('Usage: skillshare config set <key> <value>');
      process.exit(1);
    }
    const cfg = config.read() || {};
    cfg[key] = value;
    config.write(cfg);
    console.log(`Set ${key} = ${value}`);
    return;
  }

  console.log('Usage: skillshare config get [key]');
  console.log('       skillshare config set <key> <value>');
  console.log('\nKeys: api_url, username');
};

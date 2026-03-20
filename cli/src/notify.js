'use strict';

const { execSync } = require('child_process');

function notify(title, message) {
  try {
    const t = title.replace(/'/g, '\u2019');
    const m = message.replace(/'/g, '\u2019');
    execSync(`osascript -e 'display notification "${m}" with title "${t}" sound name "Funk"'`, {
      stdio: 'ignore',
      timeout: 3000,
    });
  } catch {}
}

module.exports = notify;

const { execFileSync } = require('child_process');
const path = require('path');

module.exports = function launchApp() {
  const appDir = path.join(__dirname, '../../app');

  try {
    execFileSync('npx', ['electron', appDir], {
      stdio: 'ignore',
      detached: true,
    }).unref?.();
  } catch {
    // npx electron launches async and exits the shell — this is expected
  }

  console.log('⚡ Skills Exchange launching in your menu bar...');
};

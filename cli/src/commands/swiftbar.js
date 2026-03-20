const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { execSync } = require('child_process');

const PLUGIN_SRC = path.resolve(__dirname, '../../swiftbar/skillshare.1m.js');

// SwiftBar lets users pick any folder; check common locations
function findPluginsDir() {
  const candidates = [
    path.join(os.homedir(), 'Library', 'Application Support', 'SwiftBar', 'Plugins'),
    path.join(os.homedir(), 'SwiftBar'),
    path.join(os.homedir(), 'Documents', 'SwiftBar'),
  ];

  // Also check SwiftBar's saved preference
  try {
    const plist = execSync(
      'defaults read com.ameba.SwiftBar PluginDirectory 2>/dev/null',
      { encoding: 'utf8' }
    ).trim();
    if (plist) candidates.unshift(plist);
  } catch {}

  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

module.exports = async function swiftbar(args) {
  const [sub] = args;

  if (sub === 'uninstall') {
    const dir = findPluginsDir();
    if (!dir) { console.log('SwiftBar plugins directory not found.'); return; }
    const dest = path.join(dir, 'skillshare.1m.js');
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
      console.log('SwiftBar plugin removed.');
    } else {
      console.log('Plugin not installed.');
    }
    return;
  }

  // Install
  let pluginsDir = findPluginsDir();

  if (!pluginsDir) {
    console.log('\n  SwiftBar plugins directory not found.');
    console.log('  Make sure SwiftBar is installed and has been opened at least once.');
    console.log('\n  Download SwiftBar: https://swiftbar.app\n');

    // Offer manual path
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(r => rl.question('  Enter your SwiftBar plugins folder path (or press Enter to skip): ', r));
    rl.close();

    const manual = answer.trim().replace(/^~/, os.homedir());
    if (!manual) { console.log('Skipped.'); return; }
    if (!fs.existsSync(manual)) {
      console.error(`  Path does not exist: ${manual}`);
      process.exit(1);
    }
    pluginsDir = manual;
  }

  const dest = path.join(pluginsDir, 'skillshare.1m.js');
  fs.copyFileSync(PLUGIN_SRC, dest);
  fs.chmodSync(dest, 0o755);

  console.log('\n  ⚡ SwiftBar plugin installed\n');
  console.log(`  Location: ${dest}`);
  console.log('  Refreshes every 1 minute automatically.\n');
  console.log('  If SwiftBar is running, click its menu bar icon → Refresh All.\n');

  // Offer to refresh SwiftBar immediately
  try {
    execSync('open -g "swiftbar://refreshPlugin?name=skillshare.1m.js"', { stdio: 'ignore' });
  } catch {}
};

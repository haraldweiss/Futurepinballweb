#!/usr/bin/env node

/**
 * Future Pinball Web - Cross-Platform Startup Script
 * Usage: node start-game.js [1|2|3|auto] [port]
 * or:    npm start -- [1|2|3|auto] [port]
 *
 * Examples:
 *   node start-game.js           # Auto-detect screens
 *   node start-game.js 1         # Single screen
 *   node start-game.js 3         # Triple screen
 *   node start-game.js 2 8080    # Dual screen on port 8080
 */

import { spawn, execSync } from 'child_process';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { platform } from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Parse arguments ───
const SCREENS = process.argv[2] || 'auto';
const PORT_ARG = process.argv[3] || '5173';
if (!/^\d+$/.test(PORT_ARG) || +PORT_ARG < 1024 || +PORT_ARG > 65535) {
  console.error(`✗ Invalid port: ${PORT_ARG} (expected integer 1024-65535)`);
  process.exit(1);
}
const PORT = parseInt(PORT_ARG, 10);
const BASE_URL = `http://localhost:${PORT}`;
const PLATFORM = platform();

// ─── Validate screen count ───
if (!['1', '2', '3', 'auto'].includes(SCREENS)) {
  console.error(`✗ Invalid screen count: ${SCREENS}`);
  console.error('  Usage: node start-game.js [1|2|3|auto] [port]');
  process.exit(1);
}

// ─── Colors for console output ───
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(symbol, msg, color = 'reset') {
  console.log(`${colors[color]}${symbol}${colors.reset} ${msg}`);
}

// ─── Print header ───
console.log('');
log('', '╔════════════════════════════════════════════════════════════════════╗', 'cyan');
log('', '║                  Future Pinball Web - Game Startup                 ║', 'cyan');
log('', '╚════════════════════════════════════════════════════════════════════╝', 'cyan');
console.log('');

// ─── Print configuration ───
const screenDisplay = SCREENS === 'auto' ? 'AUTO-DETECT' : `${SCREENS} screen(s)`;
log('✓', `Screen mode: ${screenDisplay}`, 'green');
log('✓', `Base URL: ${BASE_URL}`, 'green');
log('✓', `Platform: ${PLATFORM}`, 'green');
console.log('');

// ─── Check if port is open (available) ───
function isPortOpen(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', (err) => {
      // Port is in use if EADDRINUSE error
      if (err.code === 'EADDRINUSE') {
        resolve(false);  // Port is NOT available (in use)
      } else {
        // Other errors - port might not be available
        resolve(false);
      }
    });
    server.once('listening', () => {
      // Port is available if we can listen on it
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

// ─── Open browser ───
// Uses spawn (no shell) so URL never goes through a shell parser. URL is
// already controlled (built from validated PORT + literal query string), but
// keeping the no-shell discipline prevents future regressions.
function openBrowser(url) {
  let cmd, args;
  switch (PLATFORM) {
    case 'darwin':
      cmd = 'open'; args = [url]; break;
    case 'win32':
      // start.exe is a cmd.exe builtin; the empty "" is the window title slot
      cmd = 'cmd'; args = ['/c', 'start', '""', url]; break;
    case 'linux':
      cmd = 'xdg-open'; args = [url]; break;
    default:
      log('⚠', `Open manually: ${url}`, 'yellow');
      return;
  }

  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', (err) => {
      log('⚠', `Could not open browser (${err.code || err.message}). Open manually: ${url}`, 'yellow');
    });
    child.unref();
    log('✓', `Browser opened: ${url}`, 'green');
  } catch (err) {
    log('⚠', `Open manually: ${url} — ${err.message}`, 'yellow');
  }
}

// ─── Main execution ───
async function main() {
  // Check if port is open
  const portOpen = await isPortOpen(PORT);

  if (!portOpen) {
    log('🚀', `Starting Vite dev server on port ${PORT}...`, 'yellow');

    // Start dev server
    const devServer = spawn('npm', ['run', 'dev'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });

    // Log server output
    devServer.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg.includes('VITE') || msg.includes('ready')) {
        log('ℹ', msg, 'blue');
      }
    });

    devServer.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg.includes('error') || msg.includes('Error')) {
        log('✗', msg, 'yellow');
      }
    });

    devServer.unref();

    // Wait for server to start
    log('⏳', 'Waiting for server to start...', 'yellow');
    for (let i = 0; i < 30; i++) {
      if (await isPortOpen(PORT)) {
        log('✓', 'Dev server started', 'green');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } else {
    log('✓', `Dev server already running on port ${PORT}`, 'green');
  }

  console.log('');

  // Open browser windows based on screen count
  if (SCREENS === '1') {
    log('🎮', 'Launching single-screen mode...', 'cyan');
    log('', '→ Main playfield window opening...', 'cyan');
    const url = `${BASE_URL}/?screens=1`;
    openBrowser(url);

  } else if (SCREENS === '2') {
    log('🎮', 'Launching dual-screen mode...', 'cyan');
    log('', '→ Screen 1 (Playfield) opening...', 'cyan');
    log('', '→ Screen 2 (Backglass) opening...', 'cyan');

    await sleep(2000);
    const url1 = `${BASE_URL}/?screens=2&screen=1`;
    openBrowser(url1);

    await sleep(1000);
    const url2 = `${BASE_URL}/?screens=2&screen=2`;
    openBrowser(url2);

  } else if (SCREENS === '3') {
    log('🎮', 'Launching triple-screen mode...', 'cyan');
    log('', '→ Screen 1 (Left playfield) opening...', 'cyan');
    log('', '→ Screen 2 (Center playfield) opening...', 'cyan');
    log('', '→ Screen 3 (Backglass) opening...', 'cyan');

    await sleep(2000);
    const url1 = `${BASE_URL}/?screens=3&screen=1`;
    openBrowser(url1);

    await sleep(1000);
    const url2 = `${BASE_URL}/?screens=3&screen=2`;
    openBrowser(url2);

    await sleep(1000);
    const url3 = `${BASE_URL}/?screens=3&screen=3`;
    openBrowser(url3);

  } else { // auto
    log('🎮', 'Launching with auto-detect...', 'cyan');
    log('', '→ Main window opening (screen count will auto-detect)...', 'cyan');
    const url = `${BASE_URL}/?screens=auto`;
    openBrowser(url);
  }

  // Print footer
  console.log('');
  log('', '╔════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('', '║ ✓ Game startup complete!                                           ║', 'cyan');
  log('', '╠════════════════════════════════════════════════════════════════════╣', 'cyan');
  log('', '║                                                                    ║', 'cyan');
  log('', '║ Controls:                                                          ║', 'cyan');
  log('', '║   Z / M         - Left / Right Flipper                             ║', 'cyan');
  log('', '║   SPACE         - Tilt                                             ║', 'cyan');
  log('', '║   ENTER         - Launch Ball                                      ║', 'cyan');
  log('', '║   P             - Performance Monitor                              ║', 'cyan');
  log('', '║   1, 2, 3       - Quality Presets (Low, Medium, High, Ultra)       ║', 'cyan');
  log('', '║   ESC           - Exit / Return to Menu                            ║', 'cyan');
  log('', '║                                                                    ║', 'cyan');
  log('', '║ Multi-Screen Tips:                                                 ║', 'cyan');
  log('', '║   • Use for arcade cabinet setup with multiple displays            ║', 'cyan');
  log('', '║   • Each screen runs in separate browser window                    ║', 'cyan');
  log('', '║   • Sync via BroadcastChannel API (same-origin only)               ║', 'cyan');
  log('', '║   • Full-screen each window for best cabinet experience            ║', 'cyan');
  log('', '║                                                                    ║', 'cyan');
  log('', '╚════════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');
}

// ─── Utility functions ───
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run main
main().catch(err => {
  log('✗', `Error: ${err.message}`, 'yellow');
  process.exit(1);
});

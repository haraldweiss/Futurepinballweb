#!/usr/bin/env node

/**
 * Future Pinball Web — Cross-Platform Startup
 *
 * Usage:
 *   node start-game.js                  # auto-detect (recommended)
 *   node start-game.js auto             # same as above
 *   node start-game.js 1                # force single-screen hint
 *   node start-game.js 2                # force dual-screen hint
 *   node start-game.js 3                # force triple-screen hint
 *   node start-game.js auto 8080        # custom port
 *
 * Behaviour:
 *   - Starts the Vite dev server on the requested port if it isn't
 *     already running, and saves the PID to .fpw-server.pid so
 *     stop-game can shut it down cleanly.
 *   - Tries to detect the OS-level screen count for an informational
 *     log line, then opens ONE browser window with ?screens=<hint>.
 *   - The browser-side multi-screen layout system reads the hint and
 *     spawns role-specific child windows (backglass, DMD) onto the
 *     extra screens via window.open + Window Management API. We do
 *     NOT pre-open N windows from the launcher — that path produced
 *     N uncoordinated copies of the playfield.
 */

import { spawn, spawnSync, execSync } from 'child_process';
import { createServer } from 'http';
import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { platform } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PID_FILE = resolve(__dirname, '.fpw-server.pid');

// ─── Parse arguments ───
const SCREENS_ARG = process.argv[2] || 'auto';
const PORT_ARG    = process.argv[3] || '5173';

if (!['1', '2', '3', 'auto'].includes(SCREENS_ARG)) {
  console.error(`✗ Invalid screen hint: ${SCREENS_ARG}`);
  console.error('  Usage: node start-game.js [1|2|3|auto] [port]');
  process.exit(1);
}
if (!/^\d+$/.test(PORT_ARG) || +PORT_ARG < 1024 || +PORT_ARG > 65535) {
  console.error(`✗ Invalid port: ${PORT_ARG} (expected integer 1024-65535)`);
  process.exit(1);
}

const SCREENS  = SCREENS_ARG;
const PORT     = parseInt(PORT_ARG, 10);
const BASE_URL = `http://localhost:${PORT}`;
const PLATFORM = platform();

// ─── Console output ───
const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', red: '\x1b[31m',
};
const log = (symbol, msg, color = 'reset') =>
  console.log(`${colors[color]}${symbol}${colors.reset} ${msg}`);

console.log('');
log('', '╔════════════════════════════════════════════════════════════════════╗', 'cyan');
log('', '║                  Future Pinball Web — Game Startup                 ║', 'cyan');
log('', '╚════════════════════════════════════════════════════════════════════╝', 'cyan');
console.log('');

// ─── OS-level screen detection (informational) ───
function detectScreens() {
  try {
    if (PLATFORM === 'darwin') {
      const out = execSync('system_profiler SPDisplaysDataType 2>/dev/null', { encoding: 'utf8' });
      const matches = out.match(/Resolution:\s*\d+\s*x\s*\d+/g);
      return matches ? matches.length : 1;
    }
    if (PLATFORM === 'linux') {
      const out = execSync('xrandr 2>/dev/null | grep " connected" | wc -l', { encoding: 'utf8', shell: '/bin/sh' });
      return parseInt(out.trim(), 10) || 1;
    }
    if (PLATFORM === 'win32') {
      const r = spawnSync('powershell', [
        '-NoProfile', '-Command',
        'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::AllScreens.Length',
      ], { encoding: 'utf8' });
      return parseInt((r.stdout || '').trim(), 10) || 1;
    }
  } catch { /* fall through */ }
  return 1;
}

const detectedScreens = detectScreens();
const effectiveHint   = SCREENS === 'auto' ? 'auto' : SCREENS;

log('✓', `Screen hint: ${effectiveHint}${SCREENS === 'auto' ? ` (OS reports ${detectedScreens} display${detectedScreens === 1 ? '' : 's'})` : ''}`, 'green');
log('✓', `Base URL:    ${BASE_URL}`, 'green');
log('✓', `Platform:    ${PLATFORM}`, 'green');
console.log('');

// ─── Port probe ───
function isPortFree(port) {
  return new Promise((resolveP) => {
    const server = createServer();
    server.once('error', () => resolveP(false));
    server.once('listening', () => server.close(() => resolveP(true)));
    server.listen(port, '127.0.0.1');
  });
}

// ─── Open browser (no shell, layout-independent) ───
function openBrowser(url) {
  let cmd, args;
  switch (PLATFORM) {
    case 'darwin':  cmd = 'open';     args = [url]; break;
    case 'win32':   cmd = 'cmd';      args = ['/c', 'start', '""', url]; break;
    case 'linux':   cmd = 'xdg-open'; args = [url]; break;
    default:
      log('⚠', `Open manually: ${url}`, 'yellow');
      return;
  }
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', (err) => log('⚠', `Could not open browser (${err.code || err.message}). Open manually: ${url}`, 'yellow'));
    child.unref();
    log('✓', `Browser opened: ${url}`, 'green');
  } catch (err) {
    log('⚠', `Open manually: ${url} — ${err.message}`, 'yellow');
  }
}

// ─── Main ───
async function main() {
  let devServer = null;
  const portFree = await isPortFree(PORT);

  if (portFree) {
    log('🚀', `Starting Vite dev server on port ${PORT}...`, 'yellow');
    devServer = spawn('npm', ['run', 'dev'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
      env: { ...process.env, PORT: String(PORT) },
    });

    writeFileSync(PID_FILE, String(devServer.pid), 'utf8');
    devServer.stdout.on('data', (d) => {
      const msg = d.toString().trim();
      if (msg.match(/VITE|ready|Local:/)) log('ℹ', msg, 'blue');
    });
    devServer.stderr.on('data', (d) => {
      const msg = d.toString().trim();
      if (msg.match(/error/i)) log('✗', msg, 'red');
    });
    devServer.unref();

    log('⏳', 'Waiting for server...', 'yellow');
    for (let i = 0; i < 30; i++) {
      if (!(await isPortFree(PORT))) { log('✓', 'Dev server started', 'green'); break; }
      await new Promise(r => setTimeout(r, 1000));
    }
    if (await isPortFree(PORT)) {
      log('✗', 'Dev server failed to start within 30s', 'red');
      process.exit(1);
    }
  } else {
    log('✓', `Dev server already running on port ${PORT}`, 'green');
  }

  console.log('');
  log('🎮', 'Opening primary window — the app will spawn role-specific', 'cyan');
  log('  ', 'windows (backglass, DMD) onto extra screens automatically.', 'cyan');
  console.log('');

  const url = `${BASE_URL}/?screens=${SCREENS}`;
  openBrowser(url);

  // Footer
  console.log('');
  log('', '╔════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('', '║ ✓ Startup complete                                                 ║', 'cyan');
  log('', '╠════════════════════════════════════════════════════════════════════╣', 'cyan');
  log('', '║ Controls                                                           ║', 'cyan');
  log('', '║   Z / M           Left / Right Flipper                             ║', 'cyan');
  log('', '║   SPACE           Tilt        ENTER  Launch Ball                   ║', 'cyan');
  log('', '║   1 / 2 / 3 / 4   Quality presets (Low / Medium / High / Ultra)    ║', 'cyan');
  log('', '║   P               Performance monitor                              ║', 'cyan');
  log('', '║   ESC             Exit / Return to Menu                            ║', 'cyan');
  log('', '║                                                                    ║', 'cyan');
  log('', '║ Multi-screen                                                       ║', 'cyan');
  log('', '║   The first time the page asks for "Window Management" permission, ║', 'cyan');
  log('', '║   grant it — that lets the app place the backglass and DMD windows ║', 'cyan');
  log('', '║   on the correct displays of your cabinet automatically.           ║', 'cyan');
  log('', '║                                                                    ║', 'cyan');
  log('', '║ To stop the server                                                 ║', 'cyan');
  log('', '║   Press Ctrl+C in this terminal, or run: npm run stop              ║', 'cyan');
  log('', '╚════════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');

  // ─── Graceful shutdown ───
  // If we started the server in this process, stay attached so Ctrl+C
  // terminates both the launcher and the Vite child. If the server was
  // already running, exit immediately and leave it alone.
  if (devServer) {
    const cleanup = () => {
      try { if (existsSync(PID_FILE)) unlinkSync(PID_FILE); } catch { /* ignore */ }
      try { process.kill(-devServer.pid, 'SIGTERM'); } catch { /* ignore */ }
      process.exit(0);
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    log('ℹ', 'Press Ctrl+C to stop the dev server.', 'yellow');
  }
}

main().catch((err) => {
  log('✗', `Error: ${err.message}`, 'red');
  process.exit(1);
});

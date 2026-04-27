#!/usr/bin/env node

/**
 * Future Pinball Web — Cross-Platform Stop
 *
 * Usage:
 *   node stop-game.js          # graceful stop of the dev server
 *   node stop-game.js --port 5173   # also kill anything on this port
 *   node stop-game.js --force  # SIGKILL instead of SIGTERM
 *
 * Strategy:
 *   1. Read .fpw-server.pid (written by start-game.js).
 *   2. Send SIGTERM to that PID's process group (so any npm/vite
 *      children also exit). On Windows, use `taskkill /T`.
 *   3. If that fails or the file is missing, fall back to killing
 *      whatever is listening on the requested port.
 */

import { existsSync, readFileSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { platform } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PID_FILE  = resolve(__dirname, '.fpw-server.pid');
const PLATFORM  = platform();

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const PORT  = (() => {
  const i = args.indexOf('--port');
  return i >= 0 && args[i + 1] ? parseInt(args[i + 1], 10) : 5173;
})();

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', cyan: '\x1b[36m',
};
const log = (sym, msg, c = 'reset') => console.log(`${colors[c]}${sym}${colors.reset} ${msg}`);

function killByPid(pid) {
  if (PLATFORM === 'win32') {
    execSync(`taskkill /T ${FORCE ? '/F ' : ''}/PID ${pid}`, { stdio: 'pipe' });
    return;
  }
  // Unix: negative pid = process group (so Vite's children die too)
  try {
    process.kill(-pid, FORCE ? 'SIGKILL' : 'SIGTERM');
  } catch (e) {
    // Group kill can fail if it isn't a session leader; fall back to single-pid.
    if (e.code === 'ESRCH' || e.code === 'EPERM') {
      process.kill(pid, FORCE ? 'SIGKILL' : 'SIGTERM');
    } else {
      throw e;
    }
  }
}

function findPidOnPort(port) {
  try {
    if (PLATFORM === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      // Pick the first LISTENING line; PID is the last column.
      const line = out.split(/\r?\n/).find(l => /LISTENING/i.test(l));
      if (!line) return null;
      const cols = line.trim().split(/\s+/);
      return parseInt(cols[cols.length - 1], 10) || null;
    }
    // macOS / Linux
    const out = execSync(`lsof -t -i :${port} -sTCP:LISTEN`, { encoding: 'utf8' });
    return parseInt(out.trim().split(/\r?\n/)[0], 10) || null;
  } catch {
    return null;
  }
}

let stopped = false;

if (existsSync(PID_FILE)) {
  const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim(), 10);
  if (Number.isFinite(pid) && pid > 1) {
    try {
      killByPid(pid);
      log('✓', `Sent ${FORCE ? 'SIGKILL' : 'SIGTERM'} to PID ${pid}`, 'green');
      stopped = true;
    } catch (e) {
      log('⚠', `Could not kill PID ${pid}: ${e.message}`, 'yellow');
    }
  }
  try { unlinkSync(PID_FILE); } catch { /* ignore */ }
}

if (!stopped) {
  const portPid = findPidOnPort(PORT);
  if (portPid) {
    try {
      killByPid(portPid);
      log('✓', `Sent ${FORCE ? 'SIGKILL' : 'SIGTERM'} to PID ${portPid} (was listening on :${PORT})`, 'green');
      stopped = true;
    } catch (e) {
      log('⚠', `Could not kill PID ${portPid}: ${e.message}`, 'yellow');
    }
  }
}

if (!stopped) {
  log('ℹ', `No running Future Pinball dev server found (no .fpw-server.pid, nothing on :${PORT}).`, 'cyan');
  process.exit(0);
}

log('✓', 'Stopped. Browser windows are not closed automatically — close them manually.', 'green');

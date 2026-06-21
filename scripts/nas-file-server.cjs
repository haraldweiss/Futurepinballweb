#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * NAS File Server — Local HTTP server for Future Pinball Web
 *
 * Serves FPL/FPT/FPM files from the NAS mount point over HTTP with CORS.
 * Run this on the Mac that has the NAS mounted:
 *
 *   node scripts/nas-file-server.cjs [--port 4157] [--nas-path /Volumes/...]
 *
 * The web app at futurepinball.wolfinisoftware.de can then fetch files
 * from http://localhost:4157/ via the NAS source module.
 *
 * Endpoints:
 *   GET  /api/health            → { status, path, fileCount, fplCount, fptCount }
 *   GET  /api/list              → { entries: [{name, path, isDir, size, ext}] }
 *   GET  /api/list?dir=subpath  → list subdirectory
 *   GET  /api/file?path=...     → serve file binary
 *   GET  /api/search?q=fpl      → search files by pattern
 *   GET  /api/stat              → path stats
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv.find(a => a.startsWith('--port='))?.split('=')[1] || process.env.NAS_PORT || '4157', 10);
const NAS_PATH = process.argv.find(a => a.startsWith('--nas-path='))?.split('=')[1]
  || process.env.NAS_PATH
  || '/Volumes/WindowsBackup/Vpin Backup Atgames 4kP/FuturePinball';

const ALLOWED_EXTENSIONS = new Set(['.fpl', '.fpt', '.fpm', '.bmp', '.png', '.jpg', '.jpeg', '.cfg']);
const MIME_TYPES = {
  '.fpl': 'application/octet-stream',
  '.fpt': 'application/octet-stream',
  '.fpm': 'application/octet-stream',
  '.bmp': 'image/bmp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.cfg': 'text/plain',
  '.json': 'application/json',
};

let cachedStats = null;
let lastStatTime = 0;

function scanDir(dirPath) {
  let counts = { fileCount: 0, fplCount: 0, fptCount: 0, fpmCount: 0 };
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile()) {
        const ext = path.extname(e.name).toLowerCase();
        counts.fileCount++;
        if (ext === '.fpl') counts.fplCount++;
        else if (ext === '.fpt') counts.fptCount++;
        else if (ext === '.fpm') counts.fpmCount++;
      } else if (e.isDirectory()) {
        const sub = scanDir(path.join(dirPath, e.name));
        counts.fileCount += sub.fileCount;
        counts.fplCount += sub.fplCount;
        counts.fptCount += sub.fptCount;
        counts.fpmCount += sub.fpmCount;
      }
    }
  } catch {}
  return counts;
}

function getStats() {
  const now = Date.now();
  if (cachedStats && now - lastStatTime < 30000) return cachedStats;
  
  const s = fs.existsSync(NAS_PATH) ? scanDir(NAS_PATH) : { fileCount: 0, fplCount: 0, fptCount: 0, fpmCount: 0 };
  const stats = { status: 'ok', path: NAS_PATH, ...s };
  
  cachedStats = stats;
  lastStatTime = now;
  return stats;
}

function listDir(dirPath) {
  const fullPath = path.join(NAS_PATH, dirPath || '');
  const resolved = path.resolve(fullPath);
  
  // Security: ensure resolved path is within NAS_PATH
  if (!resolved.startsWith(path.resolve(NAS_PATH))) {
    return { error: 'Access denied' };
  }
  
  try {
    if (!fs.existsSync(resolved)) return { entries: [] };
    
    const dirents = fs.readdirSync(resolved, { withFileTypes: true });
    const entries = dirents
      .filter(d => {
        const ext = path.extname(d.name).toLowerCase();
        return d.isDirectory() || ALLOWED_EXTENSIONS.has(ext);
      })
      .map(d => {
        const full = path.join(resolved, d.name);
        let size = 0;
        try { if (d.isFile()) size = fs.statSync(full).size; } catch {}
        return {
          name: d.name,
          path: path.relative(NAS_PATH, full),
          isDir: d.isDirectory(),
          size,
          ext: d.isFile() ? path.extname(d.name).toLowerCase() : '',
        };
      })
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    
    return { entries };
  } catch (e) {
    return { error: e.message };
  }
}

function searchFiles(query) {
  const results = [];
  const q = query.toLowerCase();
  
  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (results.length < 200) walk(full);
        } else if (e.isFile()) {
          const ext = path.extname(e.name).toLowerCase();
          if (ALLOWED_EXTENSIONS.has(ext) && e.name.toLowerCase().includes(q)) {
            results.push({
              name: e.name,
              path: path.relative(NAS_PATH, full),
              size: fs.statSync(full).size,
              ext,
            });
          }
        }
      }
    } catch {}
  }
  
  walk(NAS_PATH);
  results.sort((a, b) => a.name.localeCompare(b.name));
  return { results: results.slice(0, 200) };
}

function serveFile(filePath, res) {
  const fullPath = path.join(NAS_PATH, filePath);
  const resolved = path.resolve(fullPath);
  
  if (!resolved.startsWith(path.resolve(NAS_PATH))) {
    res.writeHead(403);
    res.end('Access denied');
    return;
  }
  
  try {
    if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    
    const ext = path.extname(resolved).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(resolved);
    
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    });
    
    const stream = fs.createReadStream(resolved);
    stream.pipe(res);
  } catch (e) {
    res.writeHead(500);
    res.end(e.message);
  }
}

const server = http.createServer((req, res) => {
  // CORS headers — allow both localhost and futurepinboard domains
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const params = url.searchParams;
  
  try {
    if (pathname === '/api/health') {
      const s = getStats();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(s));
    }
    else if (pathname === '/api/list') {
      const dir = params.get('dir') || '';
      const result = listDir(dir);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result));
    }
    else if (pathname === '/api/file') {
      const filePath = params.get('path');
      if (!filePath) {
        res.writeHead(400);
        res.end('Missing path parameter');
        return;
      }
      serveFile(filePath, res);
    }
    else if (pathname === '/api/search') {
      const q = params.get('q') || '';
      const result = searchFiles(q);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result));
    }
    else if (pathname === '/api/stat') {
      const filePath = params.get('path');
      if (!filePath) {
        res.writeHead(400);
        res.end('Missing path');
        return;
      }
      const full = path.join(NAS_PATH, filePath);
      try {
        const s = fs.statSync(full);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ exists: true, size: s.size, isDir: s.isDirectory() }));
      } catch {
        res.end(JSON.stringify({ exists: false }));
      }
    }
    else {
      res.writeHead(404);
      res.end('Not found');
    }
  } catch (e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  }
});

// Check NAS path on startup
if (!fs.existsSync(NAS_PATH)) {
  console.error(`❌ NAS path not found: ${NAS_PATH}`);
  console.error('   Mount the NAS or use --nas-path to specify the correct location.');
  process.exit(1);
}

// Quick scan
const stats = getStats();
console.log(`📂 NAS File Server`);
console.log(`   Path: ${NAS_PATH}`);
console.log(`   Port: ${PORT}`);
console.log(`   Files: ${stats.fileCount} total, ${stats.fplCount} FPL, ${stats.fptCount} FPT, ${stats.fpmCount} FPM`);
console.log(`   URL:  http://localhost:${PORT}/api/health`);
console.log(`   CORS: enabled (all origins)`);
console.log(`\n   Start the web app and connect via Console:`);
console.log(`     window.connectNAS()  — or use "NAS" source in File Browser`);

server.listen(PORT, '0.0.0.0');

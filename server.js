/**
 * Production Server with CSP Headers
 * Phase 25: Security - Content Security Policy
 *
 * Run: node server.js
 *
 * Zero-dependency static file server using only Node.js built-ins.
 * Serves dist/ with strict CSP, security headers, gzip for text assets,
 * SPA fallback to index.html, and path-traversal protection.
 */

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.resolve(__dirname, 'dist');

// ─── MIME types matching the bundle ──────────────────────────────────────────
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
};

// Extensions where gzip is worthwhile (text-like). Other types either gzip
// poorly (png/jpg/webp/woff2/wasm/audio) or are already compressed.
const GZIP_EXTS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.webmanifest', '.txt']);

// Known asset extensions — used to decide whether a 404 should fall through
// to the SPA index.html (only for routes without an extension).
const ASSET_EXTS = new Set(Object.keys(MIME_TYPES));

// ─── CSP / security headers (Phase 25) ───────────────────────────────────────
const CSP = [
  "default-src 'self'",                          // Only allow same-origin by default
  "script-src 'self' 'wasm-unsafe-eval'",        // Scripts: self + WASM (required for Rapier)
  "style-src 'self'",                            // Styles: self only
  "img-src 'self' data:",                        // Images: self + data URIs
  "font-src 'self' data:",                       // Fonts: self + data URIs
  "media-src 'self'",                            // Audio/Video: self
  "connect-src 'self'",                          // Fetch/WebSocket: self
  "frame-src 'none'",                            // No iframes
  "object-src 'none'",                           // No plugins
  "base-uri 'self'",                             // Base tag: self
  "form-action 'self'",                          // Form submissions: self
  "upgrade-insecure-requests",                   // Upgrade HTTP to HTTPS
].join('; ');

function setSecurityHeaders(res) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'microphone=(), camera=()');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sendError(res, status, message) {
  if (!res.headersSent) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  }
  res.end(message);
}

function clientAcceptsGzip(req) {
  const ae = req.headers['accept-encoding'] || '';
  return /\bgzip\b/.test(ae);
}

/**
 * Resolve a URL pathname to a real file path inside DIST_DIR.
 * Returns the absolute file path or null if it escapes DIST_DIR / doesn't exist.
 */
async function resolveSafePath(pathname) {
  // Strip query string already handled by url.parse upstream
  const decoded = decodeURIComponent(pathname);
  const joined = path.join(DIST_DIR, decoded);
  // Lexical containment check first (fast path before realpath).
  if (!joined.startsWith(DIST_DIR + path.sep) && joined !== DIST_DIR) {
    return { error: 'forbidden' };
  }
  try {
    const real = await fsp.realpath(joined);
    if (real !== DIST_DIR && !real.startsWith(DIST_DIR + path.sep)) {
      return { error: 'forbidden' };
    }
    const stat = await fsp.stat(real);
    if (stat.isDirectory()) {
      // Try index.html inside the directory
      const indexFile = path.join(real, 'index.html');
      try {
        const indexReal = await fsp.realpath(indexFile);
        const indexStat = await fsp.stat(indexReal);
        if (indexStat.isFile()) return { file: indexReal, stat: indexStat };
      } catch {
        // No index inside directory — let SPA fallback handle it.
      }
      return { error: 'notfound' };
    }
    return { file: real, stat };
  } catch {
    return { error: 'notfound' };
  }
}

async function serveFile(req, res, filePath, stat) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);

  const useGzip = GZIP_EXTS.has(ext) && clientAcceptsGzip(req);
  res.statusCode = 200;

  if (useGzip) {
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    const stream = fs.createReadStream(filePath);
    pipeline(stream, zlib.createGzip(), res, (err) => {
      if (err) console.error('[gzip pipeline]', err.message);
    });
  } else {
    res.setHeader('Content-Length', stat.size);
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('[file stream]', err.message);
      sendError(res, 500, 'Internal Server Error');
    });
    stream.pipe(res);
  }
}

// ─── Request handler ─────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return sendError(res, 405, 'Method Not Allowed');
  }

  // Parse with WHATWG URL API (url.parse is deprecated). Use a dummy base
  // because req.url is path-only.
  let pathname;
  try {
    pathname = new URL(req.url || '/', 'http://localhost').pathname;
  } catch {
    return sendError(res, 400, 'Bad Request');
  }
  if (pathname === '/') pathname = '/index.html';

  const resolved = await resolveSafePath(pathname);

  if (resolved.error === 'forbidden') {
    return sendError(res, 403, 'Forbidden');
  }

  if (resolved.error === 'notfound') {
    // SPA fallback: only for routes without a known asset extension.
    const ext = path.extname(pathname).toLowerCase();
    if (ext === '' || !ASSET_EXTS.has(ext)) {
      const indexPath = path.join(DIST_DIR, 'index.html');
      try {
        const indexStat = await fsp.stat(indexPath);
        return serveFile(req, res, indexPath, indexStat);
      } catch {
        return sendError(res, 404, 'Not Found');
      }
    }
    return sendError(res, 404, 'Not Found');
  }

  return serveFile(req, res, resolved.file, resolved.stat);
});

server.on('error', (err) => {
  console.error('[Server Error]', err);
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          🎮 Future Pinball Web - Production Server            ║
╠══════════════════════════════════════════════════════════════╣
║  🚀 Server running at: http://localhost:${PORT}                ║
║  🔒 CSP Headers: ENABLED                                      ║
║  ✅ Security Level: STRICT                                    ║
║  📦 Serving: dist/                                            ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

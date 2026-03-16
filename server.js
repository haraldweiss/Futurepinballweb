/**
 * Production Server with CSP Headers
 * Phase 25: Security - Content Security Policy
 * 
 * Run: node server.js
 */

const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Phase 25: Content Security Policy Headers ───────────────────────────────
app.use((req, res, next) => {
  // Strict CSP for production
  res.setHeader(
    'Content-Security-Policy',
    [
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
    ].join('; ')
  );

  // Additional Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');           // Prevent MIME sniffing
  res.setHeader('X-Frame-Options', 'DENY');                     // No framing
  res.setHeader('X-XSS-Protection', '1; mode=block');           // XSS protection
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'microphone=(), camera=()'); // No mic/camera

  next();
});

// Compression
app.use(compression());

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
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


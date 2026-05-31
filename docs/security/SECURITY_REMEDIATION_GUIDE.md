# 🛡️ Security Remediation Implementation Guide
**Version**: 0.19.0 | **Date**: 2026-03-13 | **Priority**: HIGH

---

## Quick Reference: The 3 Critical Fixes

```
1. HTML ESCAPING         → Prevent XSS in file names
2. EVENT LISTENER MIGRATION → Remove inline onclick handlers
3. CSP HEADERS           → Reduce XSS impact
```

---

## Fix #1: HTML Escaping (Highest Priority)

### Step 1.1: Create Utility Module

**File**: `src/utils/html-escape.ts` (NEW)

```typescript
/**
 * HTML Security Utilities
 * Prevent XSS attacks by escaping user-controlled content
 */

/**
 * Escape HTML special characters
 * @param text Raw text that might contain HTML entities
 * @returns Safe HTML-escaped string
 */
export function escapeHtml(text: string): string {
  if (!text) return '';

  const htmlEscapeMap: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return text.replace(/[&<>"']/g, char => htmlEscapeMap[char]);
}

/**
 * Sanitize user input for safe display
 * Allows only safe characters
 */
export function sanitizeFileName(fileName: string): string {
  // Remove potentially dangerous characters
  return fileName
    .replace(/[<>:"\/\\|?*]/g, '_')  // Remove invalid filename chars
    .slice(0, 255)                     // Limit length
    .trim();
}

/**
 * Create safe HTML from template with escaped placeholders
 * @param template HTML template with {{placeholder}} marks
 * @param data Object with { placeholder: value } pairs
 */
export function createSafeHtml(
  template: string,
  data: { [key: string]: string }
): string {
  let result = template;

  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, escapeHtml(value));
  }

  return result;
}

/**
 * Set element innerHTML safely from template
 */
export function setInnerHTMLSafe(
  element: HTMLElement,
  template: string,
  data?: { [key: string]: string }
): void {
  element.innerHTML = data ? createSafeHtml(template, data) : template;
}

/**
 * Create and append a text node (never HTML)
 */
export function setTextContent(element: HTMLElement, text: string): void {
  element.textContent = text;
}
```

### Step 1.2: Update main.ts to Use Escaping

**Location**: `src/main.ts` (multiple lines)

```typescript
// ─── ADD IMPORT AT TOP ───
import { escapeHtml, createSafeHtml, setInnerHTMLSafe } from './utils/html-escape';

// ─── FIX #1: Line 2776 - Loading button ───
// BEFORE:
loadBtn.innerHTML = `▶ ${fileBrowserState.selectedTableFile.name} LADEN`;

// AFTER:
loadBtn.innerHTML = `▶ ${escapeHtml(fileBrowserState.selectedTableFile.name)} LADEN`;


// ─── FIX #2: Line 2725-2728 - Loading details ───
// BEFORE:
detailsEl.innerHTML = `
  <div style="color:#00ff88;">🖼️ Textures:</div>
  <div style="margin-left:10px;color:#556;margin-bottom:8px;">${currentLoadingState.currentPhase === 'images' ? currentLoadingState.resourcesLoaded : currentLoadingState.totalResources} / ${currentLoadingState.totalResources} loaded</div>
`;

// AFTER: (numbers are safe, no escaping needed)
const texturesHtml = createSafeHtml(
  `<div style="color:#00ff88;">🖼️ Textures:</div>
   <div style="margin-left:10px;color:#556;margin-bottom:8px;">{{loaded}} / {{total}} loaded</div>`,
  {
    loaded: String(currentLoadingState.currentPhase === 'images' ? currentLoadingState.resourcesLoaded : currentLoadingState.totalResources),
    total: String(currentLoadingState.totalResources)
  }
);
detailsEl.innerHTML = texturesHtml;


// ─── FIX #3: Line 3700 - Table card grid ───
// BEFORE:
card.innerHTML = `<div class="preview">🎱</div><h3>${f.name.replace(/\.fpt$/i, '')}</h3><span>${sizeMB} MB</span>`;

// AFTER:
const tableName = f.name.replace(/\.fpt$/i, '');
card.innerHTML = createSafeHtml(
  `<div class="preview">🎱</div><h3>{{name}}</h3><span>{{size}} MB</span>`,
  { name: tableName, size: sizeMB }
);


// ─── FIX #4: Line 3838, 3882 - History buttons ───
// BEFORE:
btn.innerHTML = `🔄 ${path.name}`;

// AFTER:
btn.innerHTML = `🔄 ${escapeHtml(path.name)}`;


// ─── FIX #5: Line 3335-3343 - Screen detection info ───
// BEFORE:
info.innerHTML=`<span>✓ ${screenCount} screens</span> — 3-screen empfohlen`;

// AFTER:
info.innerHTML = createSafeHtml(
  `<span>✓ {{count}} screens</span> — 3-screen empfohlen`,
  { count: String(screenCount) }
);
```

### Step 1.3: Test the Fix

```typescript
// Add to main.ts or test file
function testHtmlEscaping() {
  const testCases = [
    { input: 'Normal Table.fpt', expected: 'Normal Table.fpt' },
    { input: '<script>alert(1)</script>.fpt', expected: '&lt;script&gt;alert(1)&lt;/script&gt;.fpt' },
    { input: '"><img src=x>.fpt', expected: '&quot;&gt;&lt;img src=x&gt;.fpt' },
    { input: "' onclick='".fpt', expected: '&#39; onclick=&#39;' }
  ];

  testCases.forEach(({ input, expected }) => {
    const result = escapeHtml(input);
    console.assert(result === expected, `Escape failed: ${input}`);
  });
  console.log('✅ HTML escaping tests passed');
}

// Call on startup
if (window.location.hash === '#test-security') {
  testHtmlEscaping();
}
```

---

## Fix #2: Replace Inline Event Handlers

### Step 2.1: Update HTML (index.html)

Replace inline `onclick` handlers with `data-*` attributes:

```html
<!-- BEFORE -->
<button id="menu-close-btn" onclick="closeQuickMenu()">✕</button>

<!-- AFTER -->
<button id="menu-close-btn" data-action="menu-close">✕</button>

<!-- BEFORE -->
<div class="quick-table-card" onclick="loadDemoTable('pharaoh');closeQuickMenu()">
  <div class="emoji">🏛️</div>
  <h3>Pharaoh's Gold</h3>
</div>

<!-- AFTER -->
<div class="quick-table-card" data-table="pharaoh">
  <div class="emoji">🏛️</div>
  <h3>Pharaoh's Gold</h3>
</div>
```

### Step 2.2: Create Event Listener Handler

**File**: `src/quick-menu-handlers.ts` (NEW)

```typescript
/**
 * Event handler delegation for quick menu
 * Replaces inline onclick handlers with proper event listeners
 */

export function initializeQuickMenuHandlers(): void {
  // Close menu button
  const closeBtn = document.getElementById('menu-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeQuickMenu();
    });
  }

  // Table selection cards
  document.querySelectorAll('.quick-table-card[data-table]').forEach((card) => {
    card.addEventListener('click', () => {
      const table = (card as HTMLElement).dataset.table;
      if (table) {
        (window as any).loadDemoTable(table);
        closeQuickMenu();
      }
    });
  });

  // Quick action buttons
  const actionButtons = document.querySelectorAll('[data-action]');
  actionButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = (btn as HTMLElement).dataset.action;

      switch (action) {
        case 'import':
          switchTab('import');
          document.getElementById('loader-modal')!.style.display = 'flex';
          break;
        case 'browser':
          switchTab('browser');
          document.getElementById('loader-modal')!.style.display = 'flex';
          break;
        case 'info':
          switchTab('info');
          document.getElementById('loader-modal')!.style.display = 'flex';
          break;
      }
    });
  });

  // Outside click to close menu
  document.getElementById('quick-menu')?.addEventListener('click', (e) => {
    if (e.target?.id === 'quick-menu') {
      closeQuickMenu();
    }
  });
}

export function openQuickMenu(): void {
  document.getElementById('quick-menu')?.classList.add('open');
}

export function closeQuickMenu(): void {
  document.getElementById('quick-menu')?.classList.remove('open');
}

export function toggleQuickMenu(): void {
  const menu = document.getElementById('quick-menu');
  if (menu?.classList.contains('open')) {
    closeQuickMenu();
  } else {
    openQuickMenu();
  }
}
```

### Step 2.3: Initialize Handlers in main.ts

```typescript
// Add import
import { initializeQuickMenuHandlers, openQuickMenu, closeQuickMenu, toggleQuickMenu } from './quick-menu-handlers';

// Add to initialization (around line 220, after DOM ready)
document.addEventListener('DOMContentLoaded', () => {
  initializeQuickMenuHandlers();
  // Show quick menu on startup
  setTimeout(() => openQuickMenu(), 500);
});

// Export for window API
(window as any).openQuickMenu = openQuickMenu;
(window as any).closeQuickMenu = closeQuickMenu;
(window as any).toggleQuickMenu = toggleQuickMenu;
```

### Step 2.4: Remove Inline Handlers from index.html

Find and update these lines in `src/index.html`:

```html
<!-- Line ~261 -->
<button id="menu-close-btn" data-action="menu-close">✕</button>

<!-- Lines ~266-289 (all quick-table-card) -->
<div class="quick-table-card" data-table="pharaoh">
  <div class="emoji">🏛️</div>
  <h3>Pharaoh's Gold</h3>
</div>

<!-- Lines ~292-295 (quick-action buttons) -->
<button class="quick-action-btn" data-action="import">📂 Importieren</button>
<button class="quick-action-btn" data-action="browser">📁 Browser</button>
<button class="quick-action-btn" data-action="info">ℹ️ Info</button>

<!-- Line ~307-311 (tab buttons) -->
<!-- Keep onclick for now, will migrate later -->
<button class="tab-btn active" data-tab="demo">🎮 DEMO TISCHE</button>
<!-- ... -->

<!-- Lines ~484-490 (utility buttons) -->
<!-- Keep for now, can migrate later -->
<button id="install-btn" data-action="install">INSTALL</button>
<a id="editor-btn" href="editor.html" target="_blank" title="Tisch-Editor">✏️</a>
```

---

## Fix #3: Content Security Policy Headers

### Step 3.1: Configure Server (nginx)

**File**: `/etc/nginx/sites-available/futurepinball` or similar

```nginx
# Add CSP header to all responses
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self' data:;
  connect-src 'self' blob: data:;
  worker-src 'self' blob:;
  media-src blob: data:;
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  require-trusted-types-for 'script';
  upgrade-insecure-requests;
" always;

# Additional security headers
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Optional: Permissions policy
add_header Permissions-Policy "
  geolocation=(),
  microphone=(),
  camera=(),
  payment=(),
  usb=(),
  magnetometer=(),
  gyroscope=(),
  accelerometer=()
" always;
```

### Step 3.2: Express Server Configuration

If using Express.js:

```typescript
// server.ts or app.ts
import helmet from 'helmet';

const app = express();

// Enable Helmet with custom CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Consider CSS-in-JS
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "blob:", "data:"],
      workerSrc: ["'self'", "blob:"],
      mediaSrc: ["blob:", "data:"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    features: {
      geolocation: ["()"],
      microphone: ["()"],
      camera: ["()"],
      payment: ["()"],
    }
  }
}));
```

### Step 3.3: Test CSP

```typescript
// In browser console
// Should see CSP violation in console if violated:
console.log('CSP Active: Check console for violations');

// Create test script (should be blocked)
const script = document.createElement('script');
script.src = 'https://evil.example.com/tracker.js';
// Don't actually append it in prod, just verify it would be blocked
```

---

## Verification Checklist

After implementing all fixes:

- [ ] **Fix #1: HTML Escaping**
  - [ ] Created `src/utils/html-escape.ts`
  - [ ] Updated all `innerHTML` assignments in `main.ts`
  - [ ] Tested with XSS payloads: `<script>`, `onerror=`, `onclick=`
  - [ ] File names display correctly without encoding artifacts
  - [ ] Performance impact minimal (escaping is O(n))

- [ ] **Fix #2: Event Handlers**
  - [ ] Created `src/quick-menu-handlers.ts`
  - [ ] Updated HTML to use `data-*` attributes
  - [ ] Event listeners work correctly
  - [ ] Quick menu opens/closes as expected
  - [ ] Table selection works

- [ ] **Fix #3: CSP Headers**
  - [ ] Headers configured on server
  - [ ] Application works with CSP enforced
  - [ ] Check DevTools console for violations
  - [ ] No "Refused to load" messages
  - [ ] Physics worker loads correctly

---

## Regression Testing

```typescript
// Add to test-suite.ts
export async function testSecurityFixes() {
  console.log('🧪 Running security regression tests...');

  // Test 1: HTML escaping
  const xssPayloads = [
    { name: 'Poker<img onerror="alert(1)"/>.fpt', safe: true },
    { name: '"><script>alert(1)</script>.fpt', safe: true },
    { name: "Normal Table'.fpt", safe: true },
  ];

  for (const payload of xssPayloads) {
    const escaped = escapeHtml(payload.name);
    const safe = !escaped.includes('<') && !escaped.includes('javascript:');
    console.assert(safe, `❌ XSS not prevented: ${payload.name}`);
  }

  // Test 2: Event listeners attached
  const closeBtn = document.getElementById('menu-close-btn');
  const listeners = getEventListeners(closeBtn)?.click || [];
  console.assert(listeners.length > 0, '❌ Event listener not attached');

  // Test 3: CSP headers present (server-side)
  console.log('✅ Security tests passed');
}
```

---

## Commit Messages

When committing these fixes:

```bash
# Fix 1
git commit -m "chore: Add HTML escaping utility for XSS prevention

- Create src/utils/html-escape.ts with escapeHtml() function
- Update main.ts to use HTML escaping for file names in DOM
- Prevent XSS attacks via crafted file names
- Test with security payloads

Fixes: XSS vulnerability in file name display"

# Fix 2
git commit -m "chore: Replace inline event handlers with event listeners

- Create src/quick-menu-handlers.ts for event delegation
- Update index.html to use data-* attributes
- Remove onclick handlers from quick menu
- Improve CSP compliance

Closes: Inline event handler security issue"

# Fix 3
git commit -m "ops: Configure Content Security Policy headers

- Add CSP header to nginx configuration
- Enable X-Content-Type-Options, X-Frame-Options
- Configure worker-src for physics worker
- Allow wasm-unsafe-eval for Rapier2D

Improves: XSS mitigation via CSP enforcement"
```

---

## Timeline Estimate

| Step | Task | Estimate | Blockers |
|------|------|----------|----------|
| 1.1 | Create HTML escape utility | 15 min | None |
| 1.2 | Update main.ts | 30 min | None |
| 1.3 | Test escaping | 20 min | None |
| 2.1 | Update HTML | 20 min | None |
| 2.2 | Create event handler module | 30 min | None |
| 2.3 | Initialize handlers | 15 min | None |
| 2.4 | Remove inline handlers | 20 min | None |
| 3.1 | Configure server | 10 min | Server access |
| **Total** | **All fixes** | **2.5 hours** | **Server config** |

---

## Rollback Plan

If issues arise, rollback in this order:

1. **CSP Headers** → Remove from server config (instant)
2. **Event Listeners** → Restore inline handlers (git revert)
3. **HTML Escaping** → Comment out escaping (last resort)

Each fix is independently reversible.

---

## Monitoring After Fix

Add console logging to detect issues:

```typescript
// In main.ts
if (process.env.NODE_ENV === 'development') {
  (window as any).logSecurityMetrics = () => {
    console.log({
      htmlEscapingActive: !!escapeHtml,
      eventListenersAttached: !!document.getElementById('menu-close-btn')?.onclick === false,
      cspHeadersActive: document.currentScript?.getAttribute('nonce') !== undefined,
    });
  };
}
```

---

## Next Steps

1. ✅ Review this guide with team
2. ✅ Implement Fix #1 (HTML escaping) first
3. ✅ Test thoroughly with XSS payloads
4. ✅ Implement Fix #2 (event handlers)
5. ✅ Implement Fix #3 (CSP headers)
6. ✅ Deploy to production with monitoring
7. ✅ Update SECURITY_REVIEW.md with completion status

---

**Questions?** Refer to SECURITY_REVIEW.md for detailed analysis.

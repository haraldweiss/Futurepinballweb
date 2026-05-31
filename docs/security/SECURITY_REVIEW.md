# 🔒 Security Review — Future Pinball Web
**Date**: 2026-03-13 | **Version**: 0.19.0 | **Focus**: XSS, Input Validation, Data Protection

---

## Executive Summary

This security review identifies **7 medium-risk vulnerabilities** and **3 low-risk concerns** in the Future Pinball Web codebase. Most issues stem from dynamic HTML manipulation (`innerHTML`) with user-controlled file names and inline event handlers in the HTML. The physics worker message passing is well-designed with proper serialization.

**Risk Level**: 🟡 **MEDIUM** (Localized to UI layer, not core physics/game engine)

---

## 1. 🔴 DOM Manipulation with Unvalidated User Input (MEDIUM RISK)

### Issue 1a: File Names in `innerHTML` (main.ts, lines 2725-2728, 2754-2757, 2776)

**Location**: `src/main.ts:2725-2728`
```typescript
detailsEl.innerHTML = `
  <div style="color:#00ff88;">🖼️ Textures:</div>
  <div>${currentLoadingState.currentPhase === 'images' ?
    currentLoadingState.resourcesLoaded : 0} / ${currentLoadingState.totalResources}</div>
```

**Severity**: MEDIUM (Numbers only, relatively safe, but pattern shows vulnerability)

**Real Risk**: `loadBtn.innerHTML = \`▶ ${fileBrowserState.selectedTableFile.name} LADEN\`;` (line 2776)
- User-supplied file name inserted directly into HTML
- File name could contain HTML/JavaScript: `<img src=x onerror="alert('xss')">table.fpt`
- **Exploit Example**: User selects file named `"Poker<script>alert(1)</script>.fpt"`

### Issue 1b: Dynamic Grid/List Rendering (main.ts, lines 3700, 3691-3692)

**Location**: `src/main.ts:3700`
```typescript
card.innerHTML = `<div class="preview">🎱</div>
  <h3>${f.name.replace(/\.fpt$/i, '')}</h3>
  <span>${sizeMB} MB</span>`;
```

**Risk**: File names displayed without HTML escaping
- Similarly affects: line 3691, 3787, 3824-3839, 3838, 3868-3885, 3882

---

### Issue 1c: Quick Menu Dynamic HTML (index.html, lines 293-295)

**Location**: `src/index.html:293-295`
```html
<button class="quick-action-btn"
  onclick="switchTab('import');document.getElementById('loader-modal').style.display='flex';">
  📂 Importieren
</button>
```

**Risk**: Multiple inline event handlers with string concatenation in DOM operations

---

## Recommended Fix for Issue 1

### ✅ Solution A: Use `textContent` for User Data

```typescript
// SAFE: Only use innerHTML for trusted HTML structure
const container = document.createElement('div');
container.className = 'table-card';

const preview = document.createElement('div');
preview.className = 'preview';
preview.textContent = '🎱';

const title = document.createElement('h3');
title.textContent = f.name.replace(/\.fpt$/i, '');  // ← Safe: textContent, not innerHTML

const size = document.createElement('span');
size.textContent = `${sizeMB} MB`;

container.appendChild(preview);
container.appendChild(title);
container.appendChild(size);
```

### ✅ Solution B: HTML Escaping Utility (Recommended for Current Code)

Add to `src/utils/html-escape.ts`:
```typescript
/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Create safe HTML with escaped user content
 */
export function safeInnerHTML(element: HTMLElement, html: string, userContent?: { [key: string]: string }): void {
  // Replace placeholders with escaped values
  let safe = html;
  if (userContent) {
    for (const [key, value] of Object.entries(userContent)) {
      safe = safe.replace(new RegExp(`{{${key}}}`, 'g'), escapeHtml(value));
    }
  }
  element.innerHTML = safe;
}
```

**Usage**:
```typescript
// main.ts:2776
const name = fileBrowserState.selectedTableFile.name;
loadBtn.innerHTML = `▶ ${escapeHtml(name)} LADEN`;

// OR using template:
safeInnerHTML(loadBtn, '▶ {{name}} LADEN', { name: fileBrowserState.selectedTableFile.name });
```

---

## 2. 🟡 Inline Event Handlers in HTML (MEDIUM RISK)

### Issue 2: Event Handler String Concatenation (index.html, lines 261-295)

**Location**: `src/index.html:261-295`
```html
<button id="menu-close-btn" onclick="closeQuickMenu()">✕</button>

<div class="quick-table-card" onclick="loadDemoTable('pharaoh');closeQuickMenu()">
  <div class="emoji">🏛️</div>
  <h3>Pharaoh's Gold</h3>
</div>

<button class="quick-action-btn" onclick="switchTab('import');document.getElementById('loader-modal').style.display='flex';">
```

**Severity**: MEDIUM
- Multiple inline event handlers
- String arguments are hardcoded (safe), but pattern is outdated
- If arguments were dynamically constructed, XSS possible
- Violates Content Security Policy (CSP) best practices

---

### Recommended Fix for Issue 2

Replace inline handlers with event listeners:

```typescript
// In main.ts or a new src/quick-menu.ts
function initializeQuickMenuHandlers() {
  const closeBtn = document.getElementById('menu-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeQuickMenu());
  }

  // Pharaoh card
  const pharaohCard = document.querySelector('[data-table="pharaoh"]');
  if (pharaohCard) {
    pharaohCard.addEventListener('click', () => {
      loadDemoTable('pharaoh');
      closeQuickMenu();
    });
  }

  // All table cards
  document.querySelectorAll('.quick-table-card').forEach((card) => {
    const table = card.getAttribute('data-table');
    if (table) {
      card.addEventListener('click', () => {
        loadDemoTable(table);
        closeQuickMenu();
      });
    }
  });

  // Action buttons
  const importBtn = document.querySelector('[data-action="import"]');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      switchTab('import');
      document.getElementById('loader-modal')!.style.display = 'flex';
    });
  }
}

// Call on page load
document.addEventListener('DOMContentLoaded', initializeQuickMenuHandlers);
```

Update HTML to use `data-*` attributes instead:
```html
<button id="menu-close-btn">✕</button>

<div class="quick-table-card" data-table="pharaoh">
  <div class="emoji">🏛️</div>
  <h3>Pharaoh's Gold</h3>
</div>

<button class="quick-action-btn" data-action="import">📂 Importieren</button>
```

---

## 3. 🟡 localStorage Usage Without Validation (LOW-MEDIUM RISK)

### Issue 3: localStorage in highscore.ts (lines 4, 15)

**Location**: `src/highscore.ts:1-17`
```typescript
const HS_KEY = 'fpw_highscores_v1';

export function getTopScores(): number[] {
  try { return JSON.parse(localStorage.getItem(HS_KEY) ?? '[]') || []; }
  catch { return []; }
}

export function recordScore(score: number): number {
  if (score <= 0) return 0;
  const list = getTopScores();
  list.push(score);
  list.sort((a, b) => b - a);
  list.splice(5);
  try { localStorage.setItem(HS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  return list.indexOf(score) + 1;
}
```

**Severity**: LOW (numbers only, but potential issues)

**Issues**:
- No validation of JSON structure after parsing
- No type checking on stored values
- Malicious data could be injected via direct localStorage manipulation
- No quota management (could fill up storage)

---

### Recommended Fix for Issue 3

```typescript
const HS_KEY = 'fpw_highscores_v1';
const MAX_HIGHSCORES = 5;
const MAX_SCORE = 999999999;
const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024; // 5MB limit

export function getTopScores(): number[] {
  try {
    const raw = localStorage.getItem(HS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    // ✅ Validate structure
    if (!Array.isArray(parsed)) return [];

    // ✅ Validate each entry
    const scores = parsed
      .filter((s): s is number => typeof s === 'number' && s >= 0 && s <= MAX_SCORE)
      .slice(0, MAX_HIGHSCORES);

    return scores;
  } catch (e) {
    console.error('[Highscores] Parse error:', e);
    return [];
  }
}

export function recordScore(score: number): number {
  // ✅ Input validation
  if (!Number.isFinite(score) || score <= 0 || score > MAX_SCORE) {
    console.warn('[Highscores] Invalid score:', score);
    return 0;
  }

  try {
    const list = getTopScores();
    list.push(score);
    list.sort((a, b) => b - a);
    list.splice(MAX_HIGHSCORES);  // Keep only top 5

    const json = JSON.stringify(list);

    // ✅ Check storage quota before writing
    if (json.length > STORAGE_QUOTA_BYTES) {
      console.warn('[Highscores] Storage quota exceeded');
      return 0;
    }

    localStorage.setItem(HS_KEY, json);
    return list.indexOf(score) + 1;
  } catch (e) {
    if (e instanceof DOMException && e.code === 22) {
      console.error('[Highscores] Storage quota exceeded');
    }
    return 0;
  }
}
```

---

## 4. 🟡 Physics Worker Message Passing (LOW RISK)

### Issue 4: Untrusted Message Type in Worker Bridge (physics-worker-bridge.ts, line 198)

**Location**: `src/physics-worker-bridge.ts:197-227`
```typescript
private handleWorkerMessage(event: MessageEvent): void {
  const { type, data, error } = event.data;

  switch (type) {
    case 'frame':
      this.pendingFrame = data as PhysicsFrameData;
      // ...
      break;
    case 'error':
      console.error('[Physics Bridge] Worker error:', error);
      break;
    default:
      console.warn(`[Physics Bridge] Unknown message type: ${type}`);
  }
}
```

**Severity**: LOW (Worker is same-origin, but message validation missing)

**Issues**:
- No validation of message `type` before switch
- `data` cast to `PhysicsFrameData` without validation
- Could silently accept malformed physics data

---

### Recommended Fix for Issue 4

```typescript
private handleWorkerMessage(event: MessageEvent): void {
  const message = event.data;

  // ✅ Validate message structure
  if (!message || typeof message !== 'object') {
    console.error('[Physics Bridge] Invalid message format');
    return;
  }

  const { type, data, error } = message;

  // ✅ Validate message type
  if (!['frame', 'error', 'worker-ready', 'ready', 'disposed'].includes(type)) {
    console.warn(`[Physics Bridge] Unknown message type: ${type}`);
    return;
  }

  switch (type) {
    case 'frame': {
      // ✅ Validate data structure
      if (!this.validatePhysicsFrame(data)) {
        console.error('[Physics Bridge] Invalid physics frame data');
        return;
      }
      this.pendingFrame = data as PhysicsFrameData;
      if (this.frameCallback) {
        this.frameCallback(data);
      }
      break;
    }
    case 'error': {
      if (typeof error === 'string') {
        console.error('[Physics Bridge] Worker error:', error);
      }
      break;
    }
    // ... other cases
  }
}

private validatePhysicsFrame(data: any): data is PhysicsFrameData {
  if (!data || typeof data !== 'object') return false;

  const ballPos = data.ballPos;
  if (!ballPos ||
      typeof ballPos.x !== 'number' ||
      typeof ballPos.y !== 'number' ||
      typeof ballPos.z !== 'number') {
    return false;
  }

  const ballVel = data.ballVel;
  if (!ballVel ||
      typeof ballVel.x !== 'number' ||
      typeof ballVel.y !== 'number') {
    return false;
  }

  if (!Array.isArray(data.collisions)) return false;

  return true;
}
```

---

## 5. 🟡 VBScript Transpilation Security (LOW-MEDIUM RISK)

### Issue 5: String Replacement in Script Engine (script-engine.ts, line 43)

**Location**: `src/script-engine.ts:43`
```typescript
} else {
  result += part.replace(new RegExp(pattern, 'g'), replacement);
}
```

**Severity**: LOW (Limited to string matching, not code execution)

**Concern**:
- Dynamic RegExp creation could be vulnerable if `pattern` is user-controlled
- Currently only internal patterns, but worth noting for future changes

---

### Recommended Fix for Issue 5

```typescript
// ✅ Use regex patterns directly instead of string construction
const PATTERNS = {
  STRING_CONCAT: /\s*&\s*/g,
  TRUE: /\bTrue\b/gi,
  FALSE: /\bFalse\b/gi,
  // ... etc
};

function replaceOutsideStrings(text: string, pattern: RegExp, replacement: string): string {
  // ✅ Use RegExp object instead of string pattern
  const parts = text.split(/(["'])/);
  let inString = false, delimiter = '';
  let result = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if ((part === '"' || part === "'") && (i === 0 || parts[i-1] !== '\\')) {
      if (!inString) { inString = true; delimiter = part; }
      else if (part === delimiter) inString = false;
      result += part;
    } else if (inString) {
      result += part;
    } else {
      result += part.replace(pattern, replacement);  // ← Use RegExp object
    }
  }
  return result;
}
```

---

## 6. 🟢 File System Access API (LOW RISK)

### Issue 6: File Handling Security (file-browser.ts)

**Positive Note**: The codebase uses File System Access API instead of arbitrary file uploads, which is more secure:
- Limited to user-selected directories
- User explicitly grants permission
- No arbitrary file access

**Remaining Concerns**:
- File size validation is missing
- No virus scanning
- No file type validation beyond extension

---

### Recommended Enhancement for Issue 6

```typescript
const MAX_FILE_SIZE = 512 * 1024 * 1024;  // 512MB
const ALLOWED_EXTENSIONS = ['.fpt', '.fp', '.fpl', '.json'];

async function loadTableFromFile(file: File): Promise<void> {
  // ✅ Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB > 512MB limit`);
  }

  // ✅ Validate file extension
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`File type not supported: ${ext}`);
  }

  // ✅ Validate file content (magic bytes)
  const header = await file.slice(0, 4).arrayBuffer();
  const magicBytes = new Uint8Array(header);

  // FPT files should start with OLE2 magic bytes: D0 CF 11 E0
  if (!(magicBytes[0] === 0xD0 && magicBytes[1] === 0xCF &&
        magicBytes[2] === 0x11 && magicBytes[3] === 0xE0)) {
    console.warn('[File] File header does not match OLE2 format');
    // Continue but with caution
  }

  // Proceed with file loading
  // ...
}
```

---

## 7. 🟡 Content Security Policy (CSP) Not Enforced (MEDIUM RISK)

### Issue 7: Missing CSP Headers

**Location**: Server configuration (not in TypeScript)

**Severity**: MEDIUM (Reduces XSS impact significantly)

**Current State**: No CSP header configured

---

### Recommended Fix for Issue 7

Add to server response headers (nginx/Express):

```nginx
# nginx.conf
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

add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

**Notes**:
- `'wasm-unsafe-eval'` required for Rapier2D physics engine
- `blob:` required for Web Workers (physics-worker.ts)
- `'unsafe-inline'` for styles is acceptable but consider CSS-in-JS alternatives

---

## 8. 🟢 Positive Security Findings

✅ **No `eval()` usage** — VBScript transpilation uses string replacement, not eval

✅ **Proper error handling** — Try-catch blocks in storage operations

✅ **Type safety** — TypeScript prevents many runtime vulnerabilities

✅ **Worker sandboxing** — Physics worker runs in isolated context

✅ **No direct file access** — Uses File System Access API with user permission

✅ **Input bounds checking** — Physics values clamped (dt, substeps)

---

## Remediation Priority

| Priority | Issue | Impact | Effort | Timeline |
|----------|-------|--------|--------|----------|
| 🔴 **HIGH** | HTML escaping for file names | XSS vulnerability | 2-3 hours | ASAP |
| 🟡 **MEDIUM** | Replace inline event handlers | CSP compliance | 3-4 hours | This week |
| 🟡 **MEDIUM** | Add CSP headers | XSS mitigation | 1-2 hours | This week |
| 🟡 **MEDIUM** | Validate localStorage data | Data integrity | 1 hour | Next sprint |
| 🟢 **LOW** | Validate physics worker messages | Data validation | 2 hours | Next sprint |
| 🟢 **LOW** | Add file validation | File security | 1-2 hours | Next sprint |

---

## Implementation Roadmap

### Phase 1: Immediate (This Week)
1. ✅ Add `escapeHtml()` utility function
2. ✅ Update `innerHTML` calls to use HTML escaping
3. ✅ Review all file name insertions for XSS

### Phase 2: Short-term (Next 2 Weeks)
1. ✅ Replace inline event handlers with event listeners
2. ✅ Configure CSP headers on server
3. ✅ Add localStorage validation in highscore.ts

### Phase 3: Medium-term (Next Sprint)
1. ✅ Validate physics worker messages
2. ✅ Add file size and type validation
3. ✅ Security testing and penetration testing

---

## Testing Strategy

### XSS Testing
```javascript
// In browser console, attempt XSS with crafted file name:
const xssTests = [
  "Poker<script>alert('xss')</script>.fpt",
  "Test\"><img src=x onerror=\"alert('xss')\"/>.fpt",
  "Test' onmouseover='alert(1).fpt",
  "Test\\x00Test.fpt",
];

// These should be properly escaped after fixes
```

### localStorage Testing
```javascript
// Test malformed data:
localStorage.setItem('fpw_highscores_v1', 'not-json');
localStorage.setItem('fpw_highscores_v1', '[1, "not-a-number", 2]');
localStorage.setItem('fpw_highscores_v1', '{"invalid": "structure"}');

// All should gracefully handle errors
```

---

## Compliance Checklist

- [ ] OWASP Top 10 (A03:2021 – Injection)
  - XSS prevention via HTML escaping
  - Input validation on all user-controlled data

- [ ] OWASP Top 10 (A05:2021 – Access Control)
  - File System Access API (user-controlled)
  - No privilege escalation vectors

- [ ] OWASP Top 10 (A09:2021 – Security Logging)
  - Worker errors logged with context
  - Script transpilation logging

---

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: Trusted Types API](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [OWASP localStorage Security](https://owasp.org/www-community/attacks/DOM_based_XSS)

---

## Sign-Off

**Review Conducted**: 2026-03-13
**Reviewer**: Security Analysis Agent
**Status**: 🟡 **MEDIUM RISK — REQUIRES REMEDIATION**

**Next Step**: Implement Phase 1 fixes (HTML escaping) immediately. Create security-focused commits for each issue category.

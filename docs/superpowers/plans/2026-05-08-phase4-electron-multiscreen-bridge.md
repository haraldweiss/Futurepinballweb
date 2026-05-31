# Phase 4: Electron Multi-Screen Bridge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Enable multi-display detection and multi-window cabinet mode in the Electron build. The renderer-only browser-API approach can't see all physical screens (Electron exposes display info only via the main process), and `window.open()` is currently denied by the security-conscious `setWindowOpenHandler`.

**Architecture:** IPC bridge between renderer and main process:
- `electron.screen.getAllDisplays()` exposed via IPC for accurate display enumeration
- New BrowserWindow creation via IPC for backglass/DMD windows on specific displays
- Renderer code feature-detects `window.electronAPI.getAllDisplays` to use the bridge when available, falls back to existing browser APIs otherwise

**Tech Stack:** Electron (main + preload + renderer), TypeScript, Vitest.

---

## File Structure

**Modified files:**
- `electron-main.cjs` — add `ipcMain.handle('screen:getAllDisplays')`, `ipcMain.handle('window:openOnDisplay')`, `ipcMain.handle('window:close')`. Add tracking Map for child windows.
- `electron-preload.cjs` — expose `getAllDisplays()`, `openWindow(url, options)`, `closeWindow(id)` on `electronAPI`.
- `src/multiscreen-window-manager.ts` — add `detectScreensElectron()` (uses electronAPI when present), modify `openTwoScreenLayout`/`openThreeScreenLayout` to use `electronAPI.openWindow()` in Electron environment.

**New files:**
- `src/__tests__/multiscreen-bridge.test.ts` — unit tests for the manager's branch selection (browser vs Electron path).

No new dependencies.

---

## Task 1: IPC handlers in electron-main.cjs

### Step 1.1: Add screen import and child-window tracking

In `electron-main.cjs`, find the existing destructure import (line 19):
```js
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
```

Extend to include `screen`:
```js
const { app, BrowserWindow, Menu, ipcMain, dialog, screen } = require('electron');
```

Near the top (after `let mainWindow = null;`), add:
```js
const childWindows = new Map(); // id -> BrowserWindow
let nextChildId = 1;
```

### Step 1.2: Add screen:getAllDisplays handler

After the existing `ipcMain.handle('app:getPath', ...)` (around line 248), add:

```js
// Screen enumeration — main process has access to all displays
ipcMain.handle('screen:getAllDisplays', () => {
  const displays = screen.getAllDisplays();
  const primaryId = screen.getPrimaryDisplay().id;
  return displays.map((d) => ({
    id: d.id,
    label: d.label || `Display ${d.id}`,
    bounds: { x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height },
    workArea: { x: d.workArea.x, y: d.workArea.y, width: d.workArea.width, height: d.workArea.height },
    scaleFactor: d.scaleFactor,
    rotation: d.rotation,
    isPrimary: d.id === primaryId,
    internal: d.internal === true,
  }));
});
```

### Step 1.3: Add window:openOnDisplay handler

```js
// Open a child window at a specific position/size (used by multi-screen layouts).
// The current setWindowOpenHandler denies window.open() — this IPC path
// allows the renderer to request main-process-controlled window creation.
ipcMain.handle('window:openOnDisplay', async (_event, options) => {
  const { url, x, y, width, height, role } = options || {};
  if (typeof url !== 'string') throw new Error('url required');
  if ([x, y, width, height].some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
    throw new Error('numeric x, y, width, height required');
  }

  // Only allow opening URLs we trust: localhost (dev), or our own file:// origin
  const allowed =
    url.startsWith('http://localhost:5173') ||
    url.startsWith('file://') ||
    url.startsWith(`file://${__dirname}/dist/`);
  if (!allowed) throw new Error('disallowed url');

  const child = new BrowserWindow({
    x, y, width, height,
    frame: false,
    resizable: true,
    fullscreenable: true,
    title: role ? `Future Pinball — ${role}` : 'Future Pinball',
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  child.setMenuBarVisibility(false);
  child.webContents.session.setPermissionRequestHandler((_wc, _p, cb) => cb(false));
  child.webContents.on('will-navigate', (event, navUrl) => {
    if (!navUrl.startsWith('http://localhost:5173') && !navUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });
  child.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  child.loadURL(url);

  const id = nextChildId++;
  childWindows.set(id, child);
  child.on('closed', () => childWindows.delete(id));
  return id;
});
```

### Step 1.4: Add window:close handler

```js
ipcMain.handle('window:close', (_event, id) => {
  const w = childWindows.get(id);
  if (w && !w.isDestroyed()) {
    w.close();
  }
  childWindows.delete(id);
});
```

### Step 1.5: Add window:closeAllChildren (cleanup helper)

```js
ipcMain.handle('window:closeAllChildren', () => {
  for (const w of childWindows.values()) {
    if (!w.isDestroyed()) w.close();
  }
  childWindows.clear();
});
```

### Step 1.6: Commit

```bash
git add electron-main.cjs
git commit -m "feat(electron): add IPC handlers for display enum + child windows"
```

---

## Task 2: Expose IPC bridge in electron-preload.cjs

### Step 2.1: Extend contextBridge.exposeInMainWorld('electronAPI', { ... })

In `electron-preload.cjs`, after the existing `removeUpdateListeners` entry, add:

```js
  // Multi-screen support (Electron-only path)
  getAllDisplays: () => ipcRenderer.invoke('screen:getAllDisplays'),
  openWindow: (options) => ipcRenderer.invoke('window:openOnDisplay', options),
  closeWindow: (id) => ipcRenderer.invoke('window:close', id),
  closeAllChildWindows: () => ipcRenderer.invoke('window:closeAllChildren'),
```

### Step 2.2: Commit

```bash
git add electron-preload.cjs
git commit -m "feat(electron): expose getAllDisplays + child-window APIs to renderer"
```

---

## Task 3: Renderer detection + window opening via electronAPI

### Step 3.1: Write failing tests

Create `src/__tests__/multiscreen-bridge.test.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../script-engine', () => ({ runFPScript: vi.fn(), resolveSoundForPlayback: vi.fn() }));
vi.mock('../audio-system', () => ({ getAudioCtx: vi.fn(), playFPTMusic: vi.fn() }));
vi.mock('cfb', () => ({}));

import { MultiScreenWindowManager } from '../multiscreen-window-manager';

describe('MultiScreenWindowManager Electron bridge', () => {
  beforeEach(() => {
    delete (window as any).electronAPI;
  });

  it('uses electronAPI.getAllDisplays when available', async () => {
    (window as any).electronAPI = {
      getAllDisplays: vi.fn().mockResolvedValue([
        { id: 1, label: 'Primary', bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 }, scaleFactor: 1, rotation: 0, isPrimary: true, internal: false },
        { id: 2, label: 'Backglass', bounds: { x: 1920, y: 0, width: 1280, height: 1024 }, workArea: { x: 1920, y: 0, width: 1280, height: 1024 }, scaleFactor: 1, rotation: 0, isPrimary: false, internal: false },
        { id: 3, label: 'DMD', bounds: { x: 1920, y: 1024, width: 1280, height: 320 }, workArea: { x: 1920, y: 1024, width: 1280, height: 320 }, scaleFactor: 1, rotation: 0, isPrimary: false, internal: false },
      ]),
    };

    const mgr = new MultiScreenWindowManager();
    await mgr.detectScreens();
    expect((window as any).electronAPI.getAllDisplays).toHaveBeenCalledTimes(1);
    expect(mgr.getScreens().length).toBe(3);
  });

  it('falls back to browser API when electronAPI is not available', async () => {
    const mgr = new MultiScreenWindowManager();
    await mgr.detectScreens();
    // Browser fallback returns at least 1 screen (the current one)
    expect(mgr.getScreens().length).toBeGreaterThanOrEqual(1);
  });
});
```

### Step 3.2: Modify src/multiscreen-window-manager.ts

3a. Read the current file structure first (`src/multiscreen-window-manager.ts`). Find the `detectScreens` method (around line 70-88).

3b. Add a new method `detectScreensElectron()` that uses the IPC:

```typescript
  private async detectScreensElectron(): Promise<boolean> {
    const api = (window as any).electronAPI;
    if (!api?.getAllDisplays) return false;
    try {
      const displays = await api.getAllDisplays();
      if (!Array.isArray(displays) || displays.length === 0) return false;
      this.screens = []; // Reset
      displays.forEach((d: any, index: number) => {
        this.screens.push({
          index,
          label: d.label || `Screen ${index + 1}`,
          width: d.bounds?.width ?? 1920,
          height: d.bounds?.height ?? 1080,
          availWidth: d.workArea?.width ?? d.bounds?.width ?? 1920,
          availHeight: d.workArea?.height ?? d.bounds?.height ?? 1080,
          x: d.bounds?.x ?? 0,
          y: d.bounds?.y ?? 0,
          availX: d.workArea?.x ?? d.bounds?.x ?? 0,
          availY: d.workArea?.y ?? d.bounds?.y ?? 0,
          dpi: (d.scaleFactor || 1) * 96,
          isPrimary: !!d.isPrimary,
          isInternal: !!d.internal,
        });
      });
      return true;
    } catch (e) {
      console.warn('[MultiScreen] Electron getAllDisplays failed:', e);
      return false;
    }
  }
```

3c. Modify the existing `detectScreens` method to try Electron first:

```typescript
  async detectScreens(): Promise<void> {
    this.screens = [];

    // Phase 4: Electron IPC path — most reliable when running in Electron
    if (await this.detectScreensElectron()) {
      // Electron path succeeded
    } else if ('getScreenDetails' in window) {
      await this.detectScreensModern();
    } else {
      this.detectScreensFallback();
    }

    console.log(`✓ Detected ${this.screens.length} screen(s)`);
    this.screens.forEach((s) => {
      console.log(
        `  Screen ${s.index + 1}: ${s.width}x${s.height} at (${s.x},${s.y}) ${s.isPrimary ? '[PRIMARY]' : ''}`
      );
    });
  }
```

(If `detectScreens()` is currently NOT async, change its signature to `async`. Update any callers if needed — but the existing logic awaits the modern path internally so this should be a transparent change.)

3d. Modify `openTwoScreenLayout()` and `openThreeScreenLayout()` to use Electron IPC when available.

Find `openThreeScreenLayout(baseUrl)` (around line 304). Wrap each `window.open(url, name, features)` call with an Electron-aware helper:

```typescript
  private async openWindowSmart(url: string, name: string, spec: { left: number; top: number; width: number; height: number }, role: string): Promise<Window | null> {
    const api = (window as any).electronAPI;
    if (api?.openWindow) {
      try {
        const id = await api.openWindow({
          url,
          x: Math.round(spec.left),
          y: Math.round(spec.top),
          width: Math.round(spec.width),
          height: Math.round(spec.height),
          role,
        });
        // Track id for later cleanup
        this.electronWindowIds.set(name, id);
        // Return null — Electron child windows are not exposed as Window objects
        return null;
      } catch (e) {
        console.warn(`[MultiScreen] electronAPI.openWindow failed for ${role}, falling back:`, e);
      }
    }
    const features = this.buildWindowFeatures(spec);
    return window.open(url, name, features);
  }
```

Add a field to track Electron child window IDs:
```typescript
  private electronWindowIds = new Map<string, number>();
```

Replace the existing `window.open` calls in `openThreeScreenLayout` and `openTwoScreenLayout` with calls to `this.openWindowSmart(url, name, spec, role)`. Make those methods `async` if they aren't already.

Example replacement of one block (`openThreeScreenLayout` backglass section):

```typescript
    const backglassUrl = `${baseUrl}?role=backglass&nodmd=1`;
    const bgWindow = await this.openWindowSmart(backglassUrl, 'fpw_backglass', specs.backglass, 'backglass');
    this.windows.set('backglass', bgWindow);
```

(Remove the `buildWindowFeatures` call from outside `openWindowSmart` if it's no longer needed inline, but keep `buildWindowFeatures` as a private method since the helper still uses it for the browser fallback.)

If the close logic exists (search for `windows.forEach((w) => w?.close())` or similar), add Electron cleanup:

```typescript
  async closeAll(): Promise<void> {
    // Browser-side
    this.windows.forEach((w) => { try { w?.close(); } catch {} });
    this.windows.clear();
    // Electron child windows
    const api = (window as any).electronAPI;
    if (api?.closeAllChildWindows) {
      try { await api.closeAllChildWindows(); } catch {}
    }
    this.electronWindowIds.clear();
  }
```

(If a `closeAll` already exists, adapt it to also call the Electron cleanup. If it doesn't exist, add the new method.)

### Step 3.3: Run tests + build

```
npx vitest run src/__tests__/multiscreen-bridge.test.ts
npx vitest run
npx vite build
```

Expected: 2 new tests pass, full suite green, build clean.

### Step 3.4: Commit

```bash
git add src/multiscreen-window-manager.ts src/__tests__/multiscreen-bridge.test.ts
git commit -m "feat(multiscreen): use electronAPI bridge for displays + windows"
```

---

## Task 4: Manual verification

- [x] Run `npm run electron-win`
- [x] Copy `.exe` to cabinet
- [x] Start app on cabinet
- [x] Verify console (F12 if available) shows `Detected 3 screen(s)` with correct dimensions
- [x] Click "3-screen mode" toggle in UI → verify backglass + DMD windows open on the correct displays
- [x] Verify nothing breaks in single-screen mode (default)
- [x] Verify dev mode (`npm run electron-dev` on Mac) still works (should fall through to browser fallback or list 1 macOS display)

---

## Summary

After Phase 4:
- Electron build correctly enumerates all physical displays via main-process `screen` API
- 3-screen cabinet mode actually opens backglass + DMD windows on their target displays
- Browser fallback still works when not in Electron
- Test count: ~669 → ~671

## Out of Scope

- Window positioning across DPI-scaled displays — Electron handles this implicitly via logical coordinates; if visual issues appear, address in a Phase 4b
- Coordinated fullscreen/exit-fullscreen across multiple windows — current code uses HTML5 fullscreen; Electron has its own; align if needed
- BroadcastChannel between Electron BrowserWindows — should work natively; verify with manual test
- Hot-reload of script across multiple windows — orthogonal to display enumeration

## Risks

1. **Electron API differs from existing renderer code's screen-info shape.** The mapping in `detectScreensElectron` flattens it; verify field names match what the rest of the code consumes (e.g. `availX`, `availY` for window placement).
2. **Cabinet PC may have unusual display configs** (rotated, mixed DPI). Electron returns these via `rotation` and `scaleFactor` — surface them but don't block.
3. **Permission dialog on first window:open** — should not occur (no `window.open` call in Electron path), but verify.
4. **Existing `setWindowOpenHandler` keeps denying `window.open`** — this is correct; we route around it via IPC.

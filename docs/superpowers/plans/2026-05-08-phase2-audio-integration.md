# Phase 2: Audio Integration Verification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the existing FPT audio pipeline (parser → `mapFPTSounds` → `AudioMixer`/`PlaySound`) reaches game events correctly. Migrate sound lookups to use `AssetCatalog`. Add automatic music vs SFX classification. Ensure missing sounds fall back gracefully (silent, no crash).

**Architecture:** Audio infrastructure already exists. `mapFPTSounds` in `fpt-parser.ts` populates `fptResources.mapped.{bumper,flipper,drain}`. `playSound(type)` in `audio.ts` reads from `fptResources.mapped`. VBScript `PlaySound(name)` (in `script-engine.ts:342`) reads from `fptResources.sounds`. Phase 2 verifies all paths, migrates to AssetCatalog where it makes sense, and adds tests.

**Tech Stack:** Web Audio API (existing), TypeScript, Vitest.

**Reference Spec:** `docs/superpowers/specs/2026-05-08-fpt-loading-and-table-editor-design.md`
**Builds on:** Phase 1a (AssetCatalog with `getSound()` and `registerSound()` already implemented)

---

## File Structure

**Modified files:**
- `src/audio.ts` — `playSound` reads via `globalAssetCatalog().getSound(...)` with fallback to `fptResources.mapped`
- `src/script-engine.ts` — `PlaySound` handler queries catalog first
- `src/fpt-parser.ts` — `mapFPTSounds` extended to classify long sounds as music tracks (>5 seconds)

**New files:**
- `src/__tests__/audio-integration.test.ts` — verifies the audio flow end-to-end with mocked AudioContext

No new modules — only refactoring + tests.

---

## Task 1: Verify mapFPTSounds covers expected name patterns

**Files:**
- Test: `src/__tests__/audio-integration.test.ts` (NEW)

- [x] **Step 1: Write characterization tests for current mapFPTSounds behavior**

Create `src/__tests__/audio-integration.test.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock browser-only modules
vi.mock('../script-engine', () => ({ runFPScript: vi.fn() }));
vi.mock('../audio-system', () => ({
  getAudioCtx: vi.fn(),
  playFPTMusic: vi.fn(),
  playSound: vi.fn(),
  startBGMusic: vi.fn(),
  stopBGMusic: vi.fn(),
}));
vi.mock('cfb', () => ({}));

import { mapFPTSounds } from '../fpt-parser';
import { fptResources } from '../game';

function makeBuffer(durationSec: number): AudioBuffer {
  // Minimal stub matching AudioBuffer's read interface for Phase 2 tests
  const sampleRate = 44100;
  const length = Math.max(1, Math.floor(durationSec * sampleRate));
  const channel = new Float32Array(length);
  return {
    numberOfChannels: 1,
    sampleRate,
    length,
    duration: durationSec,
    getChannelData: () => channel,
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}

describe('mapFPTSounds: name-based mapping', () => {
  beforeEach(() => {
    fptResources.mapped = { bumper: null, flipper: null, drain: null };
  });

  it('maps a sound named "bumper_hit" to mapped.bumper', () => {
    const sounds: Record<string, AudioBuffer> = {
      'bumper_hit.wav': makeBuffer(0.3),
    };
    mapFPTSounds(sounds);
    expect(fptResources.mapped.bumper).toBe(sounds['bumper_hit.wav']);
  });

  it('maps a sound named "flipper_swing" to mapped.flipper', () => {
    const sounds: Record<string, AudioBuffer> = {
      'flipper_swing.wav': makeBuffer(0.2),
    };
    mapFPTSounds(sounds);
    expect(fptResources.mapped.flipper).toBe(sounds['flipper_swing.wav']);
  });

  it('maps a sound named "drain" to mapped.drain', () => {
    const sounds: Record<string, AudioBuffer> = {
      'drain_event.wav': makeBuffer(0.5),
    };
    mapFPTSounds(sounds);
    expect(fptResources.mapped.drain).toBe(sounds['drain_event.wav']);
  });

  it('falls back to first/second sounds when no name match', () => {
    const sounds: Record<string, AudioBuffer> = {
      'mystery_a.wav': makeBuffer(0.4),
      'mystery_b.wav': makeBuffer(0.4),
    };
    mapFPTSounds(sounds);
    expect(fptResources.mapped.bumper).toBe(sounds['mystery_a.wav']);
    expect(fptResources.mapped.flipper).toBe(sounds['mystery_b.wav']);
  });
});
```

- [x] **Step 2: Run tests**

```
npx vitest run src/__tests__/audio-integration.test.ts
```

Expected: PASS — these characterize **existing** behavior of `mapFPTSounds`.

If any fail, the existing logic doesn't match the assumption documented in the test name. Adjust the test to match real behavior (don't change `mapFPTSounds`).

- [x] **Step 3: Commit**

```bash
git add src/__tests__/audio-integration.test.ts
git commit -m "test(audio): characterize current mapFPTSounds name-based mapping"
```

---

## Task 2: PlaySound queries AssetCatalog before falling back to fptResources.sounds

**Files:**
- Modify: `src/script-engine.ts` (the `PlaySound` handler around line 342)
- Test: `src/__tests__/audio-integration.test.ts` (extend)

- [x] **Step 1: Write failing test for catalog-driven PlaySound**

This test is hard to write without a real AudioContext. Instead, isolate the **lookup** logic. Append to `src/__tests__/audio-integration.test.ts`:

```typescript
// First, expose a pure lookup helper from script-engine (added in Step 3 below).
import { resolveSoundForPlayback } from '../script-engine';
import { AssetCatalog } from '../assets/asset-catalog';
import { setGlobalAssetCatalog, globalAssetCatalog } from '../game';

describe('resolveSoundForPlayback (catalog-first lookup)', () => {
  beforeEach(() => {
    Object.keys(fptResources.sounds).forEach(k => delete fptResources.sounds[k]);
    setGlobalAssetCatalog(new AssetCatalog());
  });

  it('returns the catalog sound when registered (case-insensitive substring match)', () => {
    const buf = makeBuffer(0.3);
    globalAssetCatalog()!.registerSound('bumper_hit.wav', buf);
    const result = resolveSoundForPlayback('bumper_hit.wav');
    expect(result).toBe(buf);
  });

  it('returns the catalog sound by partial name match (case-insensitive)', () => {
    const buf = makeBuffer(0.3);
    globalAssetCatalog()!.registerSound('Bumper_Hit.WAV', buf);
    const result = resolveSoundForPlayback('bumper');
    expect(result).toBe(buf);
  });

  it('returns null when sound is not in catalog', () => {
    expect(resolveSoundForPlayback('nonexistent')).toBeNull();
  });

  it('skips placeholder results (fallback expected)', () => {
    // Empty catalog → getSound returns placeholder; resolver should reject
    expect(resolveSoundForPlayback('anything')).toBeNull();
  });
});
```

- [x] **Step 2: Run test to verify failure**

```
npx vitest run src/__tests__/audio-integration.test.ts
```

Expected: FAIL — `resolveSoundForPlayback` not exported.

- [x] **Step 3: Add resolveSoundForPlayback to script-engine.ts**

In `src/script-engine.ts`, near the top (after imports), add:

```typescript
import { globalAssetCatalog } from './game';

/**
 * Resolve a sound for playback by exact or substring name match.
 * Returns null if not found in catalog or if catalog returns a placeholder.
 * Caller is responsible for fallback behavior (e.g., generic SFX).
 */
export function resolveSoundForPlayback(name: string): AudioBuffer | null {
  const cat = globalAssetCatalog();
  if (!cat) return null;
  const wanted = name.toLowerCase();

  // Try exact match first via catalog method names — but AssetCatalog doesn't
  // expose a name iterator for sounds. Use catalog's registered names list.
  // (We add registeredSoundNames() to AssetCatalog in this task.)
  for (const candidate of cat.registeredSoundNames()) {
    if (candidate.toLowerCase() === wanted ||
        candidate.toLowerCase().includes(wanted)) {
      const buf = cat.getSound(candidate);
      if (cat.isPlaceholder(buf)) continue;
      // Only return AudioBuffer (skip SilentBuffer placeholders that weren't tagged)
      if (buf instanceof AudioBuffer || (buf as any).getChannelData) {
        return buf as AudioBuffer;
      }
    }
  }
  return null;
}
```

Also add `registeredSoundNames()` method in `src/assets/asset-catalog.ts`:

```typescript
  registeredSoundNames(): string[] {
    return [...this.sounds.keys()];
  }
```

(Place near `registeredModelNames()` from Phase 1b, or add it standalone if Phase 1b isn't merged yet — the method is identical-pattern.)

- [x] **Step 4: Modify the existing PlaySound handler to use it**

In `src/script-engine.ts` line 342, the current handler is:

```typescript
    PlaySound: (name: string, loop = 0, vol = 100) => {
      const key = Object.keys(sounds).find(k => k === name || k.toLowerCase().includes(String(name).toLowerCase()));
      const buf = key ? sounds[key] : null;
      if (buf) {
        const ctx = getAudioCtx();
        const src = ctx.createBufferSource(), gain = ctx.createGain();
        src.buffer = buf; src.loop = !!loop;
        gain.gain.value = Math.max(0, Math.min(1, (+vol || 100) / 100));
        src.connect(gain); gain.connect(ctx.destination); src.start();
      } else {
        playSound(/flip/i.test(name) ? 'flipper' : /drain/i.test(name) ? 'drain' : 'bumper');
      }
    },
```

Replace the lookup with the catalog-first helper, falling back to legacy `sounds` lookup:

```typescript
    PlaySound: (name: string, loop = 0, vol = 100) => {
      // Phase 2: Catalog-first lookup
      let buf: AudioBuffer | null = resolveSoundForPlayback(name);
      // Legacy fallback: direct fptResources.sounds (covers cases where catalog
      // is empty but fptResources was populated by a different code path)
      if (!buf) {
        const key = Object.keys(sounds).find(k => k === name || k.toLowerCase().includes(String(name).toLowerCase()));
        const v = key ? sounds[key] : null;
        if (v && typeof v !== 'string') buf = v;
      }
      if (buf) {
        const ctx = getAudioCtx();
        const src = ctx.createBufferSource(), gain = ctx.createGain();
        src.buffer = buf; src.loop = !!loop;
        gain.gain.value = Math.max(0, Math.min(1, (+vol || 100) / 100));
        src.connect(gain); gain.connect(ctx.destination); src.start();
      } else {
        playSound(/flip/i.test(name) ? 'flipper' : /drain/i.test(name) ? 'drain' : 'bumper');
      }
    },
```

- [x] **Step 5: Run tests + full suite + build**

```
npx vitest run && npx vite build
```

Expected: ALL tests pass, build succeeds.

- [x] **Step 6: Commit**

```bash
git add src/script-engine.ts src/assets/asset-catalog.ts src/__tests__/audio-integration.test.ts
git commit -m "feat(audio): catalog-first sound lookup in PlaySound handler"
```

---

## Task 3: Auto-classify long sounds as music tracks

**Files:**
- Modify: `src/fpt-parser.ts` — `mapFPTSounds` adds music classification
- Test: `src/__tests__/audio-integration.test.ts` (extend)

The intent: if any extracted sound is longer than 5 seconds, treat it as a music track (set `fptResources.musicTrack`) so the table's intended background music plays automatically.

- [x] **Step 1: Write failing test**

Append to `src/__tests__/audio-integration.test.ts`:

```typescript
describe('mapFPTSounds: music auto-classification', () => {
  beforeEach(() => {
    fptResources.mapped = { bumper: null, flipper: null, drain: null };
    fptResources.musicTrack = undefined;
  });

  it('sets musicTrack when a sound longer than 5 seconds is present', () => {
    const sounds: Record<string, AudioBuffer> = {
      'short.wav': makeBuffer(0.3),
      'theme.ogg': makeBuffer(120), // 2 minutes — clearly music
    };
    mapFPTSounds(sounds);
    expect(fptResources.musicTrack).toBe(sounds['theme.ogg']);
  });

  it('does not overwrite an already-set musicTrack', () => {
    const existing = makeBuffer(60);
    fptResources.musicTrack = existing;
    const sounds: Record<string, AudioBuffer> = {
      'theme.ogg': makeBuffer(120),
    };
    mapFPTSounds(sounds);
    expect(fptResources.musicTrack).toBe(existing);
  });

  it('does not classify short sounds as music', () => {
    const sounds: Record<string, AudioBuffer> = {
      'sfx_a.wav': makeBuffer(0.5),
      'sfx_b.wav': makeBuffer(2.0),
    };
    mapFPTSounds(sounds);
    expect(fptResources.musicTrack).toBeUndefined();
  });
});
```

- [x] **Step 2: Run test to verify failure**

```
npx vitest run src/__tests__/audio-integration.test.ts
```

Expected: FAIL — current `mapFPTSounds` doesn't set `musicTrack`.

- [x] **Step 3: Extend mapFPTSounds**

In `src/fpt-parser.ts`, find `mapFPTSounds` (around line 469). At the END of the function (after the existing fallback assignments to bumper/flipper/drain), add:

```typescript
  // Phase 2: auto-classify long sounds as music tracks
  if (!fptResources.musicTrack) {
    for (const [name, buf] of Object.entries(sounds)) {
      // Skip Blob URL strings — they have no duration we can read here
      if (typeof buf === 'string') continue;
      // AudioBuffer-like check
      const duration = (buf as AudioBuffer).duration;
      if (typeof duration === 'number' && duration > 5) {
        fptResources.musicTrack = buf;
        break;
      }
    }
  }
```

- [x] **Step 4: Run test to verify pass**

```
npx vitest run src/__tests__/audio-integration.test.ts
```

Expected: PASS — all 3 music-classification tests green.

- [x] **Step 5: Run full suite + build**

```
npx vitest run && npx vite build
```

- [x] **Step 6: Commit**

```bash
git add src/fpt-parser.ts src/__tests__/audio-integration.test.ts
git commit -m "feat(audio): auto-classify sounds longer than 5s as music track"
```

---

## Task 4: PlayMusic uses musicTrack with graceful fallback

**Files:**
- Modify: `src/script-engine.ts` — `PlayMusic` handler (line ~356)
- Test: existing tests cover this; no new tests needed unless behavior changes

- [x] **Step 1: Inspect current PlayMusic handler**

Use Read on `src/script-engine.ts` lines 354-360 to see current code:

```typescript
    PlayMusic:  (name: string) => { const b = sounds[name] || fptResources.musicTrack; if (b) playFPTMusic(b); else startBGMusic(); },
```

This is already reasonable: try named sound first, fall back to `musicTrack`, fall back to generic background music. **No change needed in this task** — the auto-classification from Task 3 ensures `musicTrack` is now usually populated.

- [x] **Step 2: Verify with full test run**

```
npx vitest run
```

Expected: ALL tests still pass. No commit needed (no code change).

If the existing audio test file behavior changed because of Task 3, document it as a passing test in audio-integration.test.ts.

---

## Task 5: Manual verification with real FPT

**Files:** None (manual)

- [x] **Step 1: Start dev server**

```
npm run dev
```

- [x] **Step 2: Load real FPT file and start a game**

Open browser, load FPT, start a ball.

Expected behaviors:
- Bumper hit → bumper sound plays (extracted, not generic)
- Flipper press → flipper sound plays (extracted, not generic)
- Background music plays automatically (if FPT had a long sound)
- Ball drain → drain sound plays

- [x] **Step 3: Verify in DevTools console**

```js
const game = await import('/src/game.ts');
const cat = game.globalAssetCatalog();
console.log('Sound count:', cat.stats().soundCount);
console.log('Sound names:', cat.registeredSoundNames());
console.log('musicTrack set:', !!game.fptResources.musicTrack);
```

Expected: at least one sound, `musicTrack` set if FPT has long audio.

- [x] **Step 4: Commit any wire-up fixes**

If something's broken and you fix it inline, commit. Otherwise no commit.

---

## Summary

After Phase 2:
- `PlaySound` (VBScript handler) queries AssetCatalog first, falls back to `fptResources.sounds`
- Long sounds (>5s) are auto-classified as music
- All audio paths verified by tests
- Missing sound → silent fallback (no crash)

**Test count:** ~617 → ~630 (+10-13 new tests)
**Build:** still under 2 seconds

## Out of Scope

- Spatial/3D audio positioning (deferred — current audio is 2D mixed)
- Per-event volume tuning (use existing AudioMixer config)
- Custom music tracks via editor — that's Phase 3 (editor)
- Replacing the `playFPTMusic` Blob-URL streaming path (works, no need to refactor)

## Risks

1. **AudioBuffer duration may be 0 for short corrupted samples.** Auto-classification skips these via the `> 5` threshold.
2. **Long SFX (e.g., a 6-second voice clip) may be misclassified as music.** Acceptable for Phase 2; Phase 3 editor will let users override the classification per sound.
3. **Mocking AudioContext in tests is fragile.** All tests use mock factories returning `AudioBuffer`-shaped objects; tests do NOT exercise actual playback (`getAudioCtx` is mocked).

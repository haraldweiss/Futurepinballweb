# Design Spec — Real FPT Table Loading + Table Editor

**Date:** 2026-05-08
**Status:** Draft — pending user approval
**Project:** Future Pinball Web (v0.20.0)
**Phase:** Post-Phase 15

## Goal

Enable Future Pinball Web to load real `.fpt` table files and `.fpl` library files from the original Future Pinball community such that:

1. **Graphics render correctly** — extracted models and textures appear in the 3D scene
2. **Audio plays correctly** — extracted music and sound effects play on game events
3. **Tables are fully editable** — users can edit both layout (objects, materials) and VBScript via UI

This is the unifying feature of three project goals: production readiness, feature completeness, and table library support.

## Current State

- FPT parser (`src/fpt-parser.ts`, 1,923 lines) already extracts:
  - Textures (PNG/JPEG via magic-byte detection)
  - Sounds (audio buffers)
  - VBScript source
  - MS3D 3D models
  - Coordinates (bumpers, ramps, walls)
  - Physics parameters
  - Light suggestions
- Editor infrastructure (`src/integrated-editor.ts`) provides a tabbed modal:
  - Playfield tab (2D canvas + 3D preview)
  - Backglass tab
  - DMD tab
  - Video tab
- 563 tests passing, comprehensive documentation in place

**The blocker:** Extracted assets are stored in `fptResources` but the renderer does not consume them. Tables load with only generic placeholder elements.

## Approach: Asset Pipeline First, Editor Second

Selected after considering three approaches:

- **Approach 1 (selected):** Build asset pipeline integration → audio integration → editor enhancement. Solid foundation that scales to all FPT tables.
- Approach 2: Quick editor with partial assets — rejected (creates technical debt)
- Approach 3: One demo table with full editor — rejected (doesn't generalize)

## Architecture

Three layers, with strict separation of concerns:

```
┌─────────────────────────────────────────┐
│  Table Editor UI (modals, panels)       │  ← Phase 3
│  - Object property modal                │
│  - VBScript editor modal                │
│  - Asset browser                        │
│  - Save back to FPT                     │
└────────────────┬────────────────────────┘
                 │ reads/writes
                 ▼
┌─────────────────────────────────────────┐
│  Rendering & Audio (existing)           │  ← Phase 1 + 2 wiring
│  - Three.js scene                       │
│  - AudioMixer                           │
│  - Reads from AssetCatalog              │
└────────────────┬────────────────────────┘
                 │ queries
                 ▼
┌─────────────────────────────────────────┐
│  AssetCatalog (NEW)                     │  ← Phase 1 core
│  - Indexes extracted assets             │
│  - Memory-first, IndexedDB cache        │
│  - Fallback placeholders                │
└────────────────┬────────────────────────┘
                 │ populated by
                 ▼
┌─────────────────────────────────────────┐
│  FPT Parser (existing)                  │
│  - Extracts textures/models/sounds      │
│  - Stores in fptResources               │
└─────────────────────────────────────────┘
```

The key insight: **asset extraction is already working**. The missing layer is `AssetCatalog`, which sits between `fptResources` and the renderer to provide a clean lookup interface.

## Phase 1 — Asset Pipeline Integration

### 1.1 AssetCatalog class

A new module `src/assets/asset-catalog.ts` that:

- Indexes extracted assets by name/ID
- Provides typed lookup methods: `getTexture(name)`, `getModel(name)`, `getSound(name)`
- Returns a fallback (placeholder) when an asset is missing — never throws
- Caches assets in memory by default
- Persists to IndexedDB for cross-session caching (subsequent loads skip extraction)

**Memory strategy:**
- On table load, attempt to fit all assets in memory
- If memory budget exceeded (configurable, default 200 MB), switch to on-demand extraction for remaining assets
- All extracted assets always cached in IndexedDB (keyed by FPT file hash + asset name)

**Fallback behavior:**
- Missing texture → grey 1×1 placeholder texture
- Missing model → 1×1×1 grey cube
- Missing sound → silent buffer

### 1.2 Renderer integration

Modify the playfield builder (in `src/table.ts` and related modules — exact insertion points to be identified during implementation) to:

- Query `AssetCatalog` for textures/models instead of using hardcoded generics
- Apply extracted textures to the playfield surface
- Place MS3D models at extracted coordinates
- Apply extracted physics parameters to bumpers/flippers

The implementation plan will identify the specific files/functions to modify by tracing the current load path from `parseFPTFile` → scene construction.

### 1.3 Visible deliverable

After Phase 1, loading a real FPT file shows the actual table graphics — playfield texture, real bumper models, correct positioning.

## Phase 2 — Audio Integration

### 2.1 Verify existing audio pipeline

The parser already calls `mapFPTSounds()` which feeds sounds into the audio system. Tasks:

- Confirm extracted music tracks (longer audio, e.g., > 5s) route to a "music" channel that loops as background
- Confirm extracted SFX (short audio) route to event-driven playback
- Confirm VBScript `PlaySound("name")` correctly maps to `AudioCatalog` entries
- Add fallback: missing sound → silent (no error, no crash)

### 2.2 Visible deliverable

After Phase 2, loading a real FPT file plays the table's intended music and sound effects on game events.

## Phase 3 — Editor Enhancement

Existing editor modal already has tabs and 2D canvas. Phase 3 extends it for full editability.

### 3.1 Asset Browser

New tab in the integrated editor showing all extracted assets:
- Texture grid (thumbnail + name)
- Model list (name + dimensions)
- Sound list (name + duration + play button)
- "Replace asset" button: upload a new file to override an extracted asset

### 3.2 Object Property Modal

Click any object on the 2D playfield → modal appears:
- Position (X, Y, Z)
- Rotation
- Scale
- Material (dropdown of extracted materials)
- Color
- Type-specific properties (e.g., bumper strength, target reset behavior)

Changes update the 3D preview live.

### 3.3 VBScript Editor Modal

Modal with:
- Syntax-highlighted VBScript editor (use a library like CodeMirror or Monaco)
- "Validate syntax" button
- "Apply" button: hot-reloads the script via `runFPScript()`. Game state (ball position, score) resets on apply, since VBScript may redefine variables.
- Function list / outline for navigation

### 3.4 Save Back to FPT

Two save modes:
- **Save as `.fpt.edited`** (sidecar) — preserves original FPT file
- **Overwrite original** (with confirmation dialog)

Saving requires writing back to CFB/OLE2 format. This is non-trivial; existing parser only reads. Implementation: use the `cfb` library's write mode if available, otherwise build a minimal CFB writer.

### 3.5 Visible deliverable

After Phase 3, users can click on a real loaded table, edit any object's properties, modify the VBScript, and save changes that persist across reloads.

## Implementation Order

1. **Phase 1.1** — AssetCatalog class with tests
2. **Phase 1.2** — Wire renderer to AssetCatalog (visible: real graphics appear)
3. **Phase 2** — Audio verification + fixes (visible: real sounds play)
4. **Phase 3.1** — Asset browser tab (visible: see what was extracted)
5. **Phase 3.2** — Object property modal (visible: edit single object)
6. **Phase 3.3** — VBScript editor modal (visible: edit table logic)
7. **Phase 3.4** — Save back to FPT (visible: persistence)

Each step delivers visible progress. Phase 1.2 alone is a major win.

## Testing Strategy

- **Unit tests** for AssetCatalog: lookup, fallback, memory budget enforcement, IndexedDB cache
- **Integration tests:** load FPT → catalog populated → renderer queries succeed
- **Visual regression tests:** snapshot 1–2 real tables, compare scene state after changes
- **Editor tests:** modal open/close, property changes propagate to scene, VBScript save/load roundtrip
- **Save-roundtrip tests:** edit → save → reload → edits preserved

## Open Questions / Risks

1. **CFB write support** — does the `cfb` library support writing FPT-compatible files? If not, Phase 3.4 grows in scope.
2. **MS3D format coverage** — existing parser may not handle all MS3D variants; some real tables may need parser fixes.
3. **VBScript editor library choice** — Monaco (heavier, full-featured) vs CodeMirror (lighter, easier to embed). Decide during Phase 3.3.
4. **IndexedDB quota on iOS Safari** — limited to ~50 MB on some devices; memory-first strategy already handles this.
5. **Hot-reload of VBScript** — running scripts may have state; reload may need to reset ball/score.

## Success Criteria

A user can:

1. Load a real FPT file → see actual graphics, hear actual audio
2. Click any object → see its properties → edit them → see changes live
3. Open VBScript editor → modify game logic → see changes apply to running table
4. Save the modified table → reload → edits persist

Test suite remains green (current 563 tests + new tests for catalog, editor modals, save/load roundtrip).

## Out of Scope

- Multiplayer table sharing
- Cloud library / table marketplace
- Visual node-based scripting (text-only VBScript editor for now)
- Animation/keyframe editor (existing BAM debugger covers basics)
- Custom physics material editor (use existing 8 materials for now)

These can be future phases once the core editor is solid.

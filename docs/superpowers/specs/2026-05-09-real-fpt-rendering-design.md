# Design Spec — Real FPT-Driven Rendering

**Date:** 2026-05-09
**Status:** Draft — pending user approval
**Project:** Future Pinball Web (v0.20.21+)
**Phase:** Phase B (post Phase 1a-3d, post Phase 4 multi-screen)

## Goal

Render real `.fpt` table files with visual fidelity approaching the original Future Pinball + BAM rendering on a cabinet. Currently the app reads FPT files but renders only generic geometric placeholders driven by hard-coded demo configurations. The user has shown a reference photo of a real cabinet running Future Pinball with the *Willow* table, and wants to reach that level of visual fidelity in the web app.

**Target visual:** real playfield artwork on the table surface, real backglass artwork on the backglass screen, real per-element positions parsed from FPT (bumpers/targets/posts where the table actually places them).

## Current state

- **FPT parser** (`src/fpt-parser.ts`, ~1991 lines) extracts: textures (by name), sounds, MS3D 3D models, coordinates, physics, walls, ramps, VBScript source. Working.
- **AssetCatalog** (`src/assets/asset-catalog.ts`) registers extracted assets. Working.
- **Renderer** (`src/table.ts:buildTable`) consumes a `TableConfig` (hard-coded for demo tables). Renders generic geometry: simple bumpers, targets, slingshots, walls.
- **Multi-screen + cabinet UX** (PR #3) is comprehensive but driven by demo data.
- **The blocker:** the FPT-derived assets reach `fptResources` and `AssetCatalog`, but the renderer ignores them in favor of demo configs. Largest texture is heuristically picked as the "playfield" — often wrong.

## Selected approach: FPT-aware Config Generator

Three approaches were considered (see Brainstorming session):

- **Approach 1: Greenfield FPT renderer** — clean rewrite of rendering pipeline to consume FPT directly. Rejected: too much work, throws away existing renderer.
- **Approach 2: Override demo configs with FPT data** — keep demo path, splice FPT data on top. Rejected: tangled, hard to reason about.
- **Approach 3 (selected): FPT-aware Config Generator** — at load time, parse the FPT and *generate* a `TableConfig` that the existing renderer consumes. Pros: existing renderer reused, clear seam between parsing and rendering, incrementally extensible. Cons: some FPT features won't fit the `TableConfig` shape and will need extension or simplification.

## Architecture

Three new modules under `src/fpt-render/`:

```
src/fpt-render/
├── fpt-to-config.ts         # FPT → TableConfig converter (the heart)
├── fpt-element-parser.ts    # Parses individual Table Element streams
└── fpt-table-scanner.ts     # Auto-scans a directory of .fpt files
```

**Public interfaces:**

```ts
// fpt-to-config.ts
export async function fptToTableConfig(
  fptResources: FPTResources,        // already parsed
  rawBytes: Map<string, Uint8Array>, // Table Data + Table Element raw bytes
  catalog: AssetCatalog
): Promise<TableConfig>;

// fpt-element-parser.ts
export interface FPTElement {
  id: string;           // "Bumper1", "Target3"
  type: ElementType;
  position: { x: number; y: number; z?: number };
  rotation?: number;
  texture?: string;     // Texture name reference
  size?: { w: number; h: number };
  properties: Record<string, any>;
}
export type ElementType = 'bumper' | 'target' | 'post' | 'ramp' | 'light' | 'wall' | 'flipper' | 'unknown';

export function parseTableElement(name: string, bytes: Uint8Array): FPTElement | null;

// fpt-table-scanner.ts
export interface FPTFileEntry {
  path: string;        // Absolute path
  name: string;        // Filename without .fpt
  size: number;        // Bytes
  mtime: number;       // Last modified epoch
  thumbnail?: string;  // Optional data URL (lazy, cached in IndexedDB)
}
export async function scanFPTDirectory(dirPath: string): Promise<FPTFileEntry[]>;
```

**Existing renderer extension:** `TableConfig` gains optional fields:

```ts
interface TableConfig {
  // ... existing fields ...
  playfieldImage?: string;         // texture name (overrides playfieldColor)
  backglassImage?: string;         // texture name (for backglass window)
  fptElements?: FPTElement[];      // overrides hard-coded bumper/target/etc lists
}
```

`buildTable()` checks for the new fields:
- If `playfieldImage` set: apply named texture to the playfield mesh as UV-mapped texture; ignore `playfieldColor`.
- If `fptElements` set: iterate and build meshes per element type at each FPT position; ignore `bumpers/targets/...` arrays.
- Otherwise (demo configs): current behavior.

**Electron IPC for directory scan** (handled in `electron-main.cjs` + preload):
- `ipcMain.handle('fpt:scanDirectory', (_, path) => ...)` — uses `fs.readdir` with `.fpt` filter.
- `electronAPI.scanFPTDirectory(path)` exposed to renderer.

## Data flow

```
1. App start
   └→ Electron scans default directory (~/FuturePinball/Tables/ or saved path)
       └→ Returns FPTFileEntry[] (filename + size + mtime, no parsing)

2. Quick Menu shows table list
   ├→ Demo Tables section (existing 3 demo tables)
   └→ FPT Tables section (auto-scanned files, sortable, searchable)
       ├→ Search box: live filter by filename
       ├→ Sort options: Name | Size | Last modified
       └→ Filter toggles: Demo / FPT (independent)

3. User clicks a table
   ├→ If demo: load existing demo config (current path)
   └→ If FPT:
       ├→ Read file bytes (Electron IPC if available, else fetch)
       ├→ parseFPTFile() — existing function, populates fptResources
       ├→ fptToTableConfig() — NEW
       │   ├→ findPlayfieldImage()
       │   ├→ findBackglassImage()
       │   ├→ parseAllElements()
       │   └→ returns TableConfig with FPT-aware fields
       └→ buildTable(config) — existing rendering pipeline

4. Rendering
   ├→ Playfield mesh: UV-mapped with playfieldImage texture
   ├→ Backglass window: backglassImage as full-canvas background
   └→ Elements: per-element meshes at FPT positions
```

**Path setup:**
- First run: prompt the user via Electron file dialog "Where are your FPT tables?" → path saved in `localStorage.fpw_fpt_directory`.
- Subsequent runs: auto-scan the saved path.
- "Change path" button in Quick Menu (next to scan results).

**Performance considerations:**
- Auto-scan reads only filename/size/mtime — fast even for hundreds of FPT files.
- FPT parsing happens lazily on click. Loading screen with progress shows during the (potentially slow) parse.
- Thumbnails generated lazily after parse, cached in IndexedDB by file path + mtime.

## Phases

The work is split into four shippable phases. Each phase delivers user-visible value on its own.

### Phase B0 — Auto-Scan + Table Browser UI

Prerequisite for everything that follows. Without it, we can't load real FPT files in the app to test against.

**Deliverables:**
- `fpt-table-scanner.ts` with `scanFPTDirectory()` function
- Electron IPC handler + preload exposure
- Quick Menu updated:
  - Demo Tables section (current behavior preserved)
  - FPT Tables section with auto-scan results
  - Search box (live filter by filename)
  - Sort dropdown (Name / Size / Last modified)
  - Filter toggles (Demo / FPT independent)
  - Path setup: dialog + change button
- LocalStorage persistence: `fpw_fpt_directory`

**Acceptance criteria:**
- App starts; if directory is set, FPT list appears in Quick Menu within 1s for ≤1000 files.
- User can search "willow" and see only matching files.
- User can change path; new path replaces displayed list.
- Clicking an FPT file currently loads it via existing parser (no rendering changes yet — covered in B1+).

### Phase B1 — Playfield Image as Table-Surface Texture

Biggest visual jump. Replaces the generic colored playfield with the actual table artwork.

**Deliverables:**
- `findPlayfieldImage()` heuristic in `fpt-to-config.ts`:
  1. Search Table Data ASCII strings for keywords ("playfield", "play", or table-specific names).
  2. Fallback: pick the largest texture with aspect ratio ≥1.5:1 (playfields are taller than wide).
  3. Last resort: pick the largest texture overall (current behavior).
- Extend `TableConfig` with `playfieldImage?: string`.
- Modify `buildTable()` to UV-map the named texture onto the playfield mesh when `playfieldImage` is set.
- Override available in editor: dropdown "Playfield Texture" with all available textures (cycles through).

**Acceptance criteria:**
- Loading Willow.fpt shows the actual Willow table artwork on the playfield surface.
- Loading other FPT files (Pharaoh's Gold, etc.) shows their respective artwork.
- Demo tables still render with their solid colors (no regression).

### Phase B3 — Backglass Image (parallel to B2)

Independent of B2 — Backglass is a separate window with a separate canvas.

**Deliverables:**
- `findBackglassImage()` heuristic:
  1. Search Table Data for "backglass", "back", or known patterns.
  2. Fallback: large texture with aspect ratio ~16:9 or ~4:3 (Backglass is typically landscape).
- Extend `TableConfig` with `backglassImage?: string`.
- Modify Backglass window setup to render the named texture as a full-canvas background; existing score/multiplier overlay stays on top.

**Acceptance criteria:**
- Loading Willow.fpt shows the Willow movie poster / themed artwork as Backglass background.
- Score/multiplier still readable on top of the backglass.
- Demo tables still show the simple Backglass canvas (no regression).

### Phase B2 — FPT Element Positions

Most complex parser work. Replaces hard-coded bumper/target positions with FPT-extracted positions.

**Deliverables:**
- `fpt-element-parser.ts`: parses individual Table Element streams (`Table Element 1` through `Table Element N`).
  - Recognized types: bumper, target, post, ramp, light, wall, flipper.
  - For each: extract id (name), type tag, position (x, y, z), rotation, texture reference, size.
  - Unknown element types → log + skip (no crash).
- `fpt-to-config.ts` aggregates parsed elements into `fptElements: FPTElement[]`.
- `buildTable()` iterates `fptElements`:
  - Bumper → existing `buildBumper()` adapted to take FPT position + texture name
  - Target → existing `buildTarget()` adapted similarly
  - Post → simple cylinder geometry
  - Ramp → existing `buildRamp()` adapted
  - Light → THREE.PointLight at FPT position with FPT color
  - Wall → existing wall builder using extracted wall paths
  - Flipper → existing flipper builder; uses FPT position for left/right
- Demo configs untouched — they go through the old `bumpers`/`targets`/etc. arrays.

**Acceptance criteria:**
- Loading Willow.fpt places at least 80% of bumpers + targets + posts at the positions visible on the table artwork. (Some FPT files have 700+ elements; extracting every one isn't required.)
- Element type coverage: bumpers, targets, posts, ramps, walls, lights — at minimum.
- Element types we don't recognize are logged + skipped, no renderer crash.
- Physics still works: ball can hit bumpers, score increments via existing scoring path.

## Error handling

- **FPT parse failure**: existing `parseFPTFile` already handles this, returns null. UI shows "Could not parse table" message.
- **Missing texture**: `findPlayfieldImage` returns null → fall back to demo's `playfieldColor`. UI logs warning.
- **Unknown element type**: log + skip. Don't crash the renderer.
- **Directory scan failure**: show "No FPT tables found" + button to set/change path.
- **Large file warning**: if FPT > 100MB, show "Loading large table..." spinner with progress.

## Testing

**Unit tests (Vitest):**
- `fpt-element-parser.test.ts`: parses fixture Table Element bytes for each type, checks output shape.
- `fpt-to-config.test.ts`: with mocked FPTResources, generates expected TableConfig fields.
- `fpt-table-scanner.test.ts`: mocks fs.readdir, validates filtering + sorting.

**Integration tests:**
- Load a small known FPT fixture (we'll add one to `src/__fixtures__/`) and verify:
  - Texture extracted
  - At least 1 element parsed
  - TableConfig.playfieldImage set
  - buildTable() produces non-empty scene

**Manual verification:**
- Load Willow.fpt → playfield artwork visible
- Load Pharaoh's Gold FPT (if available) → its artwork visible
- Demo tables (existing 3) still load correctly with simple colors

## Out of scope (explicit YAGNI)

These will be addressed in later phases or separate specs:

- **VBScript engine running real FPT scripts**: existing partial implementation continues; full game logic not part of this phase.
- **Insert lights** (transparent plastic pieces glowing under playfield): requires deeper analysis of element types and Three.js light positioning. Future phase.
- **Complex 3D models** (characters, sculptures, ramp guides): existing MS3D parser extracts data but mounting them at correct positions is significant work. Future phase.
- **Sound playback from FPT scripts**: covered by existing audio integration.
- **Save-back of edits to FPT**: covered by Phase 3d (already in PR #3).
- **PinUp Popper-style branded DMD content**: visual polish for later.

## Open items

- **FPT field-name encoding**: Table Data uses XOR-encoded 4-byte field names that don't decode cleanly with a single key. For B1/B3, ASCII string search is sufficient. For B2, we may need to reverse-engineer the field encoding to extract precise element properties. If reverse-engineering proves slow, fall back to coordinate-only extraction (which already works in `extractFPCoords`).
- **Thumbnails**: post-MVP. Initial table list shows just the filename.

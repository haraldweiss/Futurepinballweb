# FPT/FPL Parser & BAM Engine — Improvements (June 2026)

**Version**: 1.0  
**Date**: 2026-06-20  
**Status**: ✅ Complete (Phase A+B+C)  
**Tests**: 762 passing (34 FPT-specific)  
**Files**: 11 modified across parser + graphics

---

## Overview

Four areas of improvement to the Future Pinball table/library parser and BAM engine:

| Area | Priority | Status | Files |
|---|---|---|---|
| 🟡 Table Elements | High | ✅ Complete | `src/fpt/table-elements.ts` |
| 🟢 BAM Streams in FPTs | High | ✅ Complete | `src/fpt/file-parser.ts` |
| 🔴 FPL Libraries | Medium | ✅ Complete | `src/fpt/file-parser.ts`, `src/fpt/library.ts` |
| 🔵 Error Handling | Medium | ✅ Complete | All parser files |

---

## 1. 🟡 Table Elements — Element Type Classification

**File**: `src/fpt/table-elements.ts`

### Before
- `extractTableCoordsFromCFB()` returned only `{x, y}` coordinates
- No element type, name, or classification
- All elements were indistinguishable

### After
- `extractTableElementsFromCFB()` returns `ParsedTableElement[]` with:
  - `type` (numeric element type code)
  - `kind` (human-readable classification from `ELEM_TYPE` lookup)
  - `name` (element name from UTF-16-LE NAME TLV block)
  - `x`, `y` (coordinates from COOR TLV block)

### Element Type Map (`ELEM_TYPE`)

| Code | Kind | Description |
|---|---|---|
| 1 | `bumper` | Bumper element |
| 2 | `trigger` | Trigger / switch |
| 3 | `light` | Light element |
| 4 | `gate` | Gate / stopper |
| 5 | `flipper` | Flipper element |
| 6 | `target` | Target element |
| 7 | `slingshot` | Slingshot rubber |
| 8 | `kickback` | Kickback / ball save |
| 9 | `kicker` | Kicker / bouncer |
| 10 | `spinner` | Spinner element |
| 11 | `rollover` | Rollover element |
| 12 | `wall` | Wall / divider |
| 13 | `ramp` | Ramp element |
| 14 | `lane` | Lane / channel |
| 15 | `rail` | Rail / guide |
| 16 | `surface` | Surface / playfield area |
| 17 | `decal` | Decal / overlay |
| 18 | `post` | Rubber post / bumper stand |
| 19 | `magic` | Mystery / special element |
| 20 | `effect` | Visual effect emitter |
| 21 | `decorative` | Decorative / non-interactive |

### API

```typescript
// New — returns full typed elements
extractTableElementsFromCFB(
  cfb: CFB$Container,
  options?: { kindFilter?: string[]; includeIncomplete?: boolean }
): ParsedTableElement[]

// Preserved (backward-compatible)
extractTableCoordsFromCFB(cfb: CFB$Container): { x: number; y: number }[]
```

### Test Coverage
- 34 tests in `src/__tests__/fpt-legacy.test.ts`
- Covers: all element types, incomplete elements, validation, coordinate accuracy

---

## 2. 🟢 BAM Streams in FPT Files

**File**: `src/fpt/file-parser.ts`

### New Function

```typescript
tryParseBAMConfigFromCFB(cfb: CFB$Container): BAMStreams | null
```

Detects and categorizes BAM extension streams embedded in `.fpt` CFB containers:

| Stream Pattern | Category | Description |
|---|---|---|
| `BAM Animation *` | `bamAnimations` | Animation sequences |
| `BAM Lighting *` | `bamLighting` | Lighting configurations |
| `BAM Physics *` | `bamPhysics` | Physics presets |

### Behavior
- Best-effort detection (try/catch wrapped)
- Returns `null` if no BAM streams found (pure FP table)
- Returns categorized `BAMStreams` object with `{ bamAnimations, bamLighting, bamPhysics }`
- Each category is an array of `{ name, bytes }` pairs

### Integration
Called from `parseFPTFile()` during table loading. BAM streams are logged but not yet rendered — foundation for future BAM runtime integration.

---

## 3. 🔴 FPL Library Improvements

**Files**: `src/fpt/file-parser.ts`, `src/fpt/library.ts`

### Extended `parseFPLFile()`
- Now detects and categorizes BAM-specific streams in `.fpl` library files
- `ParsedLibrary` interface enriched with `bamAnimations`, `bamLighting`, `bamPhysics` collections
- Physics JSON presets are detected and parsed (matches `/physics|preset|config/i.test(name)`)

### Enhanced `detectLibraryDependencies()`
- Added BAM-specific pattern matching for:
  - `bam.load('...')` — BAM library load
  - `bam.import('...')` — BAM module import
  - `bam.require('...')` — BAM dependency require
- Case-insensitive matching
- Returns `LibraryDependency[]` with typed `required` flag

### Library Cache
- `getLibraryCache()` provides TTL-based caching (default: 5 min)
- Category summary logged on load: e.g., `"4 bumpers, 2 targets, 1 ramp, 3 scripts"`

---

## 4. 🔵 Error Handling & Graceful Degradation

All parsing functions follow a consistent pattern:

```typescript
function tryParseXxx(bytes: Uint8Array): Result | null {
  try {
    // ... parsing logic ...
    return result;
  } catch (err) {
    logMsg(`⚠️ Failed to parse Xxx: ${err instanceof Error ? err.message : String(err)}`, 'warn');
    return null;
  }
}
```

### Principles
- **No crashing parser**: Every extraction is wrapped in try/catch
- **Null returns**: Failed extractions return `null` or empty arrays, never throw
- **Backward-compatible**: All existing API signatures preserved
- **Informative logging**: Each failure logs a warning with context

### Error Recovery Chain
```
extractTableElementsFromCFB() → null → caller uses empty array
tryParseBAMConfigFromCFB()   → null → BAM skipped, table loads normally
parseFPLFile()               → onError callback → UI shows error toast
detectLibraryDependencies()  → [] → no deps detected, loading continues
```

---

## File Reference

| File | LoC | Role |
|---|---|---|
| `src/fpt/table-elements.ts` | ~300 | Table element parser + type classification |
| `src/fpt/file-parser.ts` | ~580 | Main FPT/FPL loader + BAM stream detection |
| `src/fpt/library.ts` | ~280 | Library dependency detection + BAM pattern matching |
| `src/fpt-parser.ts` | 20 | Barrel re-export wrapper |

---

## Test Suite

```
Test Files  36 passed (36)
Tests       762 passed (762)
```

FPT-specific tests in `src/__tests__/fpt-legacy.test.ts` cover:
- All 21 element types
- Coordinate extraction accuracy (±0.005)
- UTF-16-LE name decoding
- Unknown/invalid element handling
- Backward compatibility with old API
- Edge cases (empty containers, truncated data)

---

## Future Work (Phase D+)

- **BAM runtime integration**: Connect parsed BAM configs to the BAMEngine runtime
- **Element rendering**: Map parsed `ParsedTableElement` to Three.js mesh generation
- **FPL Editor**: Visual library browser with dependency graph
- **BAM stream roundtrip**: Write BAM configs back to FPL files

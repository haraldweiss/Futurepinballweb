# Phase 7: Visual Enhancements — Implementation Plan

## Overview

Phase 7 focuses on extracting original 3D models and implementing advanced material systems from the FPT files to significantly improve visual fidelity.

**Goal**: Replace procedural geometry with original 3D models, add material group system
**Estimated Time**: 8-10 hours
**Expected Visual Improvement**: 30-50% better table appearance

---

## Task Breakdown

### Task 1: Analyze FPT Model Storage (1-2 hours)
**Objective**: Understand how models are stored in FPT files

1. **Research MS3D Format**
   - MS3D = Milkshape 3D binary format
   - Proprietary but documented format
   - Contains: vertices, triangles, materials, bones

2. **Search for Models in FPT**
   - Look for .ms3d stream names
   - Common names: "PlungerCase.ms3d", "[Model]", "Mesh", etc.
   - Binary signature for MS3D files

3. **Extract Sample Model**
   - Find a known model (e.g., PlungerCase.ms3d)
   - Extract raw bytes
   - Parse header to understand structure

4. **Document Findings**
   - Stream naming patterns
   - File signatures
   - Data structures

### Task 2: Implement MS3D Parser (3-4 hours)
**Objective**: Create parser for MS3D models

1. **MS3D Binary Format Parser**
   - Parse header (magic bytes, version)
   - Parse vertices (position, normal, texture coords)
   - Parse triangles (indices, material ID)
   - Parse materials (color, texture refs)

2. **Convert to Three.js Format**
   - Create BufferGeometry from parsed data
   - Load materials
   - Handle UV mapping

3. **Fallback Strategy**
   - If parsing fails, use procedural geometry
   - Log warnings for debugging
   - Graceful degradation

4. **Performance Optimization**
   - Cache parsed models
   - Reuse for multiple instances
   - Lazy loading if needed

### Task 3: Integrate Model Extraction (2-3 hours)
**Objective**: Extract models from FPT and use in game

1. **Modify FPT Parser**
   - Add `extractModels()` function
   - Search for .ms3d files in streams
   - Parse and cache models

2. **Update Table Builder**
   - Pass models to `buildTable()`
   - Use extracted models for elements
   - Fall back to procedural if unavailable

3. **Implement Model Library**
   - Cache extracted models globally
   - Reuse across multiple tables
   - Memory-efficient management

### Task 4: Material Group System (2-3 hours)
**Objective**: Implement Newton-style material interactions

1. **Material System Design**
   - Define material types (ball, metal, rubber, plastic, etc.)
   - Create material pair interactions
   - Friction/restitution per pair

2. **Physics Integration**
   - Create material groups in Rapier2D
   - Assign materials to colliders
   - Apply per-pair physics

3. **Testing & Tuning**
   - Test different material combinations
   - Verify realistic behavior
   - Tune for game feel

---

## Technical Implementation Details

### MS3D Format (Simplified)

```
MS3D Header:
  4 bytes: "MS3D" (magic)
  4 bytes: version (integer)

Vertices Section:
  2 bytes: vertex count
  For each vertex:
    3 × 4 bytes: float[3] position (x, y, z)
    3 × 4 bytes: float[3] normal
    2 × 4 bytes: float[2] texture coords (u, v)
    1 byte: bone ID

Triangles Section:
  2 bytes: triangle count
  For each triangle:
    2 bytes: flags
    3 × 2 bytes: uint16[3] vertex indices
    3 × 3 × 4 bytes: float[3][3] vertex normals
    3 × 2 × 4 bytes: float[2][3] texture coords
    1 byte: smoothing group
    1 byte: material ID

Materials Section:
  1 byte: material count
  For each material:
    32 bytes: material name (string)
    4 × 4 bytes: float[4] ambient RGBA
    4 × 4 bytes: float[4] diffuse RGBA
    4 × 4 bytes: float[4] specular RGBA
    4 × 4 bytes: float[4] emissive RGBA
    4 bytes: float: shininess
    4 bytes: float: transparency
    1 byte: mode
    32 bytes: texture filename
    ...
```

### Implementation Strategy

```typescript
// Phase 7: Model Extraction from FPT

interface MS3DVertex {
  position: [number, number, number];
  normal: [number, number, number];
  texCoords: [number, number];
  boneID: number;
}

interface MS3DMaterial {
  name: string;
  ambient: [number, number, number, number];
  diffuse: [number, number, number, number];
  specular: [number, number, number, number];
  emissive: [number, number, number, number];
  shininess: number;
  transparency: number;
  textureFile: string;
}

interface MS3DModel {
  vertices: MS3DVertex[];
  triangles: Array<{
    indices: [number, number, number];
    materialID: number;
  }>;
  materials: MS3DMaterial[];
}

// Parser function
function parseMS3D(bytes: Uint8Array): MS3DModel | null {
  // Parse header
  // Parse vertices
  // Parse triangles
  // Parse materials
  // Return MS3DModel
}

// Convert to Three.js
function ms3dToThreeJS(model: MS3DModel): THREE.Mesh {
  // Create BufferGeometry
  // Load materials
  // Return Mesh
}
```

---

## Current Procedural Geometry (To Replace)

```typescript
// Current bumper (procedural)
const bumperBody = new THREE.CylinderGeometry(0.45, 0.55, 0.20, 32, 3);
const bumperRing = new THREE.TorusGeometry(0.36, 0.10, 12, 48);

// After: Use extracted MS3D models instead
// Falls back to procedural if model unavailable
```

---

## Material Group System Design

```typescript
// Newton-style material interactions
interface MaterialDefinition {
  id: string;
  name: string;
  friction: number;
  restitution: number;
  density?: number;
  color?: THREE.Color;
}

interface MaterialInteraction {
  material1: string;
  material2: string;
  friction: number;
  restitution: number;
}

const materials = {
  ball: { id: 'ball', name: 'Ball', friction: 0.1, restitution: 0.8 },
  bumper: { id: 'bumper', name: 'Bumper', friction: 0.2, restitution: 0.9 },
  flipper: { id: 'flipper', name: 'Flipper', friction: 0.6, restitution: 0.7 },
  ramp: { id: 'ramp', name: 'Ramp', friction: 0.4, restitution: 0.6 },
  wall: { id: 'wall', name: 'Wall', friction: 0.2, restitution: 0.7 },
};

const interactions: MaterialInteraction[] = [
  { material1: 'ball', material2: 'bumper', friction: 0.2, restitution: 0.9 },
  { material1: 'ball', material2: 'flipper', friction: 0.6, restitution: 0.7 },
  { material1: 'ball', material2: 'ramp', friction: 0.4, restitution: 0.6 },
  // ... more interactions
];
```

---

## Files to Create/Modify

### New Files
1. `src/models/ms3d-parser.ts` — MS3D format parser
2. `src/models/model-loader.ts` — Model extraction and caching
3. `src/physics/material-system.ts` — Material group management

### Modified Files
1. `src/fpt-parser.ts` — Add model extraction
2. `src/table.ts` — Use extracted models
3. `src/main.ts` — Initialize material system

---

## Testing Strategy

### Unit Tests
- [ ] MS3D parser correctly reads format
- [ ] Vertex/triangle extraction accurate
- [ ] Three.js conversion works
- [ ] Fallback to procedural geometry

### Integration Tests
- [ ] Models load from FPT
- [ ] Models display correctly
- [ ] Physics still works with new geometry
- [ ] Material interactions correct

### Visual Tests
- [ ] Bumpers look like original
- [ ] Flippers properly shaped
- [ ] Ramps curved correctly
- [ ] Textures apply properly

### Performance Tests
- [ ] No FPS regression
- [ ] Memory usage acceptable
- [ ] Load time reasonable

---

## Success Criteria

✅ Successfully extract models from FPT files
✅ Convert MS3D to Three.js geometry
✅ Display original 3D models in game
✅ Fallback gracefully to procedural
✅ Implement material group system
✅ No physics regressions
✅ Build still clean and fast (<800ms)
✅ Visual quality improved 30-50%

---

## Timeline Estimate

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 7.1 | Analyze FPT/MS3D | 1-2h | PENDING |
| 7.2 | Implement MS3D parser | 3-4h | PENDING |
| 7.3 | Integrate model extraction | 2-3h | PENDING |
| 7.4 | Material group system | 2-3h | PENDING |
| **Total** | **All tasks** | **8-10h** | **PENDING** |

---

## Next Steps

1. Begin with Task 1: Analyze FPT model storage
2. Research MS3D format details
3. Create parser implementation
4. Test extraction with sample models
5. Integrate into game
6. Implement material system
7. Test and optimize

---

**Status**: READY TO IMPLEMENT
**Complexity**: High (format parsing, geometry conversion)
**Risk Level**: Medium (fallback strategy mitigates risks)
**Visual Impact**: 🟢 HIGH (30-50% improvement expected)


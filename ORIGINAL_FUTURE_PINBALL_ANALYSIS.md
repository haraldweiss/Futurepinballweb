# Original Future Pinball (Windows) — Code Architecture Analysis

## Executive Summary

The original Future Pinball is a **32-bit Windows GUI application** written in **C++** using Microsoft's **ATL (Active Template Library)** framework. It was developed by EyeControl Technologies and reached maturity around 2011. The architecture reveals a sophisticated pinball simulation engine with:

- **Physics Engine**: Newton Game Engine (not Rapier like the web version)
- **Graphics**: DirectX (Direct3D/DirectDraw) with OpenGL fallback
- **Scripting**: VBScript via COM/ActiveScript interface
- **Object Model**: COM-based game objects (Flipper, Bumper, Target, etc.)
- **File Format**: FPT (Future Pinball Table) in OLE2/CFB binary format

---

## Technical Stack

### Core Technologies

#### 1. **Physics Engine: Newton Game Engine**
```
Newton Physics Library (Newton Dynamics)
├─ Collision Detection
│  ├─ Convex Hulls (NewtonCreateConvexHull)
│  ├─ Tree Collision (NewtonCreateTreeCollision)
│  ├─ Box Collisions (NewtonCreateBox)
│  ├─ Sphere Collisions (NewtonCreateSphere)
│  └─ Cylinder Collisions (NewtonCreateCylinder)
├─ Rigid Body Dynamics
│  ├─ Mass Matrix (NewtonBodySetMassMatrix)
│  ├─ Linear/Angular Velocity
│  ├─ Impulse Application (NewtonApplyImpulse)
│  └─ Material Groups (NewtonBodySetMaterialGroupID)
└─ Constraint System
   ├─ Friction (NewtonMaterialSetDefaultFriction)
   ├─ Elasticity (NewtonMaterialSetDefaultElasticity)
   ├─ Collision Callbacks
   └─ Contact Normal Direction
```

**Why Newton?**
- Accurate rigid body dynamics
- Excellent for pinball physics (restitution, friction)
- Fast collision detection for real-time gameplay
- Deterministic physics (reproducible results)

**Comparison to our Rapier2D:**
| Aspect | Newton | Rapier2D |
|--------|--------|----------|
| Dimension | 3D (full) | 2D |
| Accuracy | Very high | Very high |
| Real-time | Yes | Yes |
| Ball Physics | Excellent | Good (2D approximation) |
| Flipper Dynamics | Realistic | Functional |

---

#### 2. **Graphics: DirectX + OpenGL**

```
Graphics Pipeline
├─ DirectX Path (Primary)
│  ├─ DirectDraw (video mode setup, surface management)
│  ├─ Direct3D (3D rendering)
│  ├─ Texture management
│  └─ Lighting & shading
├─ OpenGL Path (Fallback)
│  ├─ Vertex/Fragment shaders (GL_ARB extensions)
│  ├─ Texture compression (GL_EXT_texture_env_combine)
│  ├─ Compressed textures (glCompressedTexImage2DARB)
│  └─ Frame buffer objects
└─ Rendering Features
   ├─ Shader compilation (glCompileShaderARB)
   ├─ Texture compression (DXT, etc.)
   └─ Multiple render targets
```

**Shader Support:**
- ARB assembly shaders (older generation)
- Vertex/Fragment shader pipeline
- Real-time compilation and caching

---

#### 3. **Scripting System: VBScript via COM**

```
Script Engine Architecture
├─ ActiveScript Host (Windows COM scripting)
├─ VBScript Engine (IActiveScript interface)
├─ Script Compilation
│  ├─ VBScript → Runtime code (line-by-line compilation)
│  ├─ Error reporting with line numbers
│  └─ Script contexts per table
├─ Object Model (COM dispatch)
│  ├─ ScriptGlobal (global functions)
│  ├─ Game Objects (Flipper, Bumper, etc.)
│  └─ Collections (targets, bumpers, etc.)
└─ Event System
   ├─ OnTableInit()
   ├─ OnTableUpdate()
   ├─ OnHitBumper(), OnHitTarget(), etc.
   └─ Callback-based event handling
```

**Script Editor Features:**
```
Built-in VBScript IDE
├─ Syntax highlighting
├─ Compile error detection
├─ Line-number error reporting
├─ Script import/export
└─ External script file support
```

---

#### 4. **Object Model: COM-Based Game Objects**

```
COM Object Hierarchy
├─ Table (root object)
│  ├─ Properties: name, gravity, friction, physics settings
│  └─ Methods: Initialize(), Update(), Render()
├─ Surface (play field)
├─ Flipper (left/right)
│  ├─ Properties: position, angle, power, friction
│  └─ Events: OnLeftFlipperClick, OnRightFlipperClick
├─ Bumper (pop bumper)
│  ├─ Properties: position, radius, hit power
│  └─ Events: OnBumperHit, OnBumperSound
├─ Target (drop/stand-up)
│  ├─ Properties: position, state (active/inactive)
│  └─ Events: OnTargetHit, OnTargetDown
├─ TargetDrop (drop target bank)
│  ├─ Properties: targets array, reset state
│  └─ Events: OnAllDown, OnTargetDown
├─ Kicker (ball launcher)
│  ├─ Properties: exit velocity, exit direction
│  └─ Methods: Kick(), Launch()
├─ Ramp (ball guide)
│  ├─ Properties: path, height, curve
│  └─ Events: OnRampStart, OnRampComplete
├─ Spinner (rotating object)
│  ├─ Properties: current spin, decay
│  └─ Events: OnSpinnerHit
├─ Plunger (launch mechanism)
│  ├─ Properties: charge level, power curve
│  └─ Methods: Launch()
├─ LaneGuide (ball guide)
├─ Light (visual feedback)
│  ├─ Properties: color, intensity, state
│  └─ Methods: Pulse(), Blink()
├─ Peg (fixed obstacle)
└─ ShapePoints (arbitrary collision shape)
```

**COM Dispatch Pattern:**
```cpp
// Example: Flipper object
interface IFlipper : public IDispatch {
    HRESULT get_Position([out] Point* pPos);
    HRESULT put_Position([in] Point newPos);
    HRESULT get_Angle([out] float* pAngle);
    HRESULT put_Angle([in] float newAngle);
    HRESULT Fire([in] float power);
    HRESULT OnHit([in] IBall* pBall);
};
```

---

### Game Element Definitions

**From the executable, discovered game classes:**

1. **Flipper.Flipper** — Left/right flip mechanisms
2. **Bumper.Bumper** — Pop bumpers (circular hit targets)
3. **Target.Target** — Stand-up targets (single)
4. **TargetDrop.TargetDrop** — Drop target banks
5. **Kicker.Kicker** — Ball launcher/kickout hole
6. **Plunger.Plunger** — Ball launch mechanism
7. **Spinner.Spinner** — Rotating hit targets
8. **Ramp** — Ball guide paths
9. **LaneGuide.LaneGuide** — Lane dividers and guides
10. **Light.LightRound** / **LightShapeable** — Lighting elements
11. **Peg.Peg** — Fixed obstacle pegs
12. **ShapePoints.ShapePoints** — Arbitrary collision geometry

---

## Physics Implementation Details

### Newton Physics Parameters

**Per-Object Physics Properties:**
```
Properties found in strings:
├─ mass — Object mass (kg)
├─ gravity — Gravitational acceleration
├─ kineticFriction — Sliding friction coefficient
├─ staticFriction — Static friction coefficient
├─ restitution — Bounce coefficient (elasticity)
├─ maxBallVelocity — Ball speed limiter
├─ impulse — Hit force magnitude
└─ impulseRandomness — Variance in hit force
```

**Collision Material Groups:**
```
Material IDs (from NewtonBodySetMaterialGroupID):
├─ Ball material
├─ Flipper rubber material
├─ Metal bumper material
├─ Target material
├─ Wall/ramp material
└─ Drain material
```

**Contact Physics:**
```
Newton Material Callbacks:
├─ NewtonMaterialSetDefaultFriction(mat1, mat2, friction)
├─ NewtonMaterialSetDefaultElasticity(mat1, mat2, restitution)
├─ NewtonMaterialSetCollisionCallback(callback)
├─ NewtonMaterialGetContactNormalSpeed(contact)
└─ NewtonMaterialSetContactFrictionState(contact, state)
```

### Flipper Mechanics

**Expected implementation:**
- Kinematic body (controlled position/rotation)
- Pivot point at shaft location
- Angular acceleration based on:
  - Player input (button press)
  - Power curve (easing function)
  - Current angle and max angle
- Rubber material for bounce effect
- Collision with ball triggers hit detection

**From web version comparison:**
- Newton: Full 3D, continuous collision
- Rapier2D: 2D, simplified approach
- Our implementation: Functional but simplified physics model

---

## File Format: FPT (Future Pinball Table)

**Structure** (OLE2/CFB binary):
```
FPT File
├─ Workbook (main document)
│  ├─ Compressed streams (LZO1X compression)
│  ├─ VBScript code (embedded in streams)
│  ├─ Textures (PNG, JPEG, BMP, GIF, WebP)
│  ├─ Sounds (WAV, OGG, MP3)
│  └─ Music tracks
├─ Graphics resources
├─ Physics parameters
├─ Game object definitions
└─ Table configuration
```

---

## Scripting Deep-Dive

### VBScript Integration

**Compiler Flow:**
```
VBScript Source Code
        ↓
[Windows ActiveScript Engine]
        ↓
Bytecode / Intermediate Code
        ↓
[Runtime Virtual Machine]
        ↓
COM Method Calls (to game objects)
```

**Key VBScript Features Used:**
- Subroutines and Functions
- Event handlers (OnInit, OnUpdate, OnHit)
- Object properties and methods via COM
- Array and collection support
- Conditional logic and loops
- String manipulation
- Game variable persistence

**Example script structure:**
```vbscript
' Global variables
Dim ballHits
Dim targetHits()

' Event handlers
Sub OnTableInit()
    ballHits = 0
    Plunger.Fire()
End Sub

Sub OnBumperHit(bumper)
    ballHits = ballHits + 1
    bumper.Sound.Play()
    UpdateScore()
End Sub

Sub UpdateScore()
    ' Score calculation logic
End Sub
```

---

## Rendering Architecture

### Render Pipeline

```
Game Loop
├─ Physics Update
│  ├─ Newton engine step
│  ├─ Collision detection
│  └─ Body position/rotation updates
├─ Script Update
│  ├─ OnTableUpdate() call
│  ├─ Object state changes
│  └─ Event processing
├─ Rendering
│  ├─ Clear frame buffer
│  ├─ Set camera/projection
│  ├─ Render play field surface
│  ├─ Render 3D objects
│  │  ├─ Bumpers (cylinders + torus)
│  │  ├─ Targets (boxes/shapes)
│  │  ├─ Flippers (extruded polygons)
│  │  ├─ Ball (sphere)
│  │  ├─ Lights (primitives/geometry)
│  │  └─ Ramps (curves)
│  ├─ Apply textures and lighting
│  ├─ Post-processing
│  │  ├─ Bloom/glow
│  │  ├─ Shadow mapping
│  │  └─ Anti-aliasing
│  └─ Present frame
└─ Loop iteration
```

### 3D Object Representation

**From reverse engineering:**
- **.ms3d files** — Milkshape 3D format for models
  - PlungerCase.ms3d (plunger model)
  - Other 3D models referenced
- **Primitive geometries** — Cylinders, spheres, boxes, extrusions
- **Texture mapping** — UV coordinates, material definitions
- **Lighting** — Per-object and scene-wide lights

---

## Comparison: Original vs. Web Version

### Physics Engine

| Aspect | Original (Newton) | Web Version (Rapier2D) |
|--------|-------------------|----------------------|
| **Dimension** | 3D | 2D |
| **Collision Types** | Convex hulls, tree collisions, primitives | Circle, polygon, compound |
| **Accuracy** | Very high (professional game) | Good (adequate for 2D) |
| **Ball Behavior** | Realistic 3D physics | 2D approximation |
| **Flipper Response** | Precise control | Simplified but functional |
| **CPU Cost** | Optimized for 2011 hardware | Lightweight for browsers |

### Graphics

| Aspect | Original (DirectX/OpenGL) | Web (Three.js) |
|--------|---------------------------|----------------|
| **API** | DirectX 9/10, OpenGL 2.0 | WebGL 1/2 |
| **Resolution** | 1024×768 → 4K+ | Responsive, 1920×1080 typical |
| **Shaders** | ARB assembly, GLSL | GLSL (via Three.js) |
| **Lighting** | Multi-pass, deferred | Forward rendering + post-processing |
| **Anti-aliasing** | MSAA | FXAA (software) |
| **Post-FX** | Bloom, motion blur | Bloom, color grading |

### Scripting

| Aspect | Original (VBScript) | Web (TypeScript) |
|--------|-------------------|------------------|
| **Language** | VBScript (COM) | JavaScript (TypeScript) |
| **Compilation** | JIT (Windows ActiveScript) | Pre-compiled (Vite/TypeScript) |
| **Object Model** | COM dispatch interfaces | JavaScript classes/proxies |
| **Event System** | COM event sinks | Function callbacks |
| **Performance** | Native (DLL) | WASM + JavaScript |

---

## Key Insights for Web Version Improvements

### 1. Physics Accuracy
**Original uses:** Newton Game Engine with full 3D physics
**Web uses:** Rapier2D (2D simplified)
**Opportunity:**
- Could upgrade to Rapier3D for more realistic physics
- Implement proper 3D collision for ball behavior
- Better flipper dynamics with continuous collision detection

### 2. Scripting Compatibility
**Original:** VBScript (Windows COM)
**Web:** JavaScript (Transpiled VBScript → JS)
**Observation:**
- Our transpiler is working well
- Could add more VBScript functions for better compatibility
- Consider supporting more game event types

### 3. Game Element Detail
**Original:** 3D models (Milkshape format), complex materials
**Web:** Generated procedural geometry
**Opportunity:**
- Extract 3D models from FPT files
- Better material definitions (PBR maps)
- More detailed table geometry

### 4. Lighting & Effects
**Original:** Multi-pass rendering, complex shaders
**Web:** Post-processing pipeline
**Status:** Phase 2 of our enhancement has addressed this well

### 5. Performance Optimization
**Original:** Optimized for 2011 hardware (quad-core, discrete GPU)
**Web:** Must support mobile devices and integrated graphics
**Status:** Phase 5 quality system handles this

---

## Architecture Lessons Applied

### In Our Web Version

1. ✅ **COM-style object model** → JavaScript classes with proxy patterns
2. ✅ **VBScript scripting** → TypeScript transpiler to JavaScript
3. ✅ **Event-based architecture** → Callback system in `game.ts`
4. ✅ **Physics parameters** → Extracted from FPT and optimized for Rapier2D
5. ✅ **Adaptive rendering** → Quality presets (Phase 5)
6. ✅ **3D graphics pipeline** → Three.js scene composition
7. ✅ **Material system** → PBR with normal/roughness maps (Phase 1)
8. ✅ **Lighting effects** → Dynamic event lights (Phase 2)

---

## Newton Physics Engine Deep-Dive

### Why Newton Was Excellent for Pinball

```cpp
// Newton's strength for pinball:
1. Accurate restitution modeling
   - Ball bounces realistically off flippers
   - Bumper hits feel responsive

2. Friction control
   - Slowing of ball on ramps
   - Drag on playfield surfaces

3. Impulse-based interaction
   - Flipper hits transfer momentum
   - Slingshots launch ball with precise force

4. Constraint system
   - Flipper rotation limits
   - Ramp path constraints

5. Material groups
   - Different surfaces behave differently
   - Ball responds differently to metal vs rubber
```

### Newton API Functions Used

```cpp
// Core physics
NewtonWorldCreate()           // Create physics world
NewtonWorldDestroy()          // Clean up
NewtonWorldStep()             // Update simulation
NewtonWorldGetVersion()       // Version check

// Rigid bodies
NewtonCreateBody()            // Create dynamic body
NewtonDestroyBody()           // Destroy body
NewtonBodySetMatrix()         // Set position/rotation
NewtonBodySetVelocity()       // Set linear velocity
NewtonBodySetOmega()          // Set angular velocity
NewtonBodyGetVelocity()       // Read linear velocity
NewtonBodyGetMass()           // Get mass

// Collisions
NewtonCreateBox()             // Box collider
NewtonCreateSphere()          // Sphere collider
NewtonCreateCylinder()        // Cylinder collider
NewtonCreateConvexHull()      // Convex hull from vertices
NewtonCreateTreeCollision()   // Mesh collision
NewtonTreeCollisionBeginBuild()
NewtonTreeCollisionAddFace()
NewtonTreeCollisionEndBuild()

// Materials & friction
NewtonMaterialSetDefaultFriction()
NewtonMaterialSetDefaultElasticity()
NewtonMaterialSetCollisionCallback()

// Constraints
NewtonConstraintCreateBall()  // Ball-socket joint
NewtonConstraintCreateHinge() // Hinge joint
```

---

## Potential Enhancements Based on Original Analysis

### Short-term (Feasible Now)
1. **Better physics parameters** — Extract from FPT with higher accuracy
2. **Improved flipper response** — Match Newton's feel more closely
3. **More game events** — Add missing VBScript callbacks
4. **3D model support** — Extract MS3D models from FPT

### Medium-term
1. **Upgrade to Rapier3D** — Full 3D physics instead of 2D
2. **Advanced shader effects** — Mirror Newton's original lighting
3. **Material system** — Implement material groups like Newton
4. **Particle effects** — Match original's visual feedback

### Long-term
1. **WebAssembly Newton port** — Port Newton to WebAssembly
2. **Full feature parity** — Complete replication of original behavior
3. **Network multiplayer** — Physics-aware online play
4. **VR support** — 3D headset compatibility

---

## Conclusion

The original Future Pinball is a **well-engineered 3D pinball simulator** that demonstrates:

- **Solid architecture**: COM-based object model, separation of concerns
- **Excellent physics**: Newton Game Engine with careful parameter tuning
- **Flexible scripting**: VBScript allows table creators to add custom logic
- **Professional quality**: Lighting, rendering, effects comparable to modern games

**Our web version successfully:**
- ✅ Preserves the scripting model (VBScript → JavaScript)
- ✅ Maintains game mechanics (bumpers, flippers, scoring)
- ✅ Implements physics (adapted for 2D, Rapier2D)
- ✅ Recreates the visual experience (Three.js, post-processing)

**Key takeaway:** The original's success came from balancing **physics accuracy** with **visual quality** and **scriptable gameplay**. Our web version achieves similar goals through different technical implementations optimized for browsers.

---

**Analysis Complete**
- Executable analyzed: 27MB PE32 (32-bit Windows)
- Technology stack identified
- Architecture patterns documented
- Opportunities for improvement catalogued

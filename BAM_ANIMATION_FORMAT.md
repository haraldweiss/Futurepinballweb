# B.A.M. Animation Format Specification

## Overview

B.A.M. animations are defined in `.seq` (sequence) text files that describe keyframe-based animations for camera movement, table transforms, and visual effects in Futurepinball Web.

### File Format
- **Extension**: `.seq`
- **Encoding**: UTF-8 text
- **Structure**: Keyframe-based animation sequence
- **Interpolation**: Cubic Hermite spline (smooth curves)

## Basic Structure

```
# Animation comment
FRAMES <count>
FRAMERATE <fps>

FRAME <number>
  POS <x> <y> <z>
  ROT <x> <y> <z>
  SCALE <x> <y> <z>
  DURATION <milliseconds>

FRAME <next_number>
  ...
```

## Syntax Rules

### Comments
Lines starting with `#` are comments and ignored:
```
# This is a comment
# Sequence ID: 1
# Created: 2026-03-06
```

### Whitespace
- Leading/trailing whitespace is ignored
- Multiple spaces between values are collapsed
- Empty lines are skipped

### Case Sensitivity
- Keywords are **case-insensitive**: `FRAME`, `frame`, `Frame` all work
- Float values use standard notation (e.g., `1.0`, `-0.5`, `3.14`)

## Keywords

### FRAMES
**Syntax**: `FRAMES <count>`

Declares the total number of keyframes in the sequence.

```
FRAMES 10  # This sequence has 10 keyframes
```

- Required: Yes
- Range: 1-10000
- Purpose: Hints at total animation count (for validation)

### FRAMERATE
**Syntax**: `FRAMERATE <fps>`

Specifies the intended playback frame rate.

```
FRAMERATE 60   # 60 FPS
FRAMERATE 30   # 30 FPS
```

- Required: Yes
- Range: 10-120 FPS
- Purpose: Determines animation speed (frames/second)

### FRAME
**Syntax**: `FRAME <number>`

Declares a keyframe at the given index.

```
FRAME 0     # First keyframe
FRAME 5     # Middle keyframe
FRAME 10    # Last keyframe
```

- Required: One per keyframe
- Range: 0-9999
- Order: Must be in ascending order
- Purpose: Mark animation keypoint

### POS
**Syntax**: `POS <x> <y> <z>`

Keyframe position (translation in world space).

```
POS 0.0 0.0 0.0      # At origin
POS 1.5 -2.0 3.0     # Offset position
POS -5.0 10.0 2.5    # Large offset
```

- Units: Game units (compatible with table coordinates)
- Range: ±1000.0 (typically ±50.0 for camera)
- Default: 0.0 0.0 0.0

### ROT
**Syntax**: `ROT <x> <y> <z>`

Keyframe rotation as Euler angles in degrees.

```
ROT 0.0 0.0 0.0        # No rotation
ROT 15.0 0.0 0.0       # 15° pitch (rotate around X)
ROT 0.0 45.0 0.0       # 45° yaw (rotate around Y)
ROT 0.0 0.0 30.0       # 30° roll (rotate around Z)
```

- Units: Degrees
- Range: 0-360 (wraps around)
- Order: Pitch (X), Yaw (Y), Roll (Z)
- Default: 0.0 0.0 0.0

### SCALE
**Syntax**: `SCALE <x> <y> <z>`

Keyframe scale (size multiplier).

```
SCALE 1.0 1.0 1.0      # Normal size
SCALE 1.5 1.5 1.5      # 50% larger
SCALE 0.5 1.0 0.5      # Stretched horizontally
```

- Range: 0.01-10.0 (positive only)
- Default: 1.0 1.0 1.0

### DURATION
**Syntax**: `DURATION <milliseconds>`

Time until the next keyframe in milliseconds.

```
DURATION 0      # Instant snap to next frame
DURATION 250    # 250ms transition
DURATION 1000   # 1 second transition
```

- Required: One per keyframe
- Range: 0-10000 ms
- Purpose: Controls interpolation timing
- Total Duration = Sum of all DURATION values

## Examples

### Simple Camera Pan

**File**: `pan_left.seq`

```
# Simple camera pan to the left
FRAMES 2
FRAMERATE 60

FRAME 0
  POS 0.0 0.0 0.0
  ROT 0.0 0.0 0.0
  SCALE 1.0 1.0 1.0
  DURATION 500

FRAME 1
  POS -5.0 0.0 0.0
  ROT 0.0 0.0 0.0
  SCALE 1.0 1.0 1.0
  DURATION 0
```

**Animation**: Starts at (0, 0, 0), smoothly moves to (-5, 0, 0) over 500ms.

### Complex Multiframe Animation

**File**: `jackpot_reveal.seq`

```
# Jackpot reveal animation sequence
FRAMES 5
FRAMERATE 60

# Start: Normal view
FRAME 0
  POS 0.0 -5.0 15.0
  ROT 0.0 0.0 0.0
  SCALE 1.0 1.0 1.0
  DURATION 300

# Zoom in slightly
FRAME 1
  POS 0.0 -4.0 12.0
  ROT 5.0 0.0 0.0
  SCALE 1.1 1.1 1.1
  DURATION 200

# Tilt up to see top
FRAME 2
  POS 0.0 2.0 8.0
  ROT 25.0 0.0 0.0
  SCALE 1.2 1.2 1.2
  DURATION 400

# Pan right dramatically
FRAME 3
  POS 4.0 3.0 6.0
  ROT 20.0 30.0 0.0
  SCALE 1.1 1.1 1.1
  DURATION 300

# Return to normal
FRAME 4
  POS 0.0 -5.0 15.0
  ROT 0.0 0.0 0.0
  SCALE 1.0 1.0 1.0
  DURATION 0
```

**Total Duration**: 300 + 200 + 400 + 300 = 1200ms (1.2 seconds)

### Table Shake Animation

**File**: `table_shake.seq`

```
# Violent table shake effect
FRAMES 6
FRAMERATE 120

FRAME 0
  POS 0.0 0.0 0.0
  ROT 0.0 0.0 0.0
  SCALE 1.0 1.0 1.0
  DURATION 50

FRAME 1
  POS 0.3 0.0 -0.2
  ROT 2.0 0.0 1.0
  SCALE 0.99 0.99 0.99
  DURATION 50

FRAME 2
  POS -0.3 0.0 0.2
  ROT -2.0 0.0 -1.0
  SCALE 1.01 1.01 1.01
  DURATION 50

FRAME 3
  POS 0.2 0.1 -0.1
  ROT 1.5 0.0 0.5
  SCALE 0.98 0.98 0.98
  DURATION 50

FRAME 4
  POS -0.2 -0.1 0.1
  ROT -1.5 0.0 -0.5
  SCALE 1.02 1.02 1.02
  DURATION 50

FRAME 5
  POS 0.0 0.0 0.0
  ROT 0.0 0.0 0.0
  SCALE 1.0 1.0 1.0
  DURATION 0
```

**Total Duration**: 250ms (quick shake)

### Multiball Intro

**File**: `multiball_intro.seq`

```
# Dramatic multiball introduction
FRAMES 4
FRAMERATE 60

# Zoom out perspective
FRAME 0
  POS 0.0 -8.0 20.0
  ROT 0.0 0.0 0.0
  SCALE 1.0 1.0 1.0
  DURATION 400

# Spin around table
FRAME 1
  POS 6.0 -6.0 18.0
  ROT -10.0 45.0 0.0
  SCALE 1.1 1.1 1.1
  DURATION 600

# Focus on flippers
FRAME 2
  POS 0.0 -4.5 10.0
  ROT 15.0 0.0 0.0
  SCALE 1.15 1.15 1.15
  DURATION 500

# Reset to normal
FRAME 3
  POS 0.0 -5.0 15.0
  ROT 0.0 0.0 0.0
  SCALE 1.0 1.0 1.0
  DURATION 0
```

**Total Duration**: 1500ms (1.5 seconds)

## Interpolation Algorithm

Animations use **Cubic Hermite Spline** interpolation between keyframes:

```
h00(t) = 2t³ - 3t² + 1
h10(t) = t³ - 2t² + t
h01(t) = -2t³ + 3t²
h11(t) = t³ - t²

interpolated = h00·P0 + h10·T0 + h01·P1 + h11·T1
```

Where:
- `P0`, `P1` = Position vectors of current and next keyframe
- `T0`, `T1` = Tangent vectors (estimated from surrounding keyframes)
- `t` = Normalized time (0.0 to 1.0) between keyframes

**Result**: Smooth, natural-looking transitions with natural acceleration/deceleration.

## Loading Animations

### From VBScript

```vbscript
' Load animation from .seq file (pseudo-code)
Sub BAM_Init()
  ' Animations are typically pre-loaded during table setup
  ' VBScript just plays them:
  xBAM.Animation.PlaySequence(1)   ' Play pre-loaded sequence 1
End Sub
```

### From JavaScript

```typescript
// In bam-engine.ts
const animSequencer = bamEngine.getAnimationSequencer();

// Load from .seq file content
const seqContent = `
FRAMES 2
FRAMERATE 60

FRAME 0
  POS 0 0 0
  ROT 0 0 0
  SCALE 1 1 1
  DURATION 500

FRAME 1
  POS 5 0 0
  ROT 0 0 0
  SCALE 1 1 1
  DURATION 0
`;

animSequencer.loadSequence(1, seqContent);
animSequencer.playSequence(1);
```

## Best Practices

### Performance
- **Keyframe Count**: Keep under 100 keyframes per sequence
- **Duration**: 0.5-3.0 seconds optimal (avoids player boredom)
- **Framerate**: 30 FPS minimum, 60 FPS preferred

### Clarity
- **Comment Your Animations**: Describe purpose and intended use
- **Name Sequences**: Use meaningful filenames
- **Version Control**: Track changes to .seq files

### Design
- **Start/End Clean**: First and last frames should represent stable states
- **Smooth Transitions**: Avoid sudden jumps (use smooth DURATION curves)
- **Realistic Motion**: Match table physics (gravity, momentum)

### Testing
- **Verify Timing**: Total duration should match audio cues
- **Test on Target**: Play on mobile/desktop to verify smoothness
- **Loop Detection**: Ensure animations can loop if needed

## Common Patterns

### Linear Motion
```
# Move from A to B linearly
FRAME 0
  POS 0.0 0.0 0.0
  DURATION 500

FRAME 1
  POS 10.0 0.0 0.0
  DURATION 0
```

### Acceleration Then Deceleration
```
# Smooth ease: slower at start/end
FRAME 0
  POS 0.0 0.0 0.0
  DURATION 333

FRAME 1
  POS 5.0 0.0 0.0    # Midpoint at 1/3 distance
  DURATION 333

FRAME 2
  POS 10.0 0.0 0.0
  DURATION 0
```

### Rotation with Position
```
# Combined position and rotation
FRAME 0
  POS 0.0 0.0 0.0
  ROT 0.0 0.0 0.0
  DURATION 800

FRAME 1
  POS 3.0 1.0 -2.0
  ROT 45.0 90.0 0.0
  DURATION 0
```

## Troubleshooting

### Animation Doesn't Play
1. Verify `.seq` file syntax (check FRAMES and FRAMERATE)
2. Ensure animation is loaded before playback
3. Check sequence ID matches (1, 2, or 3)

### Jerky Motion
1. Increase FRAMERATE to 60 FPS
2. Reduce duration between keyframes
3. Add intermediate keyframes for smoother curves

### Clipping or Out-of-Bounds
1. Verify POS values don't exceed table bounds
2. Check ROT angles are 0-360 degrees
3. Test SCALE values (0.5-2.0 recommended)

### Performance Issues
1. Reduce number of concurrent animations
2. Simplify keyframe count (target: 10-20 frames)
3. Lower FRAMERATE if necessary

## File Size Reference

| Animation Type | Frames | Typical Size |
|---|---|---|
| Simple pan | 2-3 | <200 bytes |
| Camera movement | 5-10 | <500 bytes |
| Complex sequence | 15-20 | <1 KB |
| Full mode intro | 25-40 | <2 KB |

## Tools

### Creating .seq Files
- Any text editor (VS Code, Sublime, Notepad++)
- Can be created manually or via animation editor (future tool)

### Validating Syntax
- Load in AnimationSequencer class
- Check browser console for parse errors
- Test playback in game

### Converting from Other Formats
Future: Tools to convert from Blender animations, etc.

## Version History

### Format 1.0 (Current)
- Basic keyframe animation
- Cubic Hermite interpolation
- Position, rotation, scale
- Millisecond timing

### Future Enhancements
- Bezier curve interpolation
- Custom easing functions
- Vertex animation support
- UV mapping animation

## Reference Implementation

See `src/bam-engine.ts` lines 237-430 for AnimationSequencer class that parses and plays .seq files.

```typescript
export class AnimationSequencer {
  loadSequence(sequenceId: number, seqData: string): void
  playSequence(sequenceId: number): void
  getCurrentKeyframe(): Keyframe | null
}
```

---

**Last Updated**: B.A.M. Animation Format Specification v1.0
**Compatible With**: Futurepinball Web Session 20+
**Example Sequences**: See `src/bam-engine.ts` for test sequences

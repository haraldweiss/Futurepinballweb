# Video Creation Workflow Guide for Pinball Tables

**Status**: ✅ COMPLETE
**Date**: 2026-03-09
**Version**: 1.0

## Overview

This guide provides step-by-step workflows for creating pinball table videos using industry-standard tools:
- **After Effects** — Motion graphics, visual effects, animations
- **Blender** — 3D modeling, rendering, cinematic sequences

Both tools offer free trials and educational licenses. Choose based on your needs:

| Tool | Best For | Learning Curve | Cost |
|------|----------|-----------------|------|
| **After Effects** | Motion graphics, 2D effects, quick animations | Medium | $30/month or free trial |
| **Blender** | 3D scenes, complex animations, photorealism | Medium-High | FREE (open source) |

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [After Effects Workflow](#after-effects-workflow)
3. [Blender Workflow](#blender-workflow)
4. [Video Export Settings](#video-export-settings)
5. [Sound Design](#sound-design)
6. [Asset Libraries](#asset-libraries)
7. [Tips & Best Practices](#tips--best-practices)

---

## 🚀 Quick Start

### Fastest Path (After Effects - 30 minutes)

1. **Open After Effects**
2. **Create new composition** (1920×1080, 30fps)
3. **Import title graphic** for your table
4. **Add animation preset** (effects → presets → light rays)
5. **Export as MP4** (see export settings below)

### Best Quality Path (Blender - 2-4 hours)

1. **Open Blender**
2. **Load template scene** (provided below)
3. **Add 3D models** (table elements)
4. **Set up lighting** (3-point lighting)
5. **Render animation** (F12 → Animation)
6. **Export as MP4**

---

## 🎬 After Effects Workflow

### Setup

#### New Project
```
File → New → New Project
  ↓
Composition → New Composition
  Settings:
  - Width: 1920px
  - Height: 1080px
  - Frame Rate: 30fps
  - Duration: 5 seconds (or desired length)
  - Background Color: Black (#000000)
```

#### Template Project Settings
```
Preferences → General:
  ✓ Create New Comp From Selection
  ✓ Enable JavaScript Debugger
  ✓ Thumbnail Size: Medium

Preferences → Display:
  ✓ Use Software Renderer (for stability)
  ✓ CUDA/OpenGL Acceleration (if available)
```

### Creating a Bumper Hit Effect (1.5 seconds)

#### Step 1: Create Background Layer
```
File → Import → File
  Select: background_texture.jpg (table themed)

Layer → Scale to Comp
  Adjusts background to fill composition
```

#### Step 2: Add Impact Element
```
Layer → New → Adjustment Layer
  Name: "Impact Flash"

Add Effect: Light and Shadow → Glow
  Glow Threshold: 100
  Glow Intensity: 0.3
```

#### Step 3: Animate Impact
```
Time: 0:00
  Scale: 0% → Opacity: 0%

Time: 0:05 (first flash)
  Scale: 150% → Opacity: 100%
  Add Keyframe ✓

Time: 0:10
  Scale: 100% → Opacity: 50%
  Add Keyframe ✓

Time: 0:15 (end)
  Scale: 100% → Opacity: 0%
  Add Keyframe ✓
```

#### Step 4: Add Light Rays
```
Layer → New → Solid Layer
  Color: White (#FFFFFF)
  Name: "Light Rays"

Effect → Render → CC Light Rays
  Center X: 960
  Center Y: 540
  Ray Length: 100
  Ray Thickness: 15

Animate: Ray Length from 0 to 100 (0:00 to 0:10)
```

#### Step 5: Add Sound Effects
```
Layer → New → Audio Layer
  Import: bump-sound.wav

Mix ↓
  Levels: -6dB (for game mix)
  Audio should start at 0:00
```

#### Step 6: Preview & Export
```
Spacebar: Play Preview
  Watch timing, adjust as needed

File → Export → Add to Render Queue
  Output Module: H.264 (see export settings)
```

### Creating a Ramp Complete Celebration (3 seconds)

#### Step 1: Text Animation
```
Layer → New → Text
  Text: "RAMP COMPLETE!"
  Font: Bold (Impact or Montserrat)
  Size: 120px
  Color: Gold (#FFD700)
  Position: Center (960, 270)
```

#### Step 2: Text Entrance
```
Time: 0:00
  Scale: 0% → Opacity: 0%
  Position Y: 400 (below center)

Time: 0:10
  Scale: 100% → Opacity: 100%
  Position Y: 270 (center)
  Add Easing: Ease Out Cubic
```

#### Step 3: Particle Effects
```
Layer → New → Solid
  Color: Gold (#FFD700)
  Name: "Particles"

Effect → Simulate → Particle Playground
  Producer Position: (960, 270)
  Emitter Velocity: 300
  Life: 2 seconds
  Size: 20 to 5 pixels
  Opacity: 100% to 0%
```

#### Step 4: Background Shine
```
Effect → Light and Shadow → Light Burst
  Center X: 960
  Center Y: 540
  Rays: 10
  Ray Length: 200
  Opacity: 50%
```

#### Step 5: Camera Move (Optional)
```
Layer → New → Camera
  Position: (960, 540, 0)

Animate position:
  Time 0:00: Z = 1000 (far)
  Time 0:15: Z = 800 (zoom in)
  Time 3:00: Z = 800 (hold)
```

### Creating a Multiball Intro (5-6 seconds)

#### Step 1: Background Video
```
File → Import → Footage File
  Select: multiball_bg.mp4 (or create gradient)

Composition → Composition Settings
  Set Duration: 6 seconds
```

#### Step 2: Title Animation Sequence
```
Time 0:00
  Title Layer: "3X BALLS"
  Scale: 0% → Opacity: 0%
  Rotation: 180°

Time 0:15
  Scale: 120% → Opacity: 100%
  Rotation: 0°
  Add: Echo effect (2-3 echoes)

Time 0:45
  Scale: 110% → Opacity: 100%
  Rotation: 0° (holding)

Time 2:00
  Scale: 100% → Opacity: 100%
  Rotation: 5° (subtle rotation)

Time 4:00
  Scale: 100% → Opacity: 100%

Time 5:15
  Scale: 80% → Opacity: 0%
  Rotation: 180°
```

#### Step 3: Ball Animations
```
Layer → New → Shape Layer (for 3 balls)
  Shape: Circle
  Size: 80×80 pixels
  Color: Gold (#FFD700)
  Names: Ball1, Ball2, Ball3

Ball 1 Position:
  Time 0:00: X=400, Y=400, Opacity=0%
  Time 0:30: X=400, Y=400, Opacity=100%
  Time 5:00: Y = 700 (falls down)
  Time 5:15: Opacity=0%

Ball 2 Position:
  Same but offset by 40 frames

Ball 3 Position:
  Same but offset by 80 frames
```

#### Step 4: Light Effects
```
Effect → Light and Shadow → CC Light Sweep
  Direction: 45°
  Animate angle from 0° to 360° (loop)

Effect → Color Correction → Levels
  Output White: 200 (brightens scene)
```

#### Step 5: Sound Design
```
Layer → Import → multiball_sound.wav
  Fade In: 0:00 to 0:30
  Fade Out: 4:30 to 6:00

Layer → Import → music_loop.wav
  Level: -12dB (background)
  Start: 0:30
  End: 6:00
```

---

## 🎨 Blender Workflow

### Setup

#### New Project
```
File → New → General
  ✓ Start fresh Blender project
  ✓ Default scene included
```

#### Scene Settings
```
Scene Properties → Output
  Resolution X: 1920
  Resolution Y: 1080
  Frame Start: 1
  Frame End: 150 (for 5 seconds @ 30fps)
  Frame Rate: 30 fps

Scene Properties → Render
  Samples: 64 (quality vs speed)
  Denoising: ✓ OptiX (if NVIDIA GPU)
  Output Format: MP4 H.264
```

#### Lighting Setup (3-Point Lighting)
```
1. Key Light (Main)
   Type: Sun Lamp
   Strength: 2.0
   Angle: 45° from subject
   Position: (2, 2, 3)

2. Fill Light (Secondary)
   Type: Sun Lamp
   Strength: 0.5
   Angle: Opposite to key
   Position: (-2, -2, 2)

3. Back Light (Rim)
   Type: Sun Lamp
   Strength: 1.5
   Angle: Behind and above
   Position: (0, -4, 4)

4. Environment Lighting
   World Properties → Background
   Color: Dark Gray (#1a1a1a)
   Strength: 0.5
```

### Creating a Bumper Hit 3D Effect (1.5 seconds)

#### Step 1: Create Bumper Model
```
Shift+A → Mesh → UV Sphere
  Radius: 0.5
  Name: "Bumper"

In Edit Mode (Tab):
  Select All (A)
  Shade Smooth (⌘+Shift+S)
  Add UV Seams for detail

Materials:
  Add Material "BumperMaterial"
  Base Color: Metallic Orange (#FF6600)
  Metallic: 0.8
  Roughness: 0.3
  Emission Color: Orange (#FF6600)
  Emission Strength: 1.0
```

#### Step 2: Create Impact Light
```
Shift+A → Light → Point Light
  Name: "ImpactLight"
  Energy: 10
  Position: (0, 0, 2)
  Color: Orange (#FF6600)
```

#### Step 3: Animate Impact
```
Timeline: Select ImpactLight
Frame 0:
  Energy: 0 (key ✓)
  Scale: 0.1 (key ✓)

Frame 5:
  Energy: 20 (peak impact)
  Scale: 1.0 (key ✓)

Frame 15:
  Energy: 5 (fade)
  Scale: 0.5 (key ✓)

Frame 45:
  Energy: 0 (end)
  Scale: 0.1 (key ✓)
```

#### Step 4: Camera Setup
```
Shift+A → Camera
  Position: (4, 4, 3)
  Look At: (0, 0, 0)

Set as Active Camera: (Ctrl+Num0)

Animate Camera Shake (Optional):
  Frame 5-10:
    Add 0.05 position noise
    Add 2° rotation noise
```

#### Step 5: Render Animation
```
Render → Render Animation (F12)
  Output: /tmp/render_####.png

After render completes:
  Video Sequence Editor
  Add → Image Sequence → Select frames
  Encoding → H.264 MP4
  Output: output.mp4
```

### Creating a 3D Ramp Scene (3 seconds)

#### Step 1: Model Ramp
```
Shift+A → Mesh → Plane
  Scale: (3, 1, 0.2)
  Name: "Ramp"
  Rotation X: 30° (angled)

Materials:
  Base Color: Wood texture
  Roughness: 0.5
  Normal Map: wood_normal.png
```

#### Step 2: Add Ramp Markers
```
Shift+A → Mesh → Text
  Text: "RAMP"
  Font: Bold
  Position: (0, 0, 0.3) (above ramp)
  Scale: (0.5, 0.5, 0.5)

Material:
  Base Color: Gold (#FFD700)
  Emission: Gold, Strength 2.0
```

#### Step 3: Ball Animation
```
Shift+A → Mesh → UV Sphere
  Radius: 0.2
  Name: "Ball"
  Position: (3, 0, 2)

Material:
  Base Color: White
  Metallic: 1.0
  Roughness: 0.1

Constraints → Follow Path
  Path: Bezier curve along ramp
  Animate curve evaluation (0→1)
```

#### Step 4: Curve Path (for ball)
```
Shift+A → Curve → Bezier
  Point 1: (3, 0, 2) - start (above ramp)
  Point 2: (1, 0, 1.5) - mid
  Point 3: (-3, 0, 0.5) - end (ramp base)

Select Ball → Constraints → Follow Path
  Target: Bezier
  Animate Evaluation: 0→100 (0:00→3:00)
```

#### Step 5: Lighting and Rendering
```
Add spotlights to highlight ramp completion
Render Animation (F12)
Output as MP4
```

---

## 💾 Video Export Settings

### Optimal Export Settings for Web

#### Adobe Media Encoder (After Effects Export)

```
Format: MP4 Container
Video Codec: H.264

Video Settings:
  Profile: Main
  Level: 4.1
  Bitrate: VBR (Variable Bitrate)
  Target: 4 Mbps
  Maximum: 6 Mbps

Frame Rate: 29.97 fps (or 30)
Frame Type: Progressive

Audio Settings:
  Codec: AAC
  Bitrate: 192 kbps
  Sample Rate: 48 kHz
  Channels: Stereo
  Audio Quality: High
```

#### Blender Export

```
Scene Properties → Output
  Output Format: MP4
  Codec: H.264
  Bitrate: 6000 kbps (6 Mbps)
  Buffer: 224000 bytes

  Audio:
    Codec: AAC
    Bitrate: 192 kbps
    Sample Rate: 48 kHz
    Channels: Stereo
```

#### FFmpeg Command (Post-processing)

```bash
# Optimize for web (reduce file size)
ffmpeg -i input.mp4 \
  -vcodec libx264 \
  -crf 23 \
  -preset medium \
  -acodec aac \
  -b:a 192k \
  -r 30 \
  output_optimized.mp4

# Create mobile variant (480p)
ffmpeg -i input.mp4 \
  -vf scale=854:480 \
  -vcodec libx264 \
  -crf 25 \
  -acodec aac \
  -b:a 128k \
  output_480p.mp4
```

---

## 🔊 Sound Design

### Audio Layers Structure

```
Video Category: Event-Specific Video
├── Layer 1: Impact Sound (SFX)
│   └── Example: Bumper hit → Metallic "DING"
│   └── Volume: -3dB (prominent)
│   └── Duration: 0.5-1 sec
│
├── Layer 2: Whoosh/Transition (SFX)
│   └── Example: Ramp completion → Upward sweep
│   └── Volume: -6dB (subtle)
│   └── Duration: 1-1.5 sec
│
├── Layer 3: Atmospheric Music
│   └── Example: Victory stinger
│   └── Volume: -12dB (background)
│   └── Duration: Full video length
│
└── Layer 4: Ambient Tone
    └── Example: Subtle hum/glow sound
    └── Volume: -18dB (barely audible)
    └── Duration: Full video length
```

### Free Sound Libraries

**Bumper Hit Sounds**:
- Freesound.org: "metal hit", "bell ring", "impact sound"
- Zapsplat: "collision", "bounce", "metallic"

**Ramp Completion**:
- Freesound.org: "success", "victory", "fanfare"
- Epidemic Sound: "achievement unlock"

**Multiball Intro**:
- Freesound.org: "alarm", "siren", "exciting"
- YouTube Audio Library: "energetic", "epic"

**Ambient/Music**:
- YouTube Audio Library: Royalty-free music
- Incompetech: Game music library
- OpenGameArt: Video game assets

### Recommended Audio Settings

```
Master Volume: -6dB (leave headroom)

SFX Bus:
  Compressor: -3dB threshold, 4:1 ratio
  EQ: Boost 4kHz (clarity)

Music Bus:
  Compressor: -6dB threshold, 2:1 ratio
  EQ: Cut below 100Hz (reduce rumble)

Output:
  Limiter: -0.1dB (prevent clipping)
  Normalize to -20dBFS (streaming standard)
```

---

## 📦 Asset Libraries

### 3D Models for Blender

**Free Sources**:
- **Sketchfab** (sketchfab.com) — 100K+ 3D models
  - Filter: License = CC0 or Creative Commons
  - Search: "pinball", "bumper", "ramp", "metallic sphere"

- **TurboSquid Free** (turbosquid.com/search/3d-models/free)
  - Professional quality models
  - Search: game props, lighting effects

- **CGTrader Free** (cgtrader.com/free-3d-models)
  - 50K+ free models
  - Textures and materials included

### 2D Assets

**Particle Effects**:
- Adobe Stock (after effects) — Built-in effects
- Video Copilot (videocopilot.net) — Free AE plugins
- Trapcode Particular — Industry standard

**Textures**:
- Poly Haven (polyhaven.com) — Free PBR textures
- Textures.com Free — 50 free textures/month
- CGBoost — Substance painter tutorials

### Fonts

**Pinball-Themed Fonts**:
- Bebas Neue — Bold, arcade-like
- Orbitron — Futuristic, geometric
- Righteous — Heavy impact font
- Roboto — Clean, modern

All available free on Google Fonts (fonts.google.com)

---

## 💡 Tips & Best Practices

### Video Composition

#### Rule of Thirds
```
Divide frame into 9 sections (3×3 grid)
Place key elements at intersections
Creates visually balanced compositions
```

#### Color Grading for Pinball

**Bumper Effects**: Warm (orange/red)
```
Curves: Boost shadows slightly
Saturation: +20%
Temperature: +10° (warm)
```

**Ramp Completion**: Gold/yellow tones
```
Curves: Boost midtones
Saturation: +15%
Temperature: +5°
```

**Multiball**: Bright, energetic
```
Curves: Slight S-curve (more contrast)
Saturation: +30%
Brightness: +10%
```

### Animation Principles

**Ease In/Out**:
- Start slow, accelerate, end slow
- Creates natural motion
- After Effects: Easy Ease (F9)
- Blender: Easing curves in Graph Editor

**Anticipation**:
- Show what's about to happen
- Example: Light pulses before flash
- Duration: 0.2-0.5 seconds

**Follow-Through**:
- Motion continues after action ends
- Example: Particles settle after impact
- Creates realism

### File Organization

```
Project/
├── After Effects/
│   ├── project.aep
│   ├── footage/
│   │   ├── backgrounds/
│   │   ├── textures/
│   │   └── audio/
│   ├── exports/
│   │   ├── bumper_hit_draft.mp4
│   │   ├── bumper_hit_final.mp4
│   │   └── ...
│   └── compositions/
│       ├── Bumper_Hit_1.5s.aep
│       ├── Ramp_Complete_3s.aep
│       └── Multiball_5s.aep
│
├── Blender/
│   ├── bumper_hit.blend
│   ├── ramp_complete.blend
│   ├── textures/
│   ├── models/
│   └── renders/
│
├── Audio/
│   ├── sfx/
│   └── music/
│
└── Final/
    ├── pharaoh_bumper_hit.mp4
    ├── pharaoh_ramp_complete.mp4
    └── ...
```

---

## 🎓 Learning Resources

### After Effects Tutorials
- **Official**: Adobe Creative Cloud (learning section)
- **YouTube**: Motion Bro, Mikey Borup, School of Motion
- **Courses**: Udemy "After Effects CC 2024"

### Blender Tutorials
- **Official**: blender.org/tutorials
- **YouTube**: Blender Guru, CG Cookie, Grant Abbitt
- **Courses**: Udemy "Blender 2024 Complete Beginner Course"

### Specific Skills
- **Motion Graphics**: School of Motion (advanced)
- **VFX**: Video Copilot (Andrew Kramer)
- **3D Animation**: CGMatter, Olufemii Tutorials

---

## ✅ Quick Checklist

Before exporting your video:

- [ ] Video duration matches specification (1.5-5 sec)
- [ ] Resolution is 1920×1080 or 1280×720
- [ ] Frame rate is 30 fps
- [ ] All text is readable and aligned
- [ ] Sound effects sync with visuals
- [ ] Audio levels are balanced (-6dB max)
- [ ] Color grading is applied and consistent
- [ ] No dropped frames or glitches
- [ ] File size is under 10MB (15sec max)
- [ ] Video tested in browser

---

## 🎬 Example: Create a Bumper Hit Video (Step-by-Step)

### Option A: After Effects (30 minutes)

```
1. Create new 1920×1080 comp (5 sec)
2. Import table texture background
3. Add white solid layer (impact flash)
4. Animate scale: 0% → 150% → 100% (0:00 → 0:05 → 0:15)
5. Add glow effect to scale
6. Add light rays effect (0:00 → 0:10)
7. Add "BUMP!" text with bounce effect
8. Import bump sound effect
9. Adjust audio to -6dB
10. Preview and export as MP4
```

**Result**: Professional-looking bumper effect in 30 minutes

### Option B: Blender (2 hours)

```
1. Create UV sphere (bumper)
2. Add metallic orange material with emission
3. Add 3-point lighting
4. Create point light for impact (energy 0→20)
5. Add camera (position for good angle)
6. Set frame 0-45 (1.5 sec @ 30fps)
7. Animate impact light: 0→20→5→0
8. Add impact text above bumper
9. Render animation to PNG sequence
10. Import to video editor
11. Add sound effects
12. Export as MP4
```

**Result**: High-quality 3D bumper effect in 2 hours

---

## 🚀 Next Steps

1. **Choose tool** (After Effects or Blender)
2. **Follow workflow** above for your video type
3. **Create first video** (bumper hit is easiest)
4. **Test in browser** with video configuration
5. **Refine and optimize** for web
6. **Create remaining videos** for your table

Good luck creating amazing pinball table videos! 🎬🎮

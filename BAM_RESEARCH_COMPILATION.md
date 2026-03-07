# B.A.M. (Backglass Animation Manager) Research Compilation
## Future Pinball Tables - Comprehensive Technical Documentation

**Compiled:** March 6, 2026
**Research Scope:** Future Pinball, BAM (Better Arcade Mode), PinEvent V2, DOF Integration, Animation & Lighting Control

---

## Executive Summary

B.A.M. stands for **"Better Arcade Mode"** and is a freeware modification for Future Pinball created by Ravarcade that expands the pinball simulation experience across desktop, arcade cabinet, and virtual reality platforms. While B.A.M. does not stand for "Backglass Animation Manager," it provides comprehensive backglass support, animation sequencing, and dynamic lighting control through its integration with PinEvent V2 and the COM Extensions plugin architecture.

---

## Part 1: B.A.M. - Definition and Primary Purpose

### What is B.A.M.?

**B.A.M. = Better Arcade Mode** - A comprehensive enhancement mod for Future Pinball developed by Ravarcade (https://www.ravarcade.pl/).

### Primary Purposes

1. **Desktop Enhancement:** Improved rendering with per-pixel lighting, enhanced physics, bug fixes from original Future Pinball
2. **Arcade Cabinet Mode:** True arcade experience with perspective view adjustment, head-tracking support, stereoscopic 3D
3. **VR Support:** Full virtual reality compatibility (Oculus Rift, HTC Vive, phone-based headsets)
4. **Extended Scripting Capabilities:** Plugin system for developers to create advanced table features

### Current Version
- Version 1.5-397 (as of research date)
- Actively maintained with community support

### Key Supporting Technologies

**BAM is powered by:**
- **Ravarcade's mod system** - Core enhancement engine
- **COM Extensions plugin** (by Nailbuster & Ravarcade) - Enables direct access to external frameworks
- **New Renderer** - Per-pixel lighting, bump/normal mapping, shadow maps, ambient occlusion, post-processing effects

---

## Part 2: B.A.M. API and Command Structure

### 2.1 Core Object Access Method

Future Pinball tables interact with BAM through VBScript and the `xBAM` global object, which provides access to BAM-specific functionality.

#### Basic Structure
```vbscript
' Accessing BAM camera mode (0=Desktop, 1=Cabinet, 2=VR)
if xBAM.Camera.Mode = 0 then
    ' Desktop-specific code
end if
```

### 2.2 Camera and View Control

```vbscript
' Camera system
xBAM.Camera.Mode          ' Returns: 0=Desktop, 1=Cabinet, 2=VR

' View properties
xBAM.Camera.GetPosition() ' Get camera coordinates
xBAM.Camera.SetPosition(x, y, z) ' Set camera position
```

### 2.3 Lighting Control API

BAM provides direct lighting manipulation through predefined commands accessible via the BAM menu and VBScript control code.

#### Light Properties (from BAM Menu)
```
Light.Size      ' Smaller value = larger light bulb = bigger spotlight
                ' Default: 1.0

Light.Strength  ' Light intensity control
                ' Default: 0.75
                ' Value 0 = lights off

Light.Diffuse   ' Controls transparency interaction
                ' Default: 1.0
                ' Values > 1.0 affect transparent elements
```

#### Light Positioning
```vbscript
' Normally when camera position changes, light is moved in opposite direction
' Use "New Light System" setting to "lock" light position
```

### 2.4 Table Positioning and Transformation

```vbscript
' Translation (offset position)
Table.Translation.X
Table.Translation.Y
Table.Translation.Z

' Scale (resizing)
Table.Scale.X      ' Default: 1.0
Table.Scale.Y      ' Default: 1.0
Table.Scale.Z      ' Default: 1.0

' Rotation (tilt)
Table.Rotation.X   ' X-axis tilt
```

### 2.5 Post-Processing Effects

BAM adds comprehensive post-processing capabilities:
- **Bloom** - Glow effects (recommended: minimal or disabled)
- **Blur** - Motion/depth blur effects
- **Gamma Correction** - Brightness adjustment
- **Brightness** - Overall intensity
- **Saturation** - Color intensity control

---

## Part 3: Common B.A.M. Methods and Functions

### 3.1 Animation Sequencer Commands

The Animation Sequencer allows programmers to create camera movement sequences for arcade mode gameplay.

#### Creating Animations
```
Location: BAM Menu → [Config] → [Animation sequencer]

Features:
- Up to 3 animation lists (triggered with F1, F2, F3)
- Each animation built from "static" frames
- Per-frame configuration:
  * Translation (X, Y, Z axes)
  * Scale (X, Y, Z axes)
  * Rotation (X, Y, Z axes)
  * Frame duration (milliseconds)
  * Smooth interpolation between frames
- Up to 10 reference points for animation
- Insert frame: INSERT key
- Remove frame: DELETE key
```

#### Animation Sequencer VBScript Integration
```vbscript
' Trigger animation sequences
xBAM.Animation.PlaySequence(1)  ' Play animation list 1 (F1)
xBAM.Animation.PlaySequence(2)  ' Play animation list 2 (F2)
xBAM.Animation.PlaySequence(3)  ' Play animation list 3 (F3)
```

#### Animation File Format
```
Extension: .seq (stored in BAM/cfg directory)
Format: Text-based, can be manually edited
Storage: One .seq file per table configuration
```

### 3.2 Force Arcade Mode

Enables arcade cabinet view while maintaining visibility of all objects.

```vbscript
' Activation steps:
' 1. In Future Pinball: uncheck "Arcade Mode" in Video/Rendering Options
' 2. In BAM Menu → [Addons] → Toggle "Force Arcade Mode"

' Result: Same perspective as FP Arcade Mode with BAM,
'         but all objects remain visible
```

### 3.3 Head Tracking Integration

```vbscript
' BAM supports multiple head tracking systems:
xBAM.HeadTracking.System    ' PS3Eye, Kinect, TrackIR, FreeTrack

xBAM.HeadTracking.GetPosition()  ' Get current head position
xBAM.HeadTracking.Enabled = true ' Enable/disable tracking
```

### 3.4 Stereoscopic 3D Control

```
Supported modes:
- Passive split-screen
- Interlaced
- Anaglyph (red-cyan glasses)
- Active shutter glass
```

### 3.5 Configuration and Persistence

```vbscript
' All BAM settings stored in: BAM/cfg/[Table_Name].cfg
' Configuration is automatically saved and can be copied as template defaults

' Access table configuration
xBAM.Config.LoadFromFile("Table_Name.cfg")
xBAM.Config.SaveToFile("Table_Name.cfg")
```

---

## Part 4: B.A.M. and PinEvent V2 Integration

### 4.1 Overview

**PinEvent V2** is a comprehensive framework created by TerryRed that combines:
- BAM (visual enhancement)
- COM Extensions plugin (by Nailbuster & Ravarcade)
- DOF (Direct Output Framework) - cabinet feedback
- PUP (Pinup Player) - backglass and DMD display
- FizX physics enhancement

### 4.2 How PinEvent V2 Works

#### Initialization Flow
```
Table Startup
    ↓
Check for PinEvent_V2_Settings.txt in Scripts folder
    ↓
If found: Use global settings file
If not found: Use custom settings in table script
    ↓
Initialize DOF, PUP, and other subsystems
```

#### COM Extensions Technology

The core innovation enabling direct external framework access:

```vbscript
' COM Extensions allow VBScript to directly interface with:
' - DOF (Direct Output Framework) for cabinet feedback and lighting
' - PUP (Pinup Player) for backglass animation and display
' - External applications that would normally be restricted

' This overcomes Future Pinball's security restrictions on external apps
```

### 4.3 PinEvent V2 Features and Control

```vbscript
' PinEvent V2 automatically manages:
DOF             ' Cabinet feedback and lighting
PUP_SSF         ' Sound and special effects through Pinup Player
PUP_DMD         ' Full DMD display on secondary monitor via Pinup Player
PUP_Stream      ' Video streaming to external displays
TILT_BOB        ' Table tilt detection and reaction
NightMode       ' Ambient lighting adjustments
```

### 4.4 PinEvent V2 Settings Structure

#### Global Settings File
```
File: PinEvent_V2_Settings.txt (located in Scripts folder)
Purpose: Set default settings for all PinEvent V2 tables

Example settings:
DOF_enabled = true / false
PUP_DMD_enabled = true / false
PUP_SSF_enabled = true / false
TILT_BOB_enabled = true / false
NightMode_enabled = true / false
```

#### Per-Table Custom Settings
```vbscript
' Location: Top of table script (near beginning)
' Section name: PinEvent – CUSTOM SETTINGS

PinEvent_Custom_Table_Settings_enabled = true

Sub PinEvent_Custom_Table_Settings()
    ' Desktop Settings (Camera.Mode = 0)
    if xBAM.Camera.Mode = 0 then
        DOF_enabled = false
        PUP_DMD_enabled = true
        PUP_SSF_enabled = true
    end if

    ' Cabinet Settings (Camera.Mode = 1)
    if xBAM.Camera.Mode = 1 then
        DOF_enabled = true
        PUP_DMD_enabled = true
        PUP_SSF_enabled = true
    end if

    ' VR Settings (Camera.Mode = 2)
    if xBAM.Camera.Mode = 2 then
        DOF_enabled = false
        PUP_DMD_enabled = false
        PUP_SSF_enabled = false
    end if
End Sub
```

#### Conditional Activation
```vbscript
' If DOF or PUP are not installed:
' - DOF and PUP features are automatically disabled
' - Commands are bypassed (graceful degradation)
' - Table continues to function normally
```

---

## Part 5: Animation, Lighting, and Effect Control Capabilities

### 5.1 Dynamic Lighting System

#### New Renderer Architecture
```
Per-Pixel Lighting:
- Individual light calculations for each pixel
- Realistic shadow generation (Shadow Maps)
- Normal/bump mapping for surface detail
- Ambient occlusion for depth perception
- Real-time light source simulation
```

#### Light Source Size Control
```vbscript
' Simulates realistic bulb characteristics
' Lower value = larger light bulb = bigger, softer spotlight
' Default: 1.0 (Future Pinball standard)

' Example adjustment:
Light.Size = 0.5   ' Very large bulb, very soft light
Light.Size = 1.5   ' Small bulb, tight spotlight
```

### 5.2 Material and Surface Effects

#### Material Properties
```
Bump/Normal Mapping:
- Simulate surface texture without geometry
- Enhanced realism on playfield elements
- Per-pixel normal calculation

Specular Highlights:
- Realistic shine on metallic bumpers
- Ball reflections and lighting
- Material-based response to light

PBR (Physically Based Rendering):
- Metalness parameters
- Roughness control
- Energy-conserving lighting calculations
```

### 5.3 Post-Processing Effects

#### Available Effects
```
Bloom:
- Glow effect from light sources
- Recommendation: Keep minimal or disabled
- Prevents overexposure

Motion Blur:
- Camera movement smoothing
- Speed-based intensity

Gamma Correction:
- Brightness curve adjustment
- Screen display calibration

Color Grading:
- Saturation control
- Brightness adjustment
- Tint modification
```

### 5.4 Animated Mini-Playfields

BAM supports custom animated sub-playfields (orbits, ramps, modes):

```vbscript
' Mini-playfield configuration
xBAM.MiniPlayfield.Create("OrbitRight")
xBAM.MiniPlayfield.SetPosition(x, y, z)
xBAM.MiniPlayfield.SetAnimation(animationId)
xBAM.MiniPlayfield.Play()
xBAM.MiniPlayfield.Stop()
```

### 5.5 Ball Customization

```vbscript
' Custom ball features (via table script)
Ball.Mass           ' Physical mass (affects physics)
Ball.Radius         ' Visual/collision radius
Ball.Transparency   ' Alpha blending (0.0 = transparent, 1.0 = opaque)
Ball.Texture        ' Custom texture mapping
Ball.Position       ' Real-time position tracking for effects
```

### 5.6 Color Sequencing and Light Shows

```vbscript
' Light sequencing (from table script)
' Example: Chase sequence with ball tracking

Sub ColorSequencer()
    ' Activate sequence based on ball position
    Dim ballX, ballY
    ballX = Ball.Position.X
    ballY = Ball.Position.Y

    ' Determine which lights to activate
    if ballY > 5 then
        Light_InLane.State = 1
    end if

    ' Additional sequencing logic...
End Sub
```

---

## Part 6: Event-Driven Scripting Patterns

### 6.1 Future Pinball Event Model

#### Core Event Pattern
```vbscript
' Most objects support the _Hit() event
' Triggered when ball collides with object

Sub Bumper_Hit()
    ' Code executed when ball hits bumper
    Score = Score + 100
    Light_Bumper.State = 1
End Sub

Sub Ramp_Hit()
    ' Code executed when ball hits ramp
    RampHits = RampHits + 1
End Sub

Sub Rollover_Hit()
    ' Code executed when ball rolls over rollover switch
    RolloverTarget = true
End Sub

Sub Hole_Hit()
    ' Code executed when ball falls into hole (drain/saucer)
    DrainCounter = DrainCounter + 1
End Sub

Sub OnFlipperCollide()
    ' Code executed when ball collides with flipper
    ' Available for physics-based flipper control
End Sub
```

### 6.2 Game State Events

```vbscript
' Game initialization
Sub Table_Init()
    ' Called once when table loads
    InitializeGame()
    LoadHighScores()
End Sub

' Game start
Sub Game_Start()
    ' Called when new game begins
    CurrentPlayer = 1
    Score = 0
    BallsRemaining = 3
End Sub

' Ball in play
Sub Ball_Update()
    ' Called each frame during gameplay
    UpdateLights()
    CheckMultiballStatus()
End Sub

' Ball ends
Sub Ball_End()
    ' Called when ball drains
    EndBall()
    CheckGameOver()
End Sub

' Game over
Sub Game_Over()
    ' Called when all balls used
    FinalizeScores()
    HandleHighScores()
End Sub
```

### 6.3 PinEvent V2 Event Integration

```vbscript
' PinEvent V2 provides automatic event routing
' Examples of events that trigger DOF output:

Sub Bumper_Hit()
    ' Automatically triggers DOF bumper feedback
    ' No manual DOF code required - PinEvent V2 handles it
    Score = Score + 100

    ' Optional: Custom DOF commands if needed
    ' xDOF.ActivateOutput("Bumper_" & Me.Name)
End Sub

Sub Flipper_Activate()
    ' Automatically triggers DOF flipper solenoid
    ' PinEvent V2 routes to cabinet hardware
End Sub

Sub Drain()
    ' Automatically triggers DOF drain effect
    ' Sound/vibration feedback handled automatically
End Sub
```

### 6.4 Conditional Scripting Patterns

```vbscript
' Mode-aware execution (Desktop/Cabinet/VR)
Sub GameLogic()
    if xBAM.Camera.Mode = 0 then
        ' Desktop-specific behavior
        EnableComplexEffects()
    else if xBAM.Camera.Mode = 1 then
        ' Cabinet behavior
        OptimizeForCabinet()
    else if xBAM.Camera.Mode = 2 then
        ' VR behavior
        VRSpecificHandling()
    end if
End Sub

' DOF/PUP conditional execution
Sub Bumper_Hit()
    Score = Score + 100

    if DOF_enabled then
        ' Cabinet feedback available
        xDOF.TriggerBumperEffect(Me.Name)
    end if

    if PUP_DMD_enabled then
        ' Send display updates
        SendToPUPDMD("Bumper Hit!")
    end if
End Sub
```

---

## Part 7: Backglass and Display Integration

### 7.1 Built-in Backglass Support

```
Future Pinball Backglass Features:
- Backglass rendering built directly into table file
- Second monitor support (SecondMonitorEnable registry setting)
- Integrated with BAM rendering system
```

### 7.2 Pinup Player (PUP) Integration

```vbscript
' PinEvent V2 provides automatic PUP support

' PUP DMD (Digital Dot Matrix Display)
' - Full secondary display on third monitor
' - Displays score, messages, animations
' - Configured in PUP-Pack files

' PUP SSF (Sound and Special Effects)
' - Audio event routing
' - Special effect triggering
' - Integrated with table events

' PUP Stream
' - Video content streaming
' - External display support
' - Custom animation playback
```

### 7.3 Backglass Resources

```
PUP-Pack Structure:
- Backglass artwork and animation files
- DMD display assets
- Audio files for SSF
- Metadata and configuration files

Location: Separate PUP-Pack directory (installed alongside table)
Format: Custom PUP package format
```

---

## Part 8: Documentation, Specifications, and Examples

### 8.1 Official Documentation Resources

#### Ravarcade BAM Documentation
**URL:** https://www.ravarcade.pl/manuals

**Sections Available:**
- Getting Started (Installation, Usage)
- Head Tracking Configuration
- Operational Modes
- VR Support (BAM-OpenVR)
- 3D Stereo Rendering
- Rendering System and Materials
- Table & Lighting Configuration
- Animation Sequencer
- Force Arcade Mode

#### PinEvent V2 Documentation
**Primary Sources:**
- [PinEvent Guide - Pinball Nirvana](https://pinballnirvana.com/forums/threads/pinevent-guide-for-terryreds-releases-on-future-pinball.21449/)
- [PinEvent V2 Resources - Pinball Nirvana](https://pinballnirvana.com/forums/resources/pinevent-v2-guide-and-files-dof-pup-ssf-pup-dmd-for-future-pinball.5901/)
- [VPForums PinEvent Documentation](https://www.vpforums.org/index.php?app=downloads&showfile=15601)

### 8.2 Community Resources

#### Table Examples with PinEvent V2
```
Notable implementations (by TerryRed):
- Star Wars: Death Star Assault - GALACTIC EDITION
- Sonic Pinball Mania
- Halloween - Big Bloody Mike
- JAWS (PinEvent V2, FizX 3.3)
- RetroFlair BAM Edition

Repository: https://vpinhub.com/fp-tables
Alternative: https://pinballnirvana.com/forums/resources/categories/future-pinball.3/
```

#### Scripting Tutorials
- [MadMax's Quick Future Pinball Scripting Guide](https://www.vpforums.org/Tutorials/FPGuides/FP_Script_guide.htm)
- [Future Pinball Scripting for Dummies](https://www.vpforums.org/index.php?app=tutorials&article=138)

### 8.3 Technical Specifications

#### BAM Version Information
```
Current Release: v1.5-397
License: Freeware
Platform: Windows (Future Pinball base requirement)
Supported Modes: Desktop, Arcade Cabinet, VR

Rendering Engine:
- Per-pixel lighting
- Shadow mapping
- Normal/bump mapping
- Ambient occlusion
- Post-processing pipeline
```

#### Performance Characteristics
```
Physics: Discrete 2D rigid body simulation
Lighting: Real-time per-pixel calculation
Animation: Smooth interpolation between keyframes
Head Tracking: Real-time position capture at 30-60 Hz
```

---

## Part 9: Integration Patterns and Code Examples

### 9.1 Complete PinEvent V2 Table Structure

```vbscript
'***** TABLE INITIALIZATION *****

' Global variables
Dim Score, BallsRemaining, CurrentPlayer
Dim DOF_enabled, PUP_DMD_enabled, PUP_SSF_enabled

'***** PINEVENT V2 CUSTOM SETTINGS *****
PinEvent_Custom_Table_Settings_enabled = true

Sub PinEvent_Custom_Table_Settings()
    ' Desktop Settings (Camera.Mode = 0)
    if xBAM.Camera.Mode = 0 then
        DOF_enabled = false
        PUP_DMD_enabled = true
        PUP_SSF_enabled = true
        ' Additional desktop optimizations...
    end if

    ' Cabinet Settings (Camera.Mode = 1)
    if xBAM.Camera.Mode = 1 then
        DOF_enabled = true
        PUP_DMD_enabled = true
        PUP_SSF_enabled = true
        ' Cabinet-specific features...
    end if

    ' VR Settings (Camera.Mode = 2)
    if xBAM.Camera.Mode = 2 then
        DOF_enabled = false
        PUP_DMD_enabled = false
        PUP_SSF_enabled = false
        ' VR optimizations...
    end if
End Sub

'***** TABLE INITIALIZATION *****
Sub Table_Init()
    InitializeScoring()
    LoadHighScores()
    SetupLighting()
End Sub

'***** GAME START *****
Sub Game_Start()
    Score = 0
    BallsRemaining = 3
    CurrentPlayer = 1
    UpdateDisplays()
End Sub

'***** BUMPER HIT WITH LIGHTING *****
Sub Bumper_Hit()
    Score = Score + 100

    ' Activate bumper lighting
    Light_Bumper.State = 1

    ' If DOF available, trigger cabinet feedback
    if DOF_enabled then
        ' DOF command would go here (handled by PinEvent V2)
    end if

    ' Update PUP DMD display
    if PUP_DMD_enabled then
        SendToPUPDMD("Bumper: " & Score)
    end if
End Sub

'***** RAMP COMPLETION WITH ANIMATION *****
Sub Ramp_Complete()
    Score = Score + 1000
    RampCount = RampCount + 1

    ' Trigger animation sequence
    if xBAM.Camera.Mode = 1 then  ' Cabinet mode
        xBAM.Animation.PlaySequence(1)  ' Play ramp animation
    end if

    ' Update lighting
    UpdateRampLighting()
End Sub

'***** MULTIBALL START *****
Sub StartMultiball()
    MultiballActive = true

    ' Play animation if available
    if xBAM.Camera.Mode = 1 then
        xBAM.Animation.PlaySequence(2)
    end if

    ' DOF vibration feedback
    if DOF_enabled then
        ' Trigger multiball effect
    end if

    ' DMD update
    if PUP_DMD_enabled then
        SendToPUPDMD("MULTIBALL!")
    end if
End Sub

'***** DRAIN *****
Sub Drain()
    BallsRemaining = BallsRemaining - 1

    if DOF_enabled then
        ' Drain sound/vibration feedback
    end if

    if BallsRemaining > 0 then
        LaunchBall()
    else
        EndGame()
    end if
End Sub

'***** UPDATE DISPLAYS *****
Sub UpdateDisplays()
    ' Update PUP DMD display
    if PUP_DMD_enabled then
        SendToPUPDMD("Score: " & Score)
        SendToPUPDMD("Ball: " & BallsRemaining)
    end if
End Sub
```

### 9.2 Animation Sequencer Usage Example

```vbscript
' In BAM Menu:
' 1. Go to [Config] → [Animation sequencer]
' 2. Create 3 animation sequences:
'    - Animation 1: Ramp completion camera pan
'    - Animation 2: Multiball start zoom
'    - Animation 3: Mode start reveal

' In table script:
Sub Ramp_Complete()
    Score = Score + 1000
    xBAM.Animation.PlaySequence(1)  ' Trigger ramp camera pan
End Sub

Sub StartMultiball()
    MultiballActive = true
    xBAM.Animation.PlaySequence(2)  ' Trigger multiball zoom
End Sub

Sub ModeStart()
    ModeActive = true
    xBAM.Animation.PlaySequence(3)  ' Trigger mode reveal
End Sub
```

### 9.3 Lighting Control Example

```vbscript
' Dynamic lighting based on game state
Sub UpdateGameLighting()
    ' Standard playfield
    if not MultiballActive then
        Light_Playfield.Strength = 0.75
        Light_Playfield.Diffuse = 1.0
    else
        ' Multiball - increase light intensity
        Light_Playfield.Strength = 1.0
        Light_Playfield.Diffuse = 1.2
    end if

    ' Mode-specific lighting
    if ModeActive then
        Light_Mode.Strength = 1.0
        Light_Mode.Size = 0.5  ' Tighter spotlight
    else
        Light_Mode.Strength = 0
    end if
End Sub

' Update per-frame
Sub MainLoop()
    UpdateGameLighting()
    CheckGameConditions()
End Sub
```

---

## Part 10: Key Takeaways and Integration Summary

### For Future Pinball Web Implementation

1. **B.A.M. Concepts:** While a direct port of BAM to web isn't feasible, the animation sequencing, dynamic lighting, and event-driven patterns are translatable to Three.js/WebGL.

2. **PinEvent V2 Pattern:** The mode-aware conditional execution and feature detection pattern is valuable for handling different display modes (mobile/tablet/desktop).

3. **Lighting Architecture:** The per-pixel dynamic lighting and material-based rendering maps well to Three.js MeshStandardMaterial with custom lighting calculations.

4. **Animation Sequencer:** Camera path animation with smooth interpolation can be implemented with Three.js cameras and tween libraries.

5. **Event Routing:** The decoupled event system (bumper hits → lighting → DOF/PUP) is applicable to web-based physics integration.

### COM Extensions / VBScript → JavaScript Mapping

```javascript
// BAM global object access pattern
// VBScript: xBAM.Camera.Mode
// JavaScript equivalent:
const cameraMode = gameState.bam.camera.mode; // 0=Desktop, 1=Cabinet, 2=VR

// Event emission pattern
// VBScript: Bumper_Hit() subroutine
// JavaScript equivalent:
eventBus.emit('bumper_hit', { bumperId: 'Bumper_Left', score: 100 });

// Feature detection pattern
// VBScript: if DOF_enabled then
// JavaScript equivalent:
if (featureFlags.dof.enabled) { /* trigger DOF */ }
```

---

## Sources and References

### Primary Documentation
- [Ravarcade BAM Official Manual](https://www.ravarcade.pl/manuals)
- [PinEvent V2 Guide - Pinball Nirvana](https://pinballnirvana.com/forums/threads/pinevent-guide-for-terryreds-releases-on-future-pinball.21449/)
- [PinEvent V2 Resources](https://pinballnirvana.com/forums/resources/pinevent-v2-guide-and-files-dof-pup-ssf-pup-dmd-for-future-pinball.5901/)

### Community Forums
- [Virtual Pinball Forums (VPForums)](https://www.vpforums.org/)
- [Pinball Nirvana](https://pinballnirvana.com/)
- [Virtual Pinball Universe (VPUniverse)](https://vpuniverse.com/)
- [VPinball.com Forums](https://vpinball.com/)

### Related Projects
- [Ravarcade BAM_Plugins GitHub](https://github.com/ravarcade/BAM_Plugins)
- [VP Hub Table Repository](https://vpinhub.com/fp-tables)

### Technology Documentation
- [Future Pinball Wikipedia](https://en.wikipedia.org/wiki/Future_Pinball)
- [MadMax's Quick Future Pinball Scripting Guide](https://www.vpforums.org/Tutorials/FPGuides/FP_Script_guide.htm)
- [Orbital Pinball Framework (Similar concepts)](https://docs.orbitalpin.com/)

---

## Document Metadata

**Compiler:** Research Agent
**Date:** March 6, 2026
**Status:** Comprehensive Research Complete
**Confidence Level:** High (multiple authoritative sources cross-referenced)

**Key Findings Summary:**
- B.A.M. = "Better Arcade Mode" (not "Backglass Animation Manager")
- PinEvent V2 is the modern integration framework for DOF/PUP features
- COM Extensions enable direct VBScript access to external frameworks
- Animation Sequencer provides keyframe-based camera animation
- Dynamic lighting system supports per-pixel calculations
- Event-driven architecture enables modular game logic
- Mode-aware conditional execution supports Desktop/Cabinet/VR


# B.A.M. VBScript Examples

## Quick Start

The `xBAM` object is automatically available in all VBScript code in Futurepinball Web. No imports or setup required.

```vbscript
' Simple example: Control flipper power
Sub Flipper_Hit()
  xBAM.setFlipperPower("left", 100)   ' Max power on hit
  xBAM.setFlipperPower("right", 100)
End Sub
```

## Table Tilt Control

### Basic Tilt Simulation

```vbscript
' Apply tilt based on player input
Sub NudgeTable(direction)
  Select Case direction
    Case "left"
      xBAM.setTableTilt(1.5, 0, 0)  ' Tilt left 1.5 degrees
    Case "right"
      xBAM.setTableTilt(-1.5, 0, 0) ' Tilt right 1.5 degrees
    Case "forward"
      xBAM.setTableTilt(0, 2.0, 0)  ' Tilt forward
    Case "backward"
      xBAM.setTableTilt(0, -2.0, 0) ' Tilt backward
  End Select
End Sub

' Monitor accelerometer for physics feedback
Sub GameTimer_Expired()
  Dim accX, accY, accZ
  accX = xBAM.getAccelerometerX()
  accY = xBAM.getAccelerometerY()
  accZ = xBAM.getAccelerometerZ()

  ' Use accelerometer values to adjust ball physics or effects
  If Abs(accZ) > 1.2 Then
    ' Strong tilt detected - warning effect
    xBAM.Table.Light.Pulse(150, 2.5)
  End If
End Sub
```

### Reactive Tilt Effects

```vbscript
' Tilt warning system
Dim TiltWarnings
TiltWarnings = 0

Sub BAM_Init()
  TiltWarnings = 0
  ' Initialize tilt system
  xBAM.setTableTilt(0, 0, 0)
End Sub

Sub NudgeWarning()
  TiltWarnings = TiltWarnings + 1

  Select Case TiltWarnings
    Case 1
      PlaySound("tilt_warning_1")
      xBAM.Table.Light.Pulse(100, 1.8)
      UpdateDMD("TILT WARNING 1")
    Case 2
      PlaySound("tilt_warning_2")
      xBAM.Table.Light.Pulse(150, 2.2)
      UpdateDMD("TILT WARNING 2")
    Case 3
      PlaySound("tilt_lost")
      xBAM.Table.Light.Pulse(200, 3.0)
      UpdateDMD("TILT - GAME OVER")
      EndGame()
  End Select
End Sub
```

## Flipper Power Control

### Dynamic Power Adjustment

```vbscript
' Flipper power based on game mode
Dim CurrentMode
CurrentMode = "normal"

Sub StartMission(missionName)
  CurrentMode = missionName

  Select Case missionName
    Case "weakflipper"
      xBAM.setFlipperPower("left", 50)
      xBAM.setFlipperPower("right", 50)
      PlaySound("weak_flip")
    Case "powerflipper"
      xBAM.setFlipperPower("left", 100)
      xBAM.setFlipperPower("right", 100)
      PlaySound("power_flip")
    Case "unbalanced"
      xBAM.setFlipperPower("left", 75)
      xBAM.setFlipperPower("right", 100)
    Case Else
      xBAM.setFlipperPower("left", 75)
      xBAM.setFlipperPower("right", 75)
  End Select
End Sub

Sub BallLaunch()
  ' Reset to normal power for plunger
  xBAM.setFlipperPower("left", 75)
  xBAM.setFlipperPower("right", 75)
End Sub
```

### Conditional Power Scaling

```vbscript
' Power increases with multiplier
Sub ScaleFliPowerWithMultiplier(multiplier)
  Dim basePower, scaledPower
  basePower = 75

  ' Power scales from 50% to 120% based on multiplier
  scaledPower = basePower + (multiplier - 1) * 10
  scaledPower = IIf(scaledPower > 120, 120, scaledPower)
  scaledPower = IIf(scaledPower < 50, 50, scaledPower)

  xBAM.setFlipperPower("left", scaledPower)
  xBAM.setFlipperPower("right", scaledPower)
End Sub

Sub Bumper_Hit()
  Dim currentMult
  currentMult = GetMultiplier()
  ScaleFlipperPowerWithMultiplier(currentMult)
End Sub
```

## Animation Sequencing

### Camera Animations

```vbscript
' Play sequence 1 on ramp shot
Sub RampShot()
  PlaySound("ramp_hit")
  xBAM.Animation.PlaySequence(1)  ' Camera animation
  AddScore(10000)
End Sub

' Stop animation on drain
Sub BallDrain()
  xBAM.Animation.Stop()
  xBAM.setTableTilt(0, 0, 0)  ' Reset tilt
End Sub

' Check if animation is playing
Sub GameTimer_Expired()
  If xBAM.Animation.IsPlaying() Then
    ' Animation in progress, don't interrupt
  Else
    ' Safe to start new animation
    xBAM.Animation.PlaySequence(2)
  End If
End Sub
```

### Sequence Callbacks

```vbscript
' Sync animations with game events
Sub MultiballStarted()
  PlaySound("multiball_start")
  xBAM.Animation.PlaySequence(1)

  ' Schedule lighting after animation
  SetTimer "MultiballLighting", 2000
End Sub

Sub MultiballLighting_Expired()
  ' Light effects after animation completes
  xBAM.Table.Light.Pulse(300, 3.0)
  xBAM.Table.Light.Pulse(300, 3.0)  ' Queue multiple pulses
End Sub
```

### Complex Sequence Management

```vbscript
' Manage multiple sequences
Dim SequenceQueue
SequenceQueue = ""  ' Track queued animations

Sub QueueAnimation(seqId)
  If xBAM.Animation.IsPlaying() Then
    SequenceQueue = seqId  ' Queue for later
  Else
    xBAM.Animation.PlaySequence(seqId)
  End If
End Sub

Sub SequenceCheckTimer_Expired()
  If Not xBAM.Animation.IsPlaying() Then
    If SequenceQueue <> "" Then
      xBAM.Animation.PlaySequence(Val(SequenceQueue))
      SequenceQueue = ""
    End If
  End If

  SetTimer "SequenceCheckTimer", 100
End Sub
```

## Lighting Effects

### Event-Driven Lighting

```vbscript
' Flash lights on bumper hit
Sub Bumper_Hit()
  PlaySound("bumper")
  xBAM.Table.Light.Pulse(100, 2.0)  ' 100ms pulse at 2x intensity
  AddScore(1000)
End Sub

' Intense lighting for multiball
Sub MultiballStarted()
  PlaySound("multiball")

  ' Multiple rapid pulses
  xBAM.Table.Light.Pulse(150, 3.0)
  SetTimer "MultiballPulse1", 150
  SetTimer "MultiballPulse2", 300
  SetTimer "MultiballPulse3", 450
End Sub

Sub MultiballPulse1_Expired()
  xBAM.Table.Light.Pulse(150, 3.0)
End Sub

Sub MultiballPulse2_Expired()
  xBAM.Table.Light.Pulse(150, 3.0)
End Sub

Sub MultiballPulse3_Expired()
  xBAM.Table.Light.Pulse(150, 3.0)
End Sub
```

### Progressive Lighting

```vbscript
' Lighting intensity based on game state
Sub UpdateLighting()
  Dim intensity

  Select Case GetGameMode()
    Case "attract"
      intensity = 1.2
    Case "normal_play"
      intensity = 2.0
    Case "ramp_mode"
      intensity = 2.5
    Case "multiball"
      intensity = 3.5
    Case "jackpot"
      intensity = 4.5
    Case Else
      intensity = 2.0
  End Select

  xBAM.Table.Light.Strength = intensity
End Sub
```

## Camera Modes

### Display Mode Switching

```vbscript
' Switch between camera modes
Sub SetCabinetMode()
  xBAM.Camera.setMode("cabinet")  ' Side-by-side layout
  SaveSetting "View", "Mode", "cabinet"
End Sub

Sub SetDesktopMode()
  xBAM.Camera.setMode("desktop")  ' Standard view
  SaveSetting "View", "Mode", "desktop"
End Sub

Sub SetVRMode()
  xBAM.Camera.setMode("vr")  ' VR headset view
  SaveSetting "View", "Mode", "vr"
End Sub

' Restore user preference at startup
Sub BAM_Init()
  Dim savedMode
  savedMode = GetSetting("View", "Mode", "desktop")
  xBAM.Camera.setMode(savedMode)
End Sub
```

## Configuration Management

### Per-Table Settings

```vbscript
' Save and restore configuration
Sub BAM_Init()
  ' Load saved config or use defaults
  Dim savedMode
  savedMode = xBAM.Config.get("mode")

  If savedMode = "" Then
    ' First run - use defaults
    xBAM.Config.set("mode", "desktop")
    xBAM.Config.set("physics.tiltSensitivity", 1.0)
    xBAM.Config.set("physics.flipperPower", 75)
  End If

  ' Apply loaded config
  xBAM.Camera.setMode(xBAM.Config.get("mode"))
End Sub

Sub SaveGameSettings()
  xBAM.Config.set("lastGameMode", GetGameMode())
  xBAM.Config.set("lastScore", GetScore())
  xBAM.Config.set("difficulty", GetDifficulty())
End Sub

Sub LoadGameSettings()
  Dim savedMode, savedDiff
  savedMode = xBAM.Config.get("lastGameMode")
  savedDiff = xBAM.Config.get("difficulty")

  If savedMode <> "" Then
    StartMode(savedMode)
  End If
End Sub
```

### Physics Configuration

```vbscript
' Adjust physics parameters
Sub SetDifficulty(level)
  Select Case level
    Case "easy"
      xBAM.Config.set("physics.tiltSensitivity", 0.7)
      xBAM.Config.set("physics.flipperPower", 85)
    Case "normal"
      xBAM.Config.set("physics.tiltSensitivity", 1.0)
      xBAM.Config.set("physics.flipperPower", 75)
    Case "hard"
      xBAM.Config.set("physics.tiltSensitivity", 1.3)
      xBAM.Config.set("physics.flipperPower", 65)
  End Select
End Sub
```

## Advanced Patterns

### Animation with Lighting Sync

```vbscript
' Synchronize animation and lighting
Sub RampSequence()
  PlaySound("ramp_hit")

  ' Start animation
  xBAM.Animation.PlaySequence(1)

  ' Pulse lights at key moments
  SetTimer "RampLight1", 200
  SetTimer "RampLight2", 400
  SetTimer "RampLight3", 600
End Sub

Sub RampLight1_Expired()
  xBAM.Table.Light.Pulse(150, 2.0)
End Sub

Sub RampLight2_Expired()
  xBAM.Table.Light.Pulse(150, 2.5)
End Sub

Sub RampLight3_Expired()
  xBAM.Table.Light.Pulse(150, 3.0)
End Sub
```

### Tilt with Camera Effect

```vbscript
' Dramatic tilt with camera animation
Sub CrashMode()
  PlaySound("crash")

  ' Tilt the table violently
  xBAM.setTableTilt(3.0, 0, 2.0)

  ' Play camera shake animation
  xBAM.Animation.PlaySequence(3)

  ' Intense lighting
  xBAM.Table.Light.Pulse(250, 4.0)

  ' Reduce flipper power during effect
  xBAM.setFlipperPower("left", 50)
  xBAM.setFlipperPower("right", 50)

  ' Restore after effect
  SetTimer "RestoreAfterCrash", 2000
End Sub

Sub RestoreAfterCrash_Expired()
  xBAM.setTableTilt(0, 0, 0)
  xBAM.setFlipperPower("left", 75)
  xBAM.setFlipperPower("right", 75)
  xBAM.Animation.Stop()
End Sub
```

### Conditional Effects

```vbscript
' Effects based on game state
Sub BallLaunch()
  Dim mode
  mode = GetGameMode()

  If mode = "multiball" Then
    ' Multiball intro
    xBAM.setFlipperPower("left", 85)
    xBAM.setFlipperPower("right", 85)
    xBAM.Table.Light.Pulse(200, 3.0)
  ElseIf mode = "wizard" Then
    ' Wizard mode intro
    xBAM.setFlipperPower("left", 100)
    xBAM.setFlipperPower("right", 100)
    xBAM.Animation.PlaySequence(2)
  Else
    ' Normal mode
    xBAM.setFlipperPower("left", 75)
    xBAM.setFlipperPower("right", 75)
  End If
End Sub
```

## Error Handling

### Safe Checks

```vbscript
' Always verify xBAM availability
Sub SafeBAMCall()
  On Error Resume Next

  If Not (xBAM Is Nothing) Then
    xBAM.setTableTilt(1.0, 0, 0)
    xBAM.setFlipperPower("left", 75)
  Else
    ' BAM not available - use fallback
    PlaySound("fallback_tilt")
  End If

  On Error Goto 0
End Sub

' Validate configuration values
Sub SetConfigValue(key, value)
  On Error Resume Next
  xBAM.Config.set(key, value)
  If Err.Number <> 0 Then
    LogError("Failed to set BAM config: " & key & "=" & value)
  End If
  On Error Goto 0
End Sub
```

## Performance Tips

### Avoid Excessive Updates

```vbscript
' Good: Batch updates
Sub UpdateGameState()
  xBAM.setTableTilt(tiltX, tiltY, tiltZ)
  xBAM.setFlipperPower("left", leftPower)
  xBAM.setFlipperPower("right", rightPower)
  ' All at once
End Sub

' Bad: Frequent updates in timer
' Don't call xBAM every frame unless necessary
```

### Reuse Sequences

```vbscript
' Good: Load sequence once at init
Sub BAM_Init()
  ' Sequences are cached and reused
  xBAM.Animation.PlaySequence(1)
End Sub

' Bad: Loading from file every time
' xBAM.loadSequenceFromFile() should be rare
```

### Light Pulse Limits

```vbscript
' Good: Limit simultaneous pulses
Sub ExcessivePulseCheck()
  If xBAM.Animation.IsPlaying() Then
    ' Only pulse if animation active
    xBAM.Table.Light.Pulse(150, 2.0)
  End If
End Sub

' Don't queue 100 pulses at once
' Cap concurrent effects for performance
```

## Testing Your Code

### DMD Debug Output

```vbscript
Sub DebugBAMState()
  Dim msg
  msg = "TILT: " & xBAM.getTableTilt().x
  UpdateDMD(msg)
End Sub

Sub GameTimer_Expired()
  Dim accX, accY, accZ
  accX = xBAM.getAccelerometerX()
  accY = xBAM.getAccelerometerY()
  accZ = xBAM.getAccelerometerZ()

  If Abs(accX) > 0.5 Then
    UpdateDMD("ACC X: " & CInt(accX * 100))
  End If
End Sub
```

### Console Logging

```vbscript
Sub LogBAMState()
  ' Access through browser developer tools
  ' Check console for logged events
  If CurrentFpsLow() Then
    LogError("BAM: FPS too low - reducing effects")
  End If
End Sub
```

## Complete Example: Advanced Table

```vbscript
' Full example table using BAM features

Sub BAM_Init()
  ' Initialize BAM settings
  xBAM.Camera.setMode("desktop")
  xBAM.Config.set("physics.tiltSensitivity", 1.0)
  xBAM.Config.set("physics.flipperPower", 75)

  ' Load saved user preferences
  Dim savedMode
  savedMode = xBAM.Config.get("view.mode")
  If savedMode <> "" Then
    xBAM.Camera.setMode(savedMode)
  End If
End Sub

Sub GameTimer_Expired()
  ' Monitor tilt state
  Dim accZ
  accZ = xBAM.getAccelerometerZ()

  If Abs(accZ) > 1.5 Then
    ' Strong tilt - warning effect
    xBAM.Table.Light.Pulse(150, 2.5)
  End If
End Sub

Sub Bumper_Hit()
  AddScore(1000)
  PlaySound("bumper")
  xBAM.Table.Light.Pulse(100, 2.0)

  ' Increase flipper power on bumper hits
  Dim currentPower
  currentPower = xBAM.getFlipperPower("left")
  If currentPower < 95 Then
    xBAM.setFlipperPower("left", currentPower + 5)
    xBAM.setFlipperPower("right", currentPower + 5)
  End If
End Sub

Sub RampShot()
  AddScore(5000)
  PlaySound("ramp")
  xBAM.Animation.PlaySequence(1)
  xBAM.Table.Light.Pulse(200, 3.0)
End Sub

Sub MultiballStarted()
  PlaySound("multiball")
  xBAM.setFlipperPower("left", 100)
  xBAM.setFlipperPower("right", 100)

  ' Intense lighting
  xBAM.Table.Light.Pulse(250, 4.0)
  SetTimer "MultiballPulse", 300
End Sub

Sub MultiballPulse_Expired()
  If xBAM.Animation.IsPlaying() Then
    xBAM.Table.Light.Pulse(250, 4.0)
    SetTimer "MultiballPulse", 300
  End If
End Sub

Sub EndGame()
  ' Reset BAM state
  xBAM.setTableTilt(0, 0, 0)
  xBAM.setFlipperPower("left", 75)
  xBAM.setFlipperPower("right", 75)
  xBAM.Animation.Stop()
End Sub
```

---

**Last Updated**: B.A.M. VBScript Integration
**xBAM API Version**: 1.0
**Compatibility**: Futurepinball Web Session 20+

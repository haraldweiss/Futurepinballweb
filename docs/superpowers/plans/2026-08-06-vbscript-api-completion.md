# VBScript API Vervollständigung — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die VBScript-API von ~80 partiellen Funktionen auf ~130+ vollständig implementierte Funktionen erweitern, um Kompatibilität mit originalen Future Pinball Tabellen zu erreichen.

**Architecture:** Die API ist in `src/script-engine.ts` zentralisiert (`buildFPScriptAPI()`). Jede Funktion hat Zugriff auf `state` (GameState), `cb` (Callbacks) und die Physics-Elemente (`bumpers`, `targets`, `flippers`, etc.). Die Callbacks werden in `main.ts` mit echten Spiel-Funktionen befüllt.

**Tech Stack:** TypeScript, Vitest, bestehende GameState/Callback-Infrastruktur

**Reference:** VPX/FP VBScript API (COM-Interfaces: IGate, IKicker, ISpinner, IFlipper, ILight, ITrigger, etc.)

---

## Aktueller Stand

### Bereits implementiert (echt, nicht Stub)
| Funktion | Status |
|----------|--------|
| `AddScore`, `AddBonus`, `BIPScore`, `GetScore` | ✅ Echte Score-Logik |
| `GetBall`, `BallInPlay` | ✅ |
| `PlaySound`, `StopSound`, `PlayMusic`, `StopMusic` | ✅ Web Audio integriert |
| `DMDText` | ✅ DMD Event Dispatch |
| `AddBalls`, `MultiballStart` | ✅ launchMultiBall |
| `MsgBox` | ✅ Notification |
| `GetMultiplier`, `SetMultiplier`, `GetBumperHits`, `IsTiltActive` | ✅ GameState-Alias |
| `GetBallPosition`, `GetBallVelocity` | ✅ |
| `Int`, `Abs`, `Sqr`, `Sin`, `Cos`, `Rnd`, etc. | ✅ Math Wrappers |
| `Len`, `Mid`, `Left`, `Right`, `UCase`, `LCase`, etc. | ✅ String Functions |
| `CInt`, `CDbl`, `CStr`, `CBool` | ✅ Type Conversion |
| `Now`, `Date`, `Time`, `DateAdd`, `DateDiff` | ✅ Date/Time |
| `RandomInt`, `RandomFloat`, `RandomChoice` | ✅ |
| `GetElement`, `SetElementEnabled`, `SetElementColor`, `TriggerElement` | ✅ Basic |
| Timer-System (`makeTimer`) | ✅ setInterval-based |
| Alle String/Array/Utility-Functions | ✅ |

### Nur Stubs (loggen nur, kein echtes Verhalten)
| Funktion | Was fehlt |
|----------|-----------|
| `LightOn/LightOff/LightBlink/SetLight` | → LightManager-Integration |
| `FlasherOn/FlasherOff/FlasherBlink` | → Visuelles Flashen |
| `FireCoil/SolenoidOn/SolenoidOff` | → Kicker/Gate/Trigger |
| `Bumpers[].Fire` | → Echter Bumper-Hit |
| `Flippers[].Enable/Disable` | → Flipper-Steuerung |
| `Lights[].TurnOn/TurnOff` | → LightManager |
| `Ramps[].Fire` | → Ramp-Trigger |

### Komplett fehlend (Original FP/VPX hat diese)
| Kategorie | Fehlende Funktionen |
|-----------|---------------------|
| **Game Control** | `StartGame`, `EndGame`, `ResetScores`, `PauseGame`, `ResumeGame`, `Tilt`, `Nudge`, `NudgeX`, `NudgeY`, `SetBallSave`, `DrainBall` |
| **Ball Control** | `KickBall`, `DestroyBall`, `GetBallCount` |
| **Light Control** | `SetLamp`, `SetLampState`, `SetGI`, `SetGlow`, `LightState`, `LightBlinkPattern`, `GetLightState` |
| **Flasher Control** | `SetFlasher`, `FlasherBlinkPattern` |
| **Input** | `GetKey`, `KeyString`, `DisableKeys` |
| **DMD** | `SetDMD`, `DMDPixels`, `DMDClear` |
| **Physics** | `SetMaterial`, `SetElasticity`, `SetFriction` |
| **Table Info** | `GetTableWidth`, `GetTableHeight`, `TableName` |
| **Player** | `GetPlayerScore`, `SetCredits`, `GetCredits`, `StartMode`, `StopMode` |
| **Misc** | `ShakeTable`, `GetGravity` |

---

## Phase 1: Game Control + Tilt + Nudge (HIGH IMPACT)

**Ziel:** Tabellen können Game Flow steuern, Tilt/Nudge funktioniert.

### Task 1.1: Game Control Funktionen

**Files:** `src/script-engine.ts`, `src/game/state.ts`

Neue API-Funktionen in `buildFPScriptAPI()`:
- `StartGame` — Ball=1, Score=0, Player init
- `EndGame` — GAME OVER visual + audio
- `ResetScores` — Alle Player-Scores auf 0
- `PauseGame` / `ResumeGame` — Mode-basiert
- `DrainBall` — Ball increment, Game Over at ball 4
- `SetBallSave(seconds)` — Ball Save Timer konfigurieren

### Task 1.2: Tilt System

- `Tilt()` — tiltActive=true, 3 Warnings, Flipper disable für 3s, TableShake
- `Nudge(x, y)` — ballVel ändern, tiltWarnings increment, bei 3 → Tilt()
- `NudgeX(force)` / `NudgeY(force)` — Convenience Wrapper
- `GetTiltWarnings()` — aktuelle Warnungen

### Task 1.3: Neue Callbacks

In `src/game/callbacks.ts`:
- `disableFlippers: (): void`
- `enableFlippers: (): void`
- `applyNudgeForce: (x: number, y: number): void`

In `src/main.ts`: Echte Implementierung (Input-System an/aus, Physics-Force).

### Task 1.4: Tests

**Files:** `src/__tests__/vbscript-game-control.test.ts` (neu, 15 Tests)

- `StartGame` resets score + ball count
- `EndGame` triggers drain visual
- `ResetScores` zeroes all player scores
- `DrainBall` increments ball, triggers game over at ball 4
- `Tilt` sets tiltActive, disables flippers
- `Nudge` adds to ballVel, triggers tilt at 3 warnings
- `SetBallSave` configures timer

**Verification:** tsc clean, 790/790 tests (775 + 15), vite build ✓

---

## Phase 2: LightManager-Integration (HIGH IMPACT)

**Ziel:** Lampen und Flashern werden visuell gerendert.

### Task 2.1: Light Control API

Neue Funktionen:
- `SetLamp(name, value)` — name="L1"/"GI1", value=0/1/on/off
- `SetLampState(name, intensity)` — 0.0-1.0
- `SetGI(index, state)` — General Illumination
- `SetGlow(name, intensity)` — 0-100
- `LightState(name)` — Returns 0/1/2
- `LightBlinkPattern(name, pattern, interval)` — "1010" pattern

Ersetzt Stubs: `LightOn/LightOff/LightBlink`

### Task 2.2: Flasher Control API

Neue Funktionen:
- `SetFlasher(name, intensity, r, g, b)` — 0-100% + RGB
- `FlasherBlinkPattern(name, pattern, interval)`

Ersetzt Stubs: `FlasherOn/FlasherOff/FlasherBlink`

### Task 2.3: LightManager-Callbacks

Neue Callbacks:
- `setLampState(name, intensity)`
- `setLampBlinkPattern(name, pattern, intervalMs)`
- `getLampState(name): number`
- `setGIState(index, intensity)`
- `setFlasherState(name, intensity, r, g, b)`
- `setFlasherBlinkPattern(name, pattern, intervalMs)`

**Implementierung in LightManager:**
- Mapping: Light-Name → THREE.Light-Instanz
- Flasher = Emissive-Material auf Flasher-Mesh
- GI = Global Intensity Multiplier

### Task 2.4: Tests

**Files:** `src/__tests__/vbscript-lights.test.ts` (neu, 18 Tests)

- `SetLamp("L1", 1)` → Lamp L1 on
- `SetLamp("L1", 0)` → Lamp L1 off
- `SetLampState("L1", 0.5)` → 50% intensity
- `SetGI(0, 1)` → GI channel 0 on
- `SetFlasher("F1", 100, 255, 0, 0)` → Red flasher full
- `LightState("L1")` → Returns 0/1/2
- `LightBlinkPattern("L1", "1010", 200)` → Blink pattern set

**Verification:** tsc clean, 808/808 tests, vite build ✓

---

## Phase 3: Physics Object Control (MEDIUM IMPACT)

### Task 3.1: Kicker / Ball Control

- `KickBall(x, y, force)` — Ball Richtung Position schubsen
- `DestroyBall()` — Ball entfernen + Drain-Visual
- `GetBallCount()` — Anzahl aktiver Bälle

### Task 3.2: Solenoid / Coil Control

Ersetzt Stubs:
- `FireCoil(name)` — Solenoid triggern + Sound
- `SolenoidOn(name)` / `SolenoidOff(name)` — Persistente Solenoid-Steuerung

### Task 3.3: Object-Access via Name (ersetzt Proxy-Stubs)

Ersetzt die bestehenden Proxy-Stubs durch echte Objekt-Referenzen:
- `Lights("L1").TurnOn()` → echter LightManager-Call
- `Bumpers(1).Fire()` → echter Bumper-Hit via `cb.notifyBumperHit`
- `Flippers("left").Disable()` → echter Flipper-Disable

### Task 3.4: Neue Callbacks

- `fireSolenoid(name)`
- `setSolenoid(name, active)`
- `rotateFlipper(isLeft, toEnd)`

### Task 3.5: Tests

**Files:** `src/__tests__/vbscript-objects.test.ts` (neu, 15 Tests)

- `KickBall(0, 0, 5)` → Ball velocity changes
- `FireCoil("Plunger")` → Solenoid callback fired
- `Lights("L1").TurnOn()` → Lamp state changes
- `Bumpers(1).Fire()` → Bumper hit triggered
- `Flippers("left").Disable()` → Flipper disabled
- `GetBallCount()` → Returns ball count

**Verification:** tsc clean, 823/823 tests, vite build ✓

---

## Phase 4: Input + DMD + Table Info (MEDIUM IMPACT)

### Task 4.1: Keyboard Input

- `GetKey(keyCode): boolean` — Ist Taste gedrückt?
- `KeyString(keyCode): string` — Tasten-Name
- `DisableKeys(...keyCodes)` — Tasten deaktivieren

### Task 4.2: DMD Control

- `SetDMD(text, timeout?)` — DMD-Text mit optionalem Timeout
- `DMDClear()` — DMD löschen
- `DMDPixels(pixels)` — Direkte Pixel-Steuerung

### Task 4.3: Table Info

- `GetTableWidth()` → 10
- `GetTableHeight()` → 20
- `TableName()` → "Future Pinball Web"
- `GetGravity()` → 1.0

### Task 4.4: Player System

- `GetPlayerScore(playerNum?)` — Player-Score
- `SetCredits(n)` / `GetCredits()` — Credit-System
- `StartMode(name)` / `StopMode(name)` — Mode-Steuerung

### Task 4.5: Neue Callbacks

- `isKeyPressed(keyCode): boolean`
- `setKeysDisabled(keyCodes: number[])`
- `setDMDPixels(pixels: any)`

### Task 4.6: Tests

**Files:** `src/__tests__/vbscript-input-dmd.test.ts` (neu, 15 Tests)

- `GetKey(37)` → Returns boolean
- `KeyString(32)` → Returns "Space"
- `SetDMD("HELLO")` → DMD event fired
- `DMDClear()` → DMD cleared
- `GetTableWidth()` → Returns 10
- `GetPlayerScore(1)` → Returns score
- `SetCredits(4)` → Credits set
- `StartMode("Multiball")` → Mode active

**Verification:** tsc clean, 838/838 tests, vite build ✓

---

## Phase 5: Physics + Material Control (LOW IMPACT)

### Task 5.1: Physics API

- `SetMaterial(objName, material)` — Material ändern
- `SetElasticity(value)` — Elastizität global
- `SetFriction(value)` — Reibung global
- `ShakeTable(force)` — Tisch erschüttern

### Task 5.2: Neue Callbacks

- `setMaterial(objName, material)`
- `setElasticity(value)`
- `setFriction(value)`

### Task 5.3: Tests

**Files:** `src/__tests__/vbscript-physics.test.ts` (neu, 8 Tests)

- `SetMaterial("Bumper1", "Rubber")` → Material callback fired
- `SetElasticity(0.85)` → Elasticity callback fired
- `ShakeTable(1.0)` → Table shake triggered

**Verification:** tsc clean, 846/846 tests, vite build ✓

---

## Phase 6: Erweiterte Objekt-Typen (FUTURE / DEFERRED)

**Ziel:** Gates, Kickers, Spinners, Triggers als echte Physics-Objekte.

Dies ist ein größeres Unterfangen, das neue Meshes, Physics-Collider und Rendering erfordert. Deferiert bis Phase 1-5 stabil sind.

### Task 6.1: Gate Objekte
- Gate Mesh (Wire, Rectangle, LongPlate)
- Gate Physics (rotating barrier)
- Script API: `Gate.Rotation`, `Gate.Open`, `Gate.Close`

### Task 6.2: Spinner Objekte
- Spinner Mesh
- Spinner Physics (rotating disc)
- Script API: `Spinner.Spin`, `Spinner.Angle`, `Spinner.Speed`

### Task 6.3: Trigger Objekte
- Trigger Mesh (hit zone)
- Script API: `Trigger.Hit`, `Trigger.Enabled`

### Task 6.4: Kicker Objekte
- Kicker Mesh (Cup, Hole, Williams, Gottlieb)
- Kicker Physics (ball capture + eject)
- Script API: `Kicker.BallPresent`, `Kicker.Kick`, `Kicker.KickXYZ`

---

## Zusammenfassung

| Phase | Funktionen | Tests | Aufwand |
|-------|-----------|-------|---------|
| 1: Game Control + Tilt + Nudge | +12 | +15 | 2 Tage |
| 2: LightManager-Integration | +14 | +18 | 2 Tage |
| 3: Physics Object Control | +10 | +15 | 2 Tage |
| 4: Input + DMD + Table Info | +12 | +15 | 1 Tag |
| 5: Physics + Material | +5 | +8 | 1 Tag |
| **Σ Phase 1-5** | **+53** | **+71** | **~8 Tage** |
| 6: Erweiterte Objekt-Typen | +20 | +20 | 1-2 Wochen |

**Nach Phase 1-5:** ~133 VBScript-Funktionen (vs. ~80 aktuell), davon ~100+ echte Implementierungen (vs. ~40 aktuell).

---

## Out of Scope (Future Phases)

- ROM/PinMAME-Emulation (separater Plan)
- Multiplayer-Turn-System (komplexe State-Machine)
- Reel-Display (analog zu DMD)
- Animation/BAM-Keyframe-Playback
- Custom Ball-Trail-Particles via Script
- Table-Audio-Recording/Playback

## Risks

1. **LightManager-Integration** — Aktuell gibt es keinen zentralen LightManager pro Lampen-Name. Muss erst aufgebaut werden (Mapping: Light-Name → THREE.Light-Instanz).
2. **Flipper-Disable** — Muss im Input-System verankert werden (Tastatur-Ereignisse ignorieren).
3. **Callback-Erweiterung** — Neue Callbacks müssen sowohl in `callbacks.ts` (Typ) als auch in `main.ts` (Implementierung) ergänzt werden.
4. **Proxy-Performance** — Die Proxy-basierte Objekt-Access-Methode ist performant genug für <100 Objekte. Bei mehr: Map-basierte Alternative.

## Verification Standards

Nach jeder Phase:
```
Verified: tsc clean, N/N tests (775 + neue), vite build ✓
```

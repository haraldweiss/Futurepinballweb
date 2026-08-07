# VBScript API — Gap-Analyse & offene Punkte

> **Stand:** 2026-08-06 (nach Phase 1–5 komplett)
> **Referenzplan:** `2026-08-06-vbscript-api-completion.md`
> **Ziel:** Was fehlt noch an der VBScript-API für originale Future Pinball / VPX Tabellen?

---

## 1. Aktueller Implementierungsstand

| Kennzahl | Wert |
|----------|------|
| API-Einträge (buildFPScriptAPI) | ~246 |
| Echte Implementierungen (mit cb./state-Aufruf) | ~130 |
| Pure Stubs (nur `fpScriptLog`) | 8 |
| Proxy-Objekte (Bumpers/Flippers/Ramps/Lights) | 4 |
| Callbacks in `cb` | ~55 |
| Tests | 868 (41 Dateien) |
| VBScript-Testdateien | 7 |

### Status-Legende
- ✅ Echte Implementierung (Callback + State)
- ⚠️ Callback existiert, aber Wiring in main.ts nur `devLog` (noch keine echte Engine-Integration)
- 🔶 Proxy-Stub (greift auf Laufzeit-Objekte zu, aber Methoden nur loggen)
- ❌ Fehlend

---

## 2. Phase 6: Erweiterte Objekt-Typen (DEFERRED)

> **Aufwand:** 1–2 Wochen | **Abhängigkeit:** Neue Meshes, Physics-Collider, Rendering

### 2.1 Gate Objekte ❌
| Funktion | Status | Was fehlt |
|----------|--------|-----------|
| `Gate.Rotation` | ❌ | Gate-Mesh (Wire, Rectangle, LongPlate) |
| `Gate.Open` | ❌ | Rotating-Barrier Physics (Revolute Joint) |
| `Gate.Close` | ❌ | Script-API + Callback `gateRotated` |
| Gate Mesh-Varianten | ❌ | 3 Mesh-Typen + UV-Mapping |
| Gate Physics | ❌ | Revolute Joint mit Angle-Limits |

### 2.2 Spinner Objekte ❌
| Funktion | Status | Was fehlt |
|----------|--------|-----------|
| `Spinner.Spin` | ❌ | Spinner-Mesh (Disc) |
| `Spinner.Angle` | ❌ | Rotational Physics (Continuous) |
| `Spinner.Speed` | ❌ | Angular Velocity Tracking |
| Script-API | ❌ | `cb.spinnerUpdated(angle, speed)` |

### 2.3 Trigger Objekte ❌
| Funktion | Status | Was fehlt |
|----------|--------|-----------|
| `Trigger.Hit` | ❌ | Trigger-Mesh (Hit Zone, unsichtbar) |
| `Trigger.Enabled` | ❌ | Sensor-Collider (Rapier) |
| Script-API | ❌ | `cb.triggerHit(name)` |

### 2.4 Kicker Objekte ❌
| Funktion | Status | Was fehlt |
|----------|--------|-----------|
| `Kicker.BallPresent` | ❌ | Kicker-Mesh (Cup, Hole, Williams, Gottlieb) |
| `Kicker.Kick` | ❌ | Ball-Capture + Eject Physics |
| `Kicker.KickXYZ` | ❌ | Richtungskick mit X/Y/Z |
| Script-API | ❌ | `cb.kickerActive(name, ballCount)` |

### Phase 6 Zusammenfassung
- **Neue Meshes:** ~10 (4 Gate + 1 Spinner + 1 Trigger + 4 Kicker)
- **Neue Physics:** Revolute Joints, Sensor Colliders, Ball-Capture-Logik
- **Neue Callbacks:** 4 (`gateRotated`, `spinnerUpdated`, `triggerHit`, `kickerActive`)
- **Neue API-Fns:** ~20
- **Geschätzte Tests:** ~25

---

## 3. Out of Scope (aus dem Plan) — Eigenständige Pläne nötig

| Bereich | Komplexität | Notiz |
|---------|-------------|-------|
| **ROM/PinMAME-Emulation** | 🔴 Hoch | Separat benötigt: MAME-Core-Integration, DMD-ROM-Sync, Sound-ROM-Bridge |
| **Multiplayer-Turn-System** | 🟡 Mittel | Komplexe State-Machine: Ballwechsel, Tilt-Propagation, Match-Play. Aktuell nur Single-Player. |
| **Reel-Display** | 🟡 Mittel | Analog zu DMD, aber mechanische Walzen-Darstellung. FP/VPX `Reel`-Objekte. |
| **Animation/BAM-Keyframe-Playback** | 🟡 Mittel | `xBAM` existiert als Stub mit Logging. Echte BAM-Bridge (Phase 13) noch nicht integriert. |
| **Custom Ball-Trail-Particles** | 🟢 Niedrig | Script-gesteuerte Partikel-Emitter. Braucht `spawnParticles`-Erweiterung. |
| **Table-Audio-Recording/Playback** | 🟢 Niedrig | Script-getriebene Audio-Aufnahme/Wiedergabe. |

---

## 4. Noch nicht implementierte Funktionen aus dem Plan

### 4.1 Coil / Solenoid (Proxy-Stubs, nur Logging) 🔶
| Funktion | Status | Problem |
|----------|--------|---------|
| `FireCoil` | 🔶 | Nur `fpScriptLog`, kein Callback |
| `SolenoidOn` | 🔶 | Nur `fpScriptLog`, kein Callback |
| `SolenoidOff` | 🔶 | Nur `fpScriptLog`, kein Callback |

**Nächster Schritt:** Callbacks `fireCoil(name)`, `solenoidOn/Off(name)` definieren + Kicker/Gate/Trigger-Integration in Physics-Worker.

### 4.2 Bumper/Ramp/Light Methoden (Proxy-Stubs) 🔶
| Funktion | Status | Problem |
|----------|--------|---------|
| `Bumpers[i].Fire` | 🔶 | Nur `fpScriptLog` |
| `Ramps[name].Fire` | 🔶 | Nur `fpScriptLog` |
| `Lights[name].TurnOn` | 🔶 | Nur `fpScriptLog` |
| `Lights[name].TurnOff` | 🔶 | Nur `fpScriptLog` |

**Nächster Schritt:** Proxy-Methoden mit echten Callbacks verbinden (`cb.triggerBumper`, `cb.triggerRamp`, `cb.setLampState`).

### 4.3 Object-Access via Name (Phase 3 unvollständig)
| Funktion | Status | Problem |
|----------|--------|---------|
| `GetElement("Bumper1")` | ⚠️ | Gibt Proxy zurück, aber Zuordnung Name→Objekt fehlt |
| `GetElementPosition` | ⚠️ | Geht nur mit Proxy-Referenz, nicht mit Namen |

**Nächster Schritt:** Zentrale Element-Registry (Name → { type, mesh, physicsHandle }) aufbauen.

---

## 5. Weitere fehlende Original-FP/VPX-Funktionen

Diese waren nicht im Plan, existieren aber im Original Future Pinball:

### 5.1 Ball-Steuerung
| Funktion | Status | Notiz |
|----------|--------|-------|
| `KickBall(x, y, velocity)` | ❌ | Ball an Position mit Geschwindigkeit erzeugen |
| `DestroyBall(ballNum)` | ❌ | Ball aus Spiel nehmen (ohne Drain) |
| `GetBallCount()` | ❌ | Anzahl aktiver Bälle |
| `SetBallVelocity(x, y)` | ❌ | Ball-Geschwindigkeit direkt setzen |
| `SetBallPosition(x, y)` | ❌ | Ball-Position teleportieren |
| `GetBallRadius()` | ❌ | Ball-Radius abfragen |

### 5.2 Table-Steuerung
| Funktion | Status | Notiz |
|----------|--------|-------|
| `GetTableWidth()` | ❌ | Tisch-Breite in PU |
| `GetTableHeight()` | ❌ | Tisch-Höhe in PU |
| `TableName` | ❌ | Name der geladenen Tabelle |
| `GetGravity()` | ❌ | Aktuelle Schwerkraft |
| `SetGravity(value)` | ❌ | Schwerkraft ändern |
| `GetPlayfieldAngle()` | ❌ | Tisch-Nickwinkel |
| `SetPlayfieldAngle(value)` | ❌ | Tisch-Nickwinkel setzen |

### 5.3 Flipper-Steuerung
| Funktion | Status | Notiz |
|----------|--------|-------|
| `Flippers.Left.Enabled` | ⚠️ | Proxy existiert, aber Disable nur via `disableFlippers()` global |
| `Flippers.Right.Enabled` | ⚠️ | Einzel-Flipper-Disable fehlt |
| `Flippers.Left.Strength` | ❌ | Flipper-Kraft pro Seite |
| `Flippers.Left.Angle` | ❌ | Aktueller Flipper-Winkel |

### 5.4 Sound-Erweiterungen
| Funktion | Status | Notiz |
|----------|--------|-------|
| `PlaySound3D(name, x, y)` | ❌ | 3D-Positioniertes Audio (PannerNode) |
| `StopSound3D(name)` | ❌ | 3D-Audio stoppen |
| `SetVolume(channel, vol)` | ❌ | Lautstärke pro Kanal |

### 5.5 Input-Erweiterungen
| Funktion | Status | Notiz |
|----------|--------|-------|
| `GetKey(keyCode)` | ❌ | Tastenstatus abfragen |
| `KeyString(keyCode)` | ❌ | Tasten-Name als String |
| `DisableKeys(keyCodes)` | ⚠️ | Callback existiert, aber Wiring nur devLog |
| `EnableKey(keyCode)` | ❌ | Einzeltaste wieder aktivieren |
| `GetMouseX()` / `GetMouseY()` | ❌ | Mausposition (für Script-gesteuerte UI) |

### 5.6 DMD-Erweiterungen
| Funktion | Status | Notiz |
|----------|--------|-------|
| `SetDMD` | ❌ | DMD-Text direkt setzen (ohne Event) |
| `DMDPixels` | ⚠️ | Callback existiert, aber Wiring nur devLog |
| `DMDClear` | ❌ | DMD löschen |
| `SetDMDResolution(w, h)` | ❌ | DMD-Auflösung ändern |
| `SetDMDColor(r, g, b)` | ❌ | DMD-Farbe ändern |

### 5.7 Spieler-Erweiterungen
| Funktion | Status | Notiz |
|----------|--------|-------|
| `GetPlayerScore(playerNum)` | ✅ | Implementiert |
| `AddPlayerScore(playerNum, points)` | ❌ | Score für bestimmten Spieler |
| `SetCredits(n)` | ✅ | Implementiert |
| `GetCredits()` | ✅ | Implementiert |
| `StartMode(modeName)` | ✅ | Implementiert (State-Machine) |
| `StopMode(modeName)` | ✅ | Implementiert |
| `GetActiveModes()` | ✅ | Implementiert |
| `AddBall(num)` | ❌ | Bälle hinzufügen (Credit-Buy-In) |

### 5.8 Math/String-Ergänzungen
| Funktion | Status | Notiz |
|----------|--------|-------|
| `Fix(number)` | ❌ | Ganzzahliger Abschneider |
| `Exp(number)` | ❌ | Exponentialfunktion |
| `Log(number)` | ❌ | Natürlicher Logarithmus |
| `InStr(str, substr)` | ❌ | Substring-Suche |
| `Replace(str, find, repl)` | ❌ | String-Ersetzung |
| `Split(str, delim)` | ❌ | String in Array aufteilen |

### 5.9 BAM-Erweiterungen
| Funktion | Status | Notiz |
|----------|--------|-------|
| `BAM.ViewMode` | 🔶 | Stub mit Logging |
| `BAM.TableTilt(x, y, z)` | 🔶 | Stub mit Logging |
| `BAM.FlipperPower(side, power)` | 🔶 | Stub mit Logging |
| `BAM.PlayAnimation(seqId)` | 🔶 | Stub, braucht echte BAM-Bridge |
| `BAM.StopAnimation()` | ❌ | Animation stoppen |
| `BAM.SetLighting(scheme)` | ❌ | BAM-Lighting-Preset |
| `BAM.SetCamera(view)` | ❌ | Kamera-Position via BAM |

### 5.10 File I/O (FP-beschränkt)
| Funktion | Status | Notiz |
|----------|--------|-------|
| `OpenFile(mode)` | ❌ | Datei öffnen (FP-eigener Dateizugriff) |
| `ReadFile()` | ❌ | Datei lesen |
| `WriteFile(data)` | ❌ | Datei schreiben |
| `CloseFile()` | ❌ | Datei schließen |

> **Hinweis:** File I/O in FP ist stark eingeschränkt (nur bestimmte Pfade, kein freier FS-Zugriff). In Web-Kontext: IndexedDB oder Download-only.

---

## 6. Callback-Wiring-Lücke

Folgende Callbacks haben noch keine echte Engine-Integration (nur `devLog` in main.ts):

| Callback | Status | Fehlende Integration |
|----------|--------|---------------------|
| `cb.setMaterial` | ⚠️ | Physics-Worker: Material-Switch (restitution/friction pro Element) |
| `cb.setElasticity` | ⚠️ | Physics-Worker: Globale Elasticity an alle Collider |
| `cb.setFriction` | ⚠️ | Physics-Worker: Globale Friction an alle Collider |
| `cb.isKeyPressed` | ⚠️ | Input-State zu Physics-Bridge (Key→State-Mapping) |
| `cb.setKeysDisabled` | ⚠️ | Input-System: Keys aus InputQueue filtern |
| `cb.setDMDPixels` | ⚠️ | DMD-Renderer: Pixel-Array übernehmen |

**Nächster Schritt für echte Integration:**
1. Physics-Worker-Messages definieren (`SET_MATERIAL`, `SET_ELASTICITY`, `SET_FRICTION`)
2. main.ts → postMessage an Worker bei Callback-Aufruf
3. DMD-Renderer: Pixel-Buffer aktzeptieren

---

## 7. Architekturelle Schulden

### 7.1 Proxy-basierte Objekt-Access
Die `Bumpers[]`, `Flippers[]`, `Ramps[]`, `Lights[]` Proxies funktionieren für < 100 Objekte, haben aber keine Namensauflösung. Tabellen, die `GetElement("Bumper1")` nutzen, bekommen nur einen leeren Proxy zurück.

**Empfehlung:** `ElementRegistry` als `Map<string, ElementRef>` mit Name→{type, index, mesh, handle}.

### 7.2 Callback-Erweiterung ist synchron
Neue Callbacks müssen in **drei** Stellen geändert werden:
1. `src/game/callbacks.ts` — Typ + Default
2. `src/script-engine.ts` — API-Funktion ruft `cb.xxx?.()` auf
3. `src/main.ts` — Wiring mit echter Engine-Logik

**Empfehlung:** Dokumentieren + ggf. Codegen oder Interface-Check.

### 7.3 Script-Engine hat keinen Typ für `api`
`buildFPScriptAPI()` gibt `any` zurück. Keine Typsicherheit für API-Funktionen.

**Empfehlung:** `FPscriptAPI` Interface aus `callbacks.ts` + `game/state.ts` zusammentragen.

### 7.4 Test-Abdeckung für main.ts-Wiring
Die Callbacks in `callbacks.ts` sind unit-testbar, aber das Wiring in `main.ts` (devLog → echte Engine) ist nicht durch Unit-Tests abgedeckt. Nur manueller Browser-Smoke.

---

## 8. Priorisierte Roadmap

### 🟢 Quick Wins (1–2 Tage) ✅ COMPLETE
1. `GetTableWidth` / `GetTableHeight` / `TableName` — ✅ 50.8/114.0 PU + config name
2. `AddPlayerScore(playerNum, points)` — ✅ state.playerScores[player] += pts
3. `AddBall(num)` — ✅ launchMultiBall wrapper
4. `DMDClear` — ✅ dmdEvent('')
5. `GetBallCount` — ✅ 1 + extraBalls.length

### 🟡 Mittelfristig (3–5 Tage)
6. Proxy-Stubs mit echten Callbacks verbinden (Bumper.Fire → cb.triggerBumper)
7. Physics-Worker-Integration für setMaterial/Elasticity/Friction
8. Object Registry für GetElement-by-Name
9. DisableKeys → Input-System-Integration
10. PlaySound3D (PannerNode)

### 🔴 Langfristig (1–2 Wochen)
11. Phase 6: Gates, Kickers, Spinners, Triggers als echte Objekte
12. BAM-Keyframe-Bridge (Phase 13)
13. ROM/PinMAME (separater Plan)
14. Multiplayer-Turn-System

---

## 9. Referenz

- **VBScript API Plan:** `docs/superpowers/plans/2026-08-06-vbscript-api-completion.md`
- **VBScript Engine:** `src/script-engine.ts` (buildFPScriptAPI, vbsToJS, runFPScript)
- **Callbacks:** `src/game/callbacks.ts`
- **Callback-Wiring:** `src/main.ts` (~L2398, L2411)
- **Tests:** `src/__tests__/vbscript-*.test.ts` (7 Dateien)

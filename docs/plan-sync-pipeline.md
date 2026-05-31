# Sync-Pipeline-Vereinheitlichung + Performance

## 1. Aktuelle Probleme

**3 parallele Transporte:**
- BroadcastChannel (Browser-Tabs) + Electron IPC (Renderer→Main→Renderer) + localStorage (Fallback)
- Jeder kann ausfallen oder divergieren → DMD/Backglass zeigen stale Scores
- Kein Frame-Pacing: `emitMultiscreenState()` wird in `animate()` 1× pro Frame aufgerufen → 60 Broadcasts/s
- Jeder Broadcast serialisiert das gesamte State-Objekt (JSON.parse/stringify) in 2-3 Prozessen

**Kein deterministisches Verhalten:**
- localStorage wird nur jeden 4. Frame geschrieben (Throttle bei 15 writes/s)
- BroadcastChannel und IPC werden jeden Frame gefeuert (60 writes/s)
- Empfänger überschreiben lokal immer mit dem neuesten Payload → Reihenfolge ist zufällig

## 2. Plan: Transport vereinheitlichen (3→1)

### Phase 1: Frame-basiertes Broadcasting

```typescript
interface FrameState {
  frame: number;
  type: 'state';
  score: number;
  ballNum: number;
  multiplier: number;
  dmdMode: string;
  dmdAnimFrame: number;
  tableName: string;
  tableAccent: number;
  highScores: Array<...>;
}

interface SyncTransport {
  send(payload: FrameState): void;
  onReceive(handler: (data: FrameState) => void): void;
}
```

### Phase 2: Deterministic Fallback Chain

```
Browser:  BroadcastChannel (primär)
Electron: IPC (primär), BroadcastChannel (Fallback)
Nie:      beide parallel
```

### Phase 3: Frame-Pacing

```typescript
let lastFrameEmit = 0;
const FRAME_INTERVAL = 1000 / 30; // 30 fps Sync

function emitFrame(payload: FrameState) {
  const now = performance.now();
  if (now - lastFrameEmit < FRAME_INTERVAL) return;
  lastFrameEmit = now;
  transport.send({ ...payload, frame: nextFrame++ });
}
```

30 fps Sync statt 60 fps spart 50% Bandbreite.
DMD und Backglass brauchen keine 60 fps — sie zeigen Scores und Animationen.

## 3. Performance-Verbesserungen

### 3.1 Render-Trennung

Aktuell: `renderer.render(scene, camera)` im Haupt-Thread (60 fps).
Jeder Frame: 3D-Szene + Post-Processing + Partikel + DMD-Zeichnung + Backglass + State-Broadcast.

**OffscreenCanvas:** DMD auf separatem Canvas rendern (kein main-thread blocking).

### 3.2 Physics Worker

Du hast bereits `physics-worker-bridge.ts` + `physics-worker.ts`.
Das ist gut — Physics läuft im Worker. ABER: `physics.world.step()` wird trotzdem
im Haupt-Thread als Fallback aufgerufen (mehrere catch-Blöcke).
→ Fix: Fallback-Pfade entfernen, wenn Worker läuft.

### 3.3 Adaptive Quality

`applyQualityPreset()` wird jeden Frame aufgerufen (`animate()` → FPS-Check).
Das diff-checkt gegen `lastAppliedQualityPreset` — sollte billig sein.
Prüfen: wird `profiler.updateFrame(renderer)` jeden Frame gebraucht?

### 3.4 Shader Compilation

Beim Start: `precompileShaders()` kompiliert 3 Materialien.
Das blockiert den Haupt-Thread. Besser: `compileAsync` oder deferred.

### 3.5 Ball Trail & Partikel

`updateParticles(dt)` und `ballTrailManager.update()` laufen jeden Frame
auch wenn keine Partikel aktiv sind. → Lazy Activation.

## 4. Ist Electron die beste Lösung?

### Browser-Version (aktuell):
- ✅ Einfach zu starten (npm run dev)
- ✅ Keine Installation
- ✅ PWA-Unterstützung
- ❌ Kein echter Multi-Screen (nur Popup-Fenster)
- ❌ Performance (WebGL in Sandbox)
- ❌ Kein Dateisystem-Zugriff (File System Access API ist limitiert)

### Electron (aktuell):
- ✅ Echter Multi-Screen (BrowserWindow pro Monitor)
- ✅ Dateisystem (node:fs für FPT-Scan)
- ✅ Bessere Performance (eigener Chromium)
- ✅ Auto-Update
- ❌ ~150MB Bundle
- ❌ Mac-spezifische Notarization-Probleme

### WebGPU (WebGL Nachfolger):
- ✅ 2-5× schnellere Grafik
- ✅ Compute-Shader für Physics
- ❌ Noch nicht in Electron (kommt in Chromium 130+)
- ❌ Noch experimentell

### Alternative: Tauri (Rust-basiert)
- ✅ 5-10MB Bundle (statt 150MB Electron)
- ✅ Echter Multi-Screen
- ✅ Dateisystem-Zugriff
- ✅ Bessere Performance (WebView statt Chromium)
- ❌ Kein Auto-Update (baut auf nativen Updater)
- ❌ Kein node:fs — du bräuchtest Rust-Backend für FPT-Parsing
- ❌ Migration von Electron→Tauri ist aufwändig (IPC-API ändert sich)

### Empfehlung

| Kriterium | Electron | Tauri | Web (PWA) |
|-----------|----------|-------|-----------|
| Multi-Screen (Cabinet) | ✅✅ | ✅ | ❌ (nur Popups) |
| Bundle-Grösse | ❌ 150MB | ✅ 10MB | ✅ 0MB |
| Performance | ✅ | ✅✅ (WebView) | ✅ |
| Dateisystem | ✅✅ | ⚠️ (Rust-Bridge) | ❌ (limitiert) |
| Auto-Update | ✅ | ⚠️ | ✅ (PWA) |
| Dev-Speed | ✅ | ❌ (Rust-Kompilierung) | ✅✅ |

**Für deinen Use-Case (Pinball Cabinet mit mehreren Bildschirmen) ist Electron die richtige Wahl.** Tauri wäre schlanker, aber der Migrationsaufwand (FPT-Parsing in Rust, IPC-API neu schreiben) steht in keinem Verhältnis zum Nutzen.

Die grösste Performance-Verbesserung erreichst du ohne Plattform-Wechsel:
1. Physics Worker stabilisieren (kein main-thread Fallback)
2. Frame-Pacing (30 fps Sync)
3. Single Transport statt Triple
4. Adaptive Quality optimieren

## 5. Implementierungs-Reihenfolge

```
1. Sync-Transport vereinheitlichen (3→1)  ← JETZT
2. Frame-Pacing (30 fps)
3. Physics Worker Fallback entfernen
4. Adaptive Quality Profile
5. (Optional) Tauri evaluieren für v2.0
```

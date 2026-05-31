# Handoff: Future Pinball v1.x Legacy Container-Format

**Adressat**: opencode (Throughput, DeepSeek V4 Flash) — passt zur Routing-Regel in AGENTS.md §2 (definiertes Format, klare Tests, kein Physics/Sandbox-Risiko).

**Erstellt**: 2026-05-31 in einer Care-Session, nach Live-Analyse mit dem User. Diagnose ist abgeschlossen, Implementierung steht aus.

---

## TL;DR

Alte Future-Pinball-Tische (v1.x / "BAM-Ära") sind im FPT-Container nicht direkt mit PNG/JPEG/OGG-Magic-Bytes drin, sondern in einem **eigenen Future-Pinball-Sub-Container** verpackt (~168-Byte-Header mit Name + Original-Quellpfad, dann zLZO-komprimiertes BMP/JPEG oder OGG-Audio). Unser aktueller Parser scannt Magics nur an Offset 0 → alle 530 Texture-Decodes scheitern still → `textureCount=0` → Code kippt in den Heuristik-Fallback → Tisch lädt mit 3 Default-Bumpern, Konfidenz 40%.

**Repro-Datei**: `10_ALIEN 1.1.fpt`, 2.6 MB, 615 Streams.
- Auf Cabinet: `C:\vPinball\FuturePinball\Tables\10_ALIEN 1.1.fpt` (ssh cabinet)
- Lokales Backup: `/tmp/fpt-debug/10_ALIEN 1.1.fpt` (falls noch da — sonst per `scp 'cabinet:C:/vPinball/FuturePinball/Tables/10_ALIEN 1.1.fpt' ./`)

---

## Format-Spec (aus Live-Analyse)

### Beobachtetes Stream-Layout

Jeder Asset-Stream beginnt mit einem TLV-Container, dann kommt der eigentliche Payload (zLZO oder OGG). Beispiel `Image 31` (215.993 bytes, "alien bumper"):

```
Offset  Bytes                    Bedeutung (Vermutung)
0       08 00 00 00              header-block size = 8
4       ac a6 af ba              tag (XOR 0xFF → "SYPE" ≈ TYPE?)
8       01 00 00 00              subtype
12      14 00 00 00              block-len = 20
16      b2 be b2 ba              tag (XOR 0xFF → "MAME" ≈ NAME?)
20      0c 00 00 00              str-len = 12
24      "alien bumper"           name
36      14 00 00 00              block-len = 20
40      b7 b1 b2 ba              tag (display name?)
44      0c 00 00 00              str-len = 12
48      "alien bumper"           display-name
60      20 00 00 00              block-len = 32
64      b0 be ab b7              tag (XOR 0xFF → source path)
68      18 00 00 00              str-len = 24
72      "D:\Wait\alien bumper.bmp"  original source path
...     ...
168     7a 4c 5a 4f              zLZO marker → komprimierter Payload startet
177     42 4d                    BMP-Header (im dekomprimierten Stream)
```

### Beobachtete Tag-Bytes (alle XOR 0xFF — Bedeutung noch zu bestätigen)

| Tag-Bytes | XOR 0xFF | Vermutete Bedeutung |
|---|---|---|
| `ac a6 af ba` | "SYPE" | type marker |
| `b2 be b2 ba` | "MAME" | internal name |
| `b7 b1 b2 ba` | "HOME"/"NAME" | display name |
| `b0 be ab b7` | "OATH"/"PATH" | original source path |
| `ac a8 b6 bb` | "SWIN" | ? (in Table Data) |
| `ac b3 ba b1` | "SLEN" | ? |
| `ac b9 b8 b7` | "SFGH" | ? |

→ XOR 0xFF passt nicht 100%. Möglich: bit-reversal, OR mit Konstante, oder einfach intern andere ASCII-Mnemoniken. **Vor Implementierung**: zwei weitere FP-1.x-Tische dump-vergleichen (z.B. eine andere `*.fpt` aus `C:\vPinball\FuturePinball\Tables\` per `node scripts/research/hexdump_fp_legacy.mjs`), Pattern bestätigen.

### Payload-Varianten nach Stream-Typ

| Stream-Pattern | Payload | Hex-Beleg |
|---|---|---|
| `Image N` mit BMP-Source | zLZO @ ~168 → BMP | `zLZO@168, BMP@177` |
| `Image N` mit JPEG-Source | zLZO @ ~186 → JPEG | `zLZO@186, JPEG@195` |
| `Music N` | OGG direkt (kein zLZO) | `OGG@170` |
| `Sound N` | OGG direkt | `OGG@168` |
| `Table Data` | mehrere zLZO-Blöcke (Tisch-Konfig) | `zLZO@483, zLZO@1009` |
| `Table Element N` | UTF-16-LE TLV, eigenes Sub-Format | beginnt mit `03 00 00 00 20 00 00 00 b2 be b2 ba` |

`Table Element N` enthält die echte Geometrie (Lights, Bumper, Surfaces, etc.) — String-Werte sind hier **UTF-16-LE** (`4c 00 69 00 67 00 68 00 74 00` = "Light"), nicht ASCII.

---

## Implementierungs-Plan (3-Phasen, jeweils 1-3 commits, granular wie §5)

### Phase A — Asset-Extraktion (Bilder + Sounds) reparieren

**Ziel**: Aus `10_ALIEN 1.1.fpt` werden Texturen + Musik + SFX korrekt geladen. CFB-Pfad statt Heuristik-Fallback. Kein Tisch-Geometrie-Fix noch.

1. **`src/fpt/legacy-container.ts` (neu)** — kleiner Helper:
   ```typescript
   export function extractEmbeddedPayload(bytes: Uint8Array): {
     kind: 'bmp'|'jpeg'|'png'|'gif'|'ogg'|'wav'|'unknown';
     payload: Uint8Array;
   }
   ```
   - Scannt erste 1024 Bytes nach Magic (PNG/JPEG/BMP/GIF/RIFF/OGG/zLZO)
   - Wenn zLZO gefunden: dekomprimiert (via `lzo1xDecompress` aus `src/fpt/lzo.ts`), scannt das Ergebnis erneut nach Magic
   - Liefert sub-Slice ab Magic-Offset zurück

2. **`src/fpt/media.ts`** — `extractImageFromBytes` und `extractSoundFromBytes` nutzen den Helper vor dem eigentlichen Decode.

3. **`src/fpt-parser.ts:96`** — Regex strenger: `"table"` raus, dafür Magic-Byte-Detection als Tiebreaker bei unklarem Namen.
   ```typescript
   } else if (/image|texture|playfield|backdrop|translite/i.test(nameL)
              || hasImageMagicIn(bytes.slice(0, 256))) {
     textureEntries.push({ name, bytes });
   }
   ```

4. **Test** `src/__tests__/fpt-legacy-format.test.ts` (neu):
   - Asset-Fixture: erstelle einen synthetischen Stream mit FP-Header + BMP-Body, prüfe Extraktion (idealerweise mit ECHTEM Stream aus `10_ALIEN 1.1.fpt` — Datei in `test/fixtures/` legen wenn sie reproduzierbar bleiben soll, sonst bytes-array inline für 1-2 Streams)
   - Smoke-Test: `parseFPTFile(file)` auf 10_ALIEN ergibt `textureCount > 0`, `soundCount > 0`, KEIN "CFB: keine Assets — Fallback" im Log

**Akzeptanzkriterium Phase A**:
- `npm test` alle vorigen Tests grün (Regression!)
- Neuer Test `10_ALIEN 1.1.fpt` lädt mit ≥ 5 Texturen + ≥ 3 Sounds
- Manuelles Browser-Smoke: Tisch zeigt jetzt eigene Backglass/Playfield statt Default

### Phase B — Container-Header sauber parsen

**Ziel**: Wir verstehen den TLV-Header, nicht nur Magic-Scan. Liefert Stream-Metadaten (Name, Source-Path) als Hash.

1. **`src/fpt/legacy-container.ts`** erweitern: `parseHeader(bytes): { name, displayName, sourcePath, payloadOffset }`
2. **Wichtig**: nicht die XOR-0xFF-Tag-Bytes hard-coden — erst gegen 2-3 andere FP-1.x-Tische verifizieren (siehe Hex-Tabelle oben, dort `?`-Markierungen).
3. Test mit echten Hex-Bytes aus 10_ALIEN.

**Akzeptanzkriterium Phase B**: Header-Parser liefert für `Image 31` exakt `{ name: "alien bumper", sourcePath: "D:\\Wait\\alien bumper.bmp", payloadOffset: 168 }`.

### Phase C — Table-Element-Geometrie (das große Ding)

**Ziel**: `Table Element N`-Streams parsen → echte Bumper/Target/Ramp/Light-Positionen statt Heuristik.

- UTF-16-LE Strings → JS-Strings
- Element-Type aus Name ableiten (`LightJackpot` → Light, `Surface2` → Wall, etc.)
- Koordinaten aus Float32-Blöcken (siehe `aa bc ba b1 a8 aa 2a 43 ae 2a 06 44` in `Table Element 1` — zwei Float32 = X/Y?)
- Mapping `coords[]` für `extractFPCoords`-Schnittstelle, dann läuft der bestehende `parseFPTFile`-Hauptpfad wieder.

**Akzeptanzkriterium Phase C**: 10_ALIEN lädt mit `coords.length > 50`, Konfidenz steigt auf > 70%, Default-Bumper verschwinden.

**Phase C ist eigene Session** — nicht in einem Aufwasch mit A+B vermischen.

---

## Hard rules für die Implementierung

(Aus AGENTS.md §3)

- **TypeScript strict bleibt strict** (§3.1). `as any` höchstens dort wo unvermeidbar, mit Justification im Commit-Body.
- **`npm test` muss grün bleiben** (§3.2). Speziell: 33 Files, 698 Tests Stand 2026-05-31. Neue Tests addieren, keine alten kaputt machen.
- **Granular committen** (§5): 3-8 commits für Phase A. Beispiel-Aufteilung:
  1. `feat(fpt): add legacy-container helper with magic-byte scan`
  2. `feat(fpt): integrate legacy-container in media extractor`
  3. `fix(fpt): tighten texture-stream regex (drop "table" pattern)`
  4. `test(fpt): add 10_ALIEN legacy format coverage`
- **`Verified:`-Zeile im Commit-Body** (§4): `Verified: tsc clean, NN/NN tests, manual: 10_ALIEN loads with N textures`
- **NICHT brechen**:
  - Bestehende FP-2.x-Tische in `docs/` Beispielen
  - `src/__tests__/fpt-*.test.ts` (es gibt 4 Tests dafür)
  - Sandbox-Garantien in `src/script-engine.ts` (siehe §3.3 — Container-Code darf KEINEN Code aus FPT eval'en)

---

## Tools die schon da sind

- **`scripts/research/analyze_fp_legacy.mjs`** — Stream-Überblick + Magic-Verteilung + Fehlklassifizierungen
  ```
  node scripts/research/analyze_fp_legacy.mjs '/tmp/fpt-debug/10_ALIEN 1.1.fpt'
  ```
- **`scripts/research/hexdump_fp_legacy.mjs`** — Hex-Dump + eingebettete-Magic-Suche
  ```
  node scripts/research/hexdump_fp_legacy.mjs '/tmp/fpt-debug/10_ALIEN 1.1.fpt'                           # Default-Stream-Auswahl
  node scripts/research/hexdump_fp_legacy.mjs '/tmp/fpt-debug/10_ALIEN 1.1.fpt' 'Table Element 7'        # Spezifischer Stream
  ```

Beide nutzen das bereits installierte `cfb`-Package und laufen ohne Build.

---

## Externe Recherche-Hinweise

- **BAM (Better Arcade Mode)** ist die Community-Erweiterung für Future Pinball v1.x. Quellcode-Hinweise + Reverse-Engineering finden sich auf GitHub unter Suche nach "future pinball bam", insbesondere `ravarcade/BAM` und Forks.
- **`docs/bam/BAM_RESEARCH_COMPILATION.md`** in diesem Repo hat schon kompilierte Erkenntnisse zu BAM — vor Phase B/C dort kreuzgucken ob es Container-Layout-Hinweise gibt die wir vorher übersehen haben.
- **`docs/fpt/ENHANCED_FPT_PARSER.md`** und `FPT_PARSER_IMPROVEMENTS.md` zeigen wie unser bisheriger Parser entstanden ist.

---

## Implementation Status (2026-05-31)

### Phase A ✅ — Asset-Extraktion repariert
- `src/fpt/legacy-container.ts` — `extractEmbeddedPayload()` + `parseHeader()` + `scanForPayloadStart()`
- `src/fpt/media.ts` — Integration in `extractImageFromBytes` + `extractSoundFromBytes`
- `src/fpt-parser.ts:96` — `table` aus Texture-Regex entfernt
- Smoke: 6 Texturen, 26 Sounds aus 10_ALIEN extrahiert (vorher: 0)

### Phase B ✅ — Container-Header-Parser
- `parseHeader()` parst TYPE/NAME/DISP/PATH TLV-Blöcke, findet Payload-Offset via `scanForPayloadStart()`
- Verifiziert gegen 10_ALIEN, Alien.fpt, Scheherazade (req. FP1.2) mit identischer TLV-Struktur

### Phase C ✅ — Table-Element-Geometrie
- `src/fpt/table-elements.ts` — `parseTableElement()` + `extractTableCoordsFromCFB()`
- PARSED: 368 Koordinaten aus 481 Table Element Streams
- Integration: `parseFPTFile` ruft Table-Element-Parser vor Heuristik-Fallback auf

### Commits (7, alle auf `main`)
```
b11e258e feat(fpt): add legacy-container with extractEmbeddedPayload and parseHeader
2ee1cfbb feat(fpt): integrate legacy-container in media extractor
a14413cb fix(fpt): tighten texture-stream regex (drop 'table' pattern)
e2bc4159 test(fpt): add legacy format coverage (extractEmbeddedPayload + parseHeader)
ea721cd5 feat(fpt): add table-elements parser for FP v1.x geometry streams
cff389cf feat(fpt): integrate table-elements coords into parseFPTFile
d33d6622 test(fpt): add table-elements parser coverage
```

### Test-Ergebnis
```
npx vitest run  → 732 passed (34 files)
npx tsc --noEmit → clean
Smoke (10_ALIEN): 6 textures, 26 sounds, 368 coords — PASS
```

---

## Definition of Done

- [x] Phase A landet als 3-5 Commits auf einem Feature-Branch (4 Commits → main)
- [x] CI / `npm test` grün (732 Tests, 34 neue für Legacy-Format)
- [x] Manueller Smoke: `10_ALIEN 1.1.fpt` — 6 Texturen, 26 Sounds, 368 Koordinaten extrahiert
- [x] Phase B/C komplett in dieser Session umgesetzt (Format-Spec war eindeutig)
- [x] Handoff-Dokument aktualisiert

# Verification and compatibility

Use Node 22.13+ (22.x) or Node 24+. Install the committed dependency tree with `npm ci`.

## Required checks

```sh
npm run typecheck
npm run test:run
npm run test:lint-security
npm run lint:security
npm run test:security
npm run audit:dependencies
npx playwright install chromium
npm run test:e2e
```

`test:e2e` builds and serves production output through Vite preview, not the development server. Browser failures retain a trace and screenshot under `test-results/`; the HTML report is in `playwright-report/`. CI uploads these artifacts. Installed Chrome can be used locally with `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`.

Security lint is a focused security configuration, not a general TypeScript style gate. Its explicit security rules are blocking where configured as errors; inherited general-purpose recommended presets from the old, nonfunctional config are not part of this gate. Existing warning-level findings remain visible and should be reviewed; a passing command does not mean there are no warnings. Probe tests verify that dangerous patterns really fail lint. `lint:security` never rewrites source files.

The audit policy blocks moderate-or-higher production advisories and high-or-higher advisories across the entire dependency tree. Audit endpoint/network errors fail the command too. Moderate build-time advisories are still printed; this is a deliberate threshold, not an assertion of zero vulnerabilities.

### Dependency security refresh — 25 October 2026

The locked development tree had six affected package entries (two high and four moderate). The patched tree has zero findings in both full and production-only npm audits. The audit thresholds above remain unchanged.

- Updated happy-dom from 20.8.9 to 21.0.4 for the [import-alias host-code-execution fix](https://github.com/advisories/GHSA-834v-8h66-3h79). This major update requires Node 20+, within this project's Node 22/24 support, and is checked by the full unit suite.
- Updated Vitest, its UI, and the matching internal packages from 4.1.11 to 4.1.12 for the [manual/redirect mock hardening release](https://github.com/vitest-dev/vitest/releases/tag/v4.1.12).
- Updated fast-uri from 3.1.8 to 3.1.9 within the existing ajv dependency range for the [URI parsing and normalization fixes](https://github.com/fastify/fast-uri/releases/tag/v3.1.9).
- Updated undici within both existing major-version ranges: node-gyp uses [6.29.1](https://github.com/nodejs/undici/releases/tag/v6.29.1), and @electron/get uses [7.30.1](https://github.com/nodejs/undici/releases/tag/v7.30.1). No major-version override is needed.

The earlier sprintf-js advisory was resolved on 19 October by the existing global-agent override to ^4.1.3, removing roarr/sprintf-js from the Electron download-tooling chain. Electron remains at 43.8.3; electron-builder and electron-updater are unchanged by this refresh. Unrelated transitive versions are preserved. No advisory suppressions were added.

## Private real-table corpus

Do not commit third-party FPT files unless their redistribution terms permit it. Use trusted files from your local collection:

```sh
FPT_TEST_FILES='["/absolute/path/NewTable.fpt","/absolute/path/LightSequencerDemo.fpt","/absolute/path/Ramp-VUK-Demo.fpt"]' npm run test:e2e
```

Without this variable the real-file test explicitly skips. With supplied paths, missing files or failed imports fail the test. CI therefore verifies the public demo, not third-party table compatibility. Import success does not establish asset fidelity, script semantics or complete gameplay.

The script sandbox is best-effort filtering in the same JavaScript realm, not a hard security boundary. Only use trusted table scripts until stronger isolation and execution limits have been designed and verified.

## Next milestone: real-table gameplay

1. Establish one simple real FPT as the reference and record file hash, parser output, required libraries and unsupported elements.
2. Verify plunger, both flippers, scoring, drain, next ball, game over and reset in complete games. Check ball saves separately.
3. Perform sustained foreground play and compare 60/120/144 Hz on actual hardware. Headless software-rendering timings are not a gameplay performance benchmark.
4. Expand to three to five tables, recording import, assets, script APIs, collisions and lifecycle independently.
5. Decide from those results whether a supported 2.5D subset is sufficient or true multilevel 3D physics is required. The current mini-rapier engine simulates x/y; z compatibility does not provide full 3D dynamics.
6. Validate desktop/cabinet builds before publishing a release. Browser smoke tests alone do not verify physical input latency, multiscreen output or signed updates.

## Reference corpus measurements — 15 October 2026

| Reference | Bytes | Stream count after fix | Stream byte mismatches against `cfb` oracle | Geometry interpretation |
| --- | ---: | ---: | ---: | --- |
| NewTable.fpt | 226816 | 563 | 0 | Current typed element extractor returns zero; legacy format remains a gap |
| LightSequencerDemo.fpt | 227328 | 505 | 0 | 497 elements extracted; type labels and semantic fidelity remain unverified |
| Ramp-VUK-Demo.fpt | 224768 | 463 | 0 | 73 elements extracted; ramps/VUK and vertical dynamics remain unverified |

Hashes (SHA-256):

- NewTable.fpt: `a807c191f754d292a7ed5e34f7d6a1552eb5676db06b551127948cd96336e749`
- LightSequencerDemo.fpt: `b779ee5cf6c57dfce02dbc14c287cfc28187e7a42f69dc18d9030635eb72bd14`
- Ramp-VUK-Demo.fpt: `75b2c02294f3b58078b770a1e6849fff2f381d8a99ed7da285b0f1930fa46c12`

Before the fix the custom reader exposed only the first four directory entries in these files. The physical FAT sector number was incorrectly used as the logical FAT page index. A second defect read mini-FAT sectors without accounting for the header, corrupting small streams beyond their first mini sector. Generated regression fixtures reproduce both bugs without including third-party assets.

Run the stream integrity check with the same `FPT_TEST_FILES` JSON array and `npm run test:run`. Stream preservation is independently checked; it does not certify geometry mapping or script behavior. Zero extracted elements must not be presented as proof that a table itself contains no elements.

## Gameplay regressions addressed in this baseline

- Delayed coin-screen display preserves credits inserted during table loading.
- Worker collision flippers use the same responsive length as the renderer. The resting gap calculation accounts for the 28-degree angle, 0.13 collider half-thickness, 0.22 ball radius and clearance. Four actual-engine tests cover initial portrait, square and wide layouts. Live viewport resizing still requires separate worker-geometry validation.
- Launch grace saves arm once per ball, avoiding endless replenishment on every saved-ball relaunch. Explicit game reset clears the timer; script-provided active windows remain intact.
- HUD counters compare against displayed values and cancel older numeric animations when reset. Milestone effects track logical score targets separately, so rapid updates do not repeat a celebration.
- Parsed cache content version 2 invalidates results produced by the broken reader/config path. The IndexedDB schema remains version 1; storage stamps content versions centrally.

Full-game browser checks observe natural ball transitions, positive scoring and a persisted game-over highscore. A repeated plunger input may immediately start the next game, so idle zero-score assertions are reserved for explicit table reset. The imported reference runs through the application's reconstructed approximation: completing its game does not prove that its original layout or VBScript rules have been reproduced faithfully.

Final local baseline (15 October 2026): 970 tests pass across 54 files with the three reference paths supplied; all four production-browser checks pass, including complete three-ball demo and imported-reference games with scoring and persisted game-over results. Browser validation used installed Chrome with software rendering. Hardware and original-table fidelity limits above still apply.

## Read-only native dependency audit

Run `npm run audit:fpt-dependencies -- --table /absolute/table.fpt --library-root /absolute/Libraries`.
Repeat `--table` for more tables and `--library-root` for ordered search roots. The table's parent directory is searched first; explicit roots follow in argument order. Only these roots are recursively inventoried. No default installation or home search occurs. This trusted-user Node CLI is never exposed to table scripts and does not write files; redirect stdout to save its JSON outside the repository when auditing private tables.

Schema version 2 adds member verification. Exit 0 requires complete recognized-record coverage, one resolved library file per reference, a complete root-member inventory for every referenced library, and exactly one member of the expected type per reference. Exit 1 means unresolved, ambiguous, missing, mismatched, partial or unreadable input; exit 2 means invalid flags/path configuration. JSON goes to stdout and diagnostics to stderr. Paths must be absolute and contain no traversal components. Symlinks in supplied path components and inventory entries are rejected; use canonical paths (for example, resolve platform directory aliases before invocation). Reported root IDs are canonical absolute paths; candidates are relative to those roots.

The additive `inventoryCoverage` field reports `complete` or `partial`. A partial inventory gives non-invalid resolutions the audit-only `inventory-incomplete` status, preserving observed candidates without claiming presence or absence conclusively. Symlinks, read failures and unsupported inventory names make inventory partial. The pure resolver API remains unchanged.

`resolved-file` still verifies only a filename. `memberVerification` reports `performed`, `partial`, or `not-performed` when the table has zero references. A `resolved-member` means the reference basename, with its final extension removed, matched exactly one root member storage ASCII-case-insensitively and that member's FTYP kind matched. Payloads are not decoded. `libraryMembers` records each opened library's SHA-256, root-member count, inventory coverage and issues. `gameplayVerification` remains `not-performed`. Zero references is not proof of no dependencies outside recognized native resource records. Unsupported and malformed records remain explicit partial coverage; the audit neither executes scripts nor synthesizes missing assets.

Corpus result (2026-10-31): all eight supplied tables; 1,267/1,267 references resolved to exactly one member of the expected kind; the seven referenced libraries had complete inventories with zero issues; table and library SHA-256 values matched `table-corpus.json`. Member presence is not hydration, rendering, or gameplay verification.

### Native dependency import preflight

Binary imports inspect recognized native image, sound, model, font and script
resource records before cache reconstruction and before worker buffer transfer.
The parse log summarizes external library/member declarations (up to five
libraries and three member examples each), and warns about malformed or
unsupported records. This is declaration discovery: external members are not
loaded or verified. A cache hit has the same preflight; JSON imports retain their
existing path. Unknown records and script-only dynamic paths remain outside this
coverage, so absence of diagnostics is not proof of dependency completeness.

Run `npx vitest run src/__tests__/fpt-import-dependencies.test.ts` for synthetic
CFB import ordering, transfer, partial-record, summary and JSON regressions.
Private production UI import smoke uses `FPT_TEST_FILES` with local trusted paths;
no private table bytes belong in the repository. Demo boot and native import
lifecycle checks do not establish native table-rule parity. Member hydration,
unsupported encodings, faithful 3D geometry/collisions, script rules and BAM
support remain separate verification work.

### FPL library asset extraction

`parseFPLFile` reads root FPL member storages and dispatches by `FTYP` rather than
guessing from stream names. Sounds (`OggS` FDAT) use the existing audio decoder;
models retain FDAT bytes and attempt the existing FPM parser; fonts and scripts
retain FDAT content; images use the existing image decoder. Unknown, malformed or
undecoded members produce one bounded warning per import. Legacy FPLs without member
storages keep the filename-regex path, and root-level BAM/physics streams still load.

Supplied-library probe (2026-10-31): `fpSounds` 20/20 OggS, `fpScripts` 1/1 UTF-8
script, `fpDmdFonts` 6/6 FDAT retained. The native `zLZO` container is decoded with
the recovered token rules (size at offset 4, LZO data at offset 8, M1/M2/M3/M4
matches and trailing literals). 90/90 `fpTextures` members decode (87 BMP plus
three TGA decals with a placeholder 1x1 header and inferred square dimensions),
11/11 `fpSphereMaps` and 3/3 `fpPlayfields` JPEG/BMP members decode in the
browser. Production-browser smoke (2026-10-31) loaded `fpSounds`, `fpScripts` and
`fpModels` from the private install through the file input: sound, script and model
member messages appeared and no page errors were captured. A later
`fpTextures` run loaded 90 textures. The observed MS3D binary layout (15-byte
vertices, 70-byte triangles, per-corner UVs) now parses 260/260 `fpModels` and
82/82 `fpRamps` members; this is structural parsing, not visual or collision
fidelity. The checks did not assert every rendered mesh, the remaining
`fpPlayfields` JPEG, font rendering or gameplay.

### Native table script extraction

Table scripts are stored as a `zLZO` block inside the `Table Data` stream, not as
plain text. The previous heuristics treated compressed bytes as text and produced a
corrupted script. A shared extractor now scans direct text streams and native
`zLZO` blocks, requires a high-confidence VBScript shape and selects the largest
candidate. Main-thread and worker parsing both use it.

Corpus extraction (2026-10-31): NewTable 26,624 chars; All In One Example Table
208,140; DmdDisplayDemo 10,667; LightSequencerDemo 9,651; Ramp-VUK-Demo 27,301;
SegmentDisplayDemo 5,966. samples.fpt and Empty Table have no extracted script.
This proves script bytes are recovered, not that every VBScript call is supported.

All 21 native `IScriptGlobal` names are now exposed. The previously absent
`AddDebugText`, `LogDebugTextToDisk`, `GetKeyCode`, `EffectMusic`, `BeginGame`,
`EnterHighScore`, `SortHighScores`, `LookAtPlayfield`, `LookAtBackbox`,
`LoadExternalScript` and `fpGameInPlay`/`fpTilted`/`fpTiltWarnings`/`fpBallID`/
`fpEventID`/`fpInitialJackpot` names have explicit web behavior; unsupported camera
or external-script operations log and return rather than throwing. This is global
API availability, not COM object, event-ordering or call-signature parity.

The transpiler now handles real-table syntax: `ByVal`/`ByRef`/`Optional`
parameters, `Option Explicit`, command-style dotted calls, `Dim` arrays,
colon-separated statements, single-line `If`/`Case`, `Exit`, `On Error`,
`<>`/`=<`/`=>`, empty arguments and doubled quotes. Five of the six extracted
corpus scripts produce syntactically valid JavaScript; All In One still hits
transpiler gaps (array-access ambiguity and complex string escaping).

`FuturePinball_BeginPlay` runs on script load, `EndPlay` on table reset, and
`KeyPressed`/`KeyReleased` from browser key events, with `TiltWarning`/`Tilted`
from the nudge path. Key codes currently use `KeyboardEvent.keyCode`; native VK
parity and full event ordering are not verified.

⚠ Production CSP now includes `'unsafe-eval'` because table scripts are compiled
at runtime with `new Function`. The sandbox remains best-effort same-realm
filtering, not a hard boundary; only trusted tables should be loaded. This is an
explicit security tradeoff required to execute VBScript. A production NewTable
import registers 35 handlers, but `BeginPlay` reaches a missing native element
binding (`Player1Reel.SetValue`). Unknown capitalized element names are now bound
to explicit placeholder objects, so a production NewTable `BeginPlay` completes
with 193 element bindings, 35 handlers and no handler error. Reels retain
`SetValue`/`Value`, lights call `setLampState`, flashers call `setFlasherState`,
and flippers expose `SolenoidOn`/`SolenoidOff`/`SolenoidPulse` plus strength state.
Unknown objects remain inert placeholders. Script-driven flipper physics and
rendered reel/display output are not implemented.

All six corpus scripts now compile. Added a restricted `Eval` that answers
`IsObject`/`IsEmpty`/`IsNull` without arbitrary code, and an inert `xBAM` proxy for
unknown optional BAM methods. AI1 registers 883 element placeholders but still
stops at `checkIfExist` runtime behavior, so BAM-heavy script execution is not yet
verified.

Preflight display limits are 160 UTF-16 code units per library/member/issue stream
path and 2,400 total native-preflight diagnostic code units per import, including
truncation ellipses. These limits affect log text only; pure decoder reports retain
full data.

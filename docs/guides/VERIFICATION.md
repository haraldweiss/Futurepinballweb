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

### Remaining build-time advisory (15 October 2026)

The Electron builder 26.15.3 chain `@electron/get@3.1.0 → global-agent@3.0.0 → roarr@2.15.4 → sprintf-js@1.1.3` carries [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c), a moderate denial of service involving precision specifiers. Eight affected package entries propagate this one advisory. The production-only audit is clean. The registry currently offers no patched sprintf-js release; npm suggests an Electron builder downgrade. Keep build inputs trusted and revisit on the next builder update; do not use `npm audit fix --force` to hide the finding. Electron builder and electron-updater versions have intentionally not changed.

Compatible lockfile updates patched source-map-js to 1.2.2, http-cache-semantics to 4.3.0 and fast-uri to 3.1.8, removing the two high findings and the additional URI advisory.

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

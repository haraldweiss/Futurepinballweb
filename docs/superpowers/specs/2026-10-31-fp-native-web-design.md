# Future Pinball native/web compatibility design

Date: 2026-10-31. Status: design approved by the user; implementation planning underway; no implementation or release claimed.

## Required outcome

Extend the existing Futurepinball Web application into an independently implemented player/editor for macOS, Windows and Linux. The user selected a native/web implementation, without a Windows compatibility runtime. Load and play existing Future Pinball tables without editing their original files or scripts. Reproduce base Future Pinball and applicable BAM behavior; expose remaining incompatibilities honestly.

The source project is `/Library/WebServer/Documents/Futurepinball Web`. This investigation and its local binary evidence live in `/Users/haraldweiss/projects/REA/analysis/future-pinball`. Preserve the source checkout's existing uncommitted changes. No executable or extracted proprietary resource is to be added to public source or installer payloads by default.

## What exists

The current package manifest declares TypeScript/Vite/three.js plus an Electron shell, macOS DMG/ZIP, Windows NSIS/portable, and Linux AppImage/DEB targets. Existing artifacts are older than the current manifest and do not prove the current version works. A three-OS release workflow already exists; extend and verify it rather than replacing it.

Prior source analysis in `ANALYSIS.md` identifies FPT/FPL/FPM parsing, a VBScript compatibility layer, and BAM modules, but the active physics implementation is 2D. These observations need revalidation against the dirty current checkout before changes. Serena failed initialization during this investigation; current source behavior remains unverified and implementation has not started.

The installed reference stack is fingerprinted in `reference-stack.json`; its AIO executable differs from the adjacent backup. Treat this stack and selected XML profile hashes as the explicit comparison baseline, not a claim about pristine upstream FP. Native reference execution on a Windows host with a defined capture method is a prerequisite for gameplay equivalence measurements. Static analysis and independent import fixes can proceed before those runs.

## Compatibility architecture (proposed engineering decisions)

1. **Read-only original input.** Treat the selected table and its original libraries, scripts, XML/configuration and media as an import package. Decode into a versioned internal representation in memory/cache. Preserve source paths and hashes; never silently rewrite the original table. Accept a table folder or install root so neighboring dependencies can be resolved.
2. **Dependency resolver.** Build a dependency manifest before play: requested names, exact resolved file, case-insensitive Windows-compatible lookup, ambiguity and missing dependencies. Handle Linux case sensitivity explicitly. Normalize separators and reject traversal outside user-selected roots. Distinguish required libraries from optional hardware integrations. Preserve archive-relative paths where applicable.
3. **Verified format decoding.** Recover FPT streams/TLV types, compression, object records and library/model layouts from call sites and the private fixture corpus. Retain unknown fields. Replace mesh guesses only after structural proof across fixtures. Separate file support from render support and playable support.
4. **Script contract.** Derive property access, dispatch IDs, argument shapes, defaults, enums and events from the type library plus native call sites and actual scripts. Keep VBScript case-insensitive semantics and event ordering. Route native-compatible object methods through adapters. Unknown or unsupported calls must produce actionable compatibility diagnostics. Never silently count a no-op as supported. Keep the current untrusted-script sandbox boundary.
5. **True 3D physics.** Select a maintained cross-platform engine with a browser/WASM route after checking moving flippers, ramps, ball spin, contact callbacks, deterministic stepping and licensing. Newton-derived behavior is the reference; using the same engine name is insufficient. Keep fixed simulation time separate from rendering and wall-clock pacing. Calibrate units/materials/constraints from recovered native call sites and controlled reference traces. Do not tune from DLL imports alone.
6. **BAM compatibility.** Implement the script-visible BAM contract and physics-profile selection independently. Separate physics/FizX prerequisites, magnetic fields and transformed mini-playfields from cameras/head tracking, dynamic lighting/materials, post effects and cabinet outputs. Translate Windows-only plugin protocols through optional platform adapters. Each adapter has explicit supported platforms and a clear unavailable state. Do not attempt to load x86 Windows BAM DLLs into the cross-platform renderer.
7. **Renderer and sound.** Decode original asset coordinates, transforms and materials. Use the extracted DMD algorithm as a reference with attribution in private analysis; verify through controlled captures. Reproduce sample/music playback, pitch, looping, volume and event completion needed by scripts. Compare fixed cameras, backglass, DMD and cabinet windows.
8. **Desktop and browser.** Share import, scripting, physics and renderer implementations. The Electron boundary supplies selected-folder access, persistence, device integration and independent displays. The browser uses user-granted files/directories and capability-based alternatives. Keep filesystem privileges out of table scripts.

Before implementing the resolver, specify table-relative, selected-library-root and default-library search precedence, and reject ambiguous case-folded matches rather than choosing arbitrarily. Define supported text encodings and locale-independent number parsing from actual files. Script compatibility additionally requires explicit numeric coercions, timer/event ordering and random-number behavior, verified against reference tables. Map native registry/COM persistence into application-owned storage scoped by table identity; keep scores, settings and caches outside original table files. Optional platform adapters are delivery stages, not removal of requested BAM/plugin features: enumerate every dependency as implemented, unavailable or deferred with its reason.

## Evidence and acceptance

`table-corpus.json` fingerprints the supplied eight FPT files, eight FPL libraries and two loose VBS scripts. This is an initial private regression corpus, not a representative community-table sample or permission to distribute the files. Add user-selected community tables with their complete dependency bundles and expected features before making broad compatibility claims.

Track each native interface/member and BAM capability as missing, partial, implemented-unverified or verified. Verification needs a real use site and expected result; metadata counts are not a parity percentage.

For each table, retain: input hashes, dependency resolution, decoded-object counts, script diagnostics, selected physics profile, event sequence and crash/error state. Test empty table/start/end; launcher/drain; flipper catch and fast shot; bumper; kicker capture/eject; ramp elevation; multiball; timers; display/audio; persistence; and applicable BAM features. Use matched initial conditions and timestamped inputs for native/reference and replacement runs. Set numeric tolerances only after reference repeatability is measured.

Release gates: type check and project tests; real table import/play tests; source file hashes unchanged; no unresolved required dependencies or script calls for tables labeled verified; all three desktop platforms installed and launched on actual target hosts/CI; macOS arm64 and x64, Windows x64, and Linux x64 as the proposed initial desktop matrix. Add Linux arm64 and Windows arm64 only with corresponding runtime tests. Include browser smoke tests. Signed/notarized release identity, updater behavior and uninstall preservation of user tables need platform checks. Producing an installer alone does not satisfy the gameplay gate.

## Delivery order

1. Restore source-analysis tooling, establish a clean baseline in an isolated writable checkout, and preserve the user's dirty source tree.
2. Produce the native API/BAM capability matrix and dependency reports for the private corpus. Recover signatures and native loader/physics functions before choosing patches.
3. Implement verified import/dependency fixes, with synthetic public fixtures and private real-table regressions. First require complete dependency resolution for the supplied base examples; then demonstrate launch/flippers/drain/ramp and their script events before moving to BAM-heavy tables.
4. Implement script contract gaps and true 3D physics; verify base example-table gameplay before BAM-heavy tables.
5. Implement BAM features in dependency order, beginning with profiles and script-required state, followed by visuals and platform hardware adapters.
6. Validate the expanded corpus on all target systems, then build current installers through the existing platform workflow. Publish only after the concrete artifacts and verification results are reviewable.

## Remaining decisions and limits

The fully native/web approach is user-selected. Keeping the existing stack, staged delivery, minimum CPU matrix and capability diagnostics are proposed engineering choices. Exact reference table selection, required hardware/plugin coverage and acceptable behavioral tolerances remain to be established from the corpus and reference runs. Full original/BAM parity is an extensive reconstruction project, not demonstrated by this design. Native Windows reference execution and target-platform installation have not been performed in this investigation.

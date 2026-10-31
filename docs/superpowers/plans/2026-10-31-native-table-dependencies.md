# Native Table Dependencies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read external asset references from unchanged native FPT records and produce deterministic, actionable library-resolution reports for the supplied example tables.

**Architecture:** Add a pure binary reference reader and a host-independent resolver. Run them from a read-only local audit command before wiring their results into the import UI; keep the existing player working. This is the first independently testable part of the approved reconstruction, not a declaration of playable/native parity.

**Tech Stack:** Existing TypeScript, Vitest, dependency-free CFB reader, Node CLI via existing tsx. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-10-31-fp-native-web-design.md` (approved by the user on 2026-10-31).

## Global Constraints

- Load existing Future Pinball tables without editing their original files or scripts.
- Native/web implementation; no Windows compatibility runtime.
- Preserve the existing TypeScript/Vite/three.js and Electron stack and script sandbox.
- Never count unresolved/no-op behavior as verified compatibility.
- Preserve existing uncommitted changes; work in `/Users/haraldweiss/projects/REA/futurepinball-web` on `codex/fp-native-compatibility`.
- Keep copyrighted native fixtures outside source/installer payloads; private corpus comes from `FPT_TEST_FILES`.
- Public tests use synthetic bytes; no tests mutate real fixtures.
- Type checking, focused tests, full project tests and production build must pass after changes.
- macOS, Windows and Linux share normalization/resolution behavior. Real installation and gameplay remain later release gates.

## Review Focus

1. External resource references exist without any script call: read native records, not guessed table names.
2. Linux may contain case-colliding libraries: report ambiguity instead of choosing an exact-case match arbitrarily.
3. Malformed TLV lengths must not read neighboring records or return a false complete result.
4. Windows paths may contain traversal, drive prefixes or UNC paths: reject ungranted paths before filesystem access.
5. References can resolve to a library file while its member is missing: distinguish file resolution from asset resolution and gameplay support.

## Reconnaissance and baseline

- Source baseline: the source checkout's `71e876583e667a0f168988d45380017d8251ed2e` plus inherited dirty tracked/untracked files, fast-forwarded in the isolated clone to fetched `origin/main` at `ac997bd3` (CI-action updates only). Original checkout untouched. `source-working-tree.patch` records inherited tracked changes outside this clone; `inherited-changes.json` verifies all 19 copied files match the original.
- `src/fpt/library.ts::detectLibraryDependencies` currently scans script patterns and guesses optional libraries from table names. It does not inspect native external-resource records.
- `src/fpt/legacy-container.ts::parseHeader` requires a recognizable payload and TYPE+NAME; external PinModel records can have no TYPE or payload. Do not reuse this function as an external-reference decoder or weaken its embedded-media contract.
- Native CFB survey found `fpTextures.fpl\\autoplunger.bmp`, `fpRamps.fpl\\rampender01-1.fpm`, `fpDmdFonts.fpl\\dmd05x05p.dmdf` and `fpSounds.fpl\\ballrelease.ogg` in NewTable. DmdDisplayDemo uses the older TLV tag family and external library records too.
- Current baseline: 979 passing tests, one skipped private-corpus test; TypeScript clean. Separate all-eight-table CFB oracle baseline is recorded in the analysis logs. This proves stream decoding only.

## Scope and sequencing

This plan delivers dependency discovery and preflight diagnostics. Subsequent plans cover member extraction/asset hydration; script API/event compatibility; true 3D physics; BAM profile/runtime behavior; and current target-platform installers. Do not represent successful preflight as successful gameplay. Source implementation remains in this chat; use one fresh final code review unless the user chooses per-task subagents.

### Task 1: Native external-reference decoding

**Files:**
- Create: `src/fpt/external-references.ts`
- Test: `src/__tests__/fpt-external-references.test.ts`
- Extend private test: `src/__tests__/real-fpt.test.ts`

**Interfaces:**
- Consumes: `CFBContainer` from `src/fpt/cfb-io.ts`.
- Produces: `readExternalReferences(container: CFBContainer): ExternalReferenceReport`.
- `ExternalReference = { streamPath: string; recordOffset: number; resourceName: string; sourcePath: string; libraryPath: string; memberPath: string; kind: 'image' | 'sound' | 'model' | 'font' | 'script' | 'unknown' }`.
- `ExternalReferenceReport = { references: ExternalReference[]; issues: Array<{ streamPath: string; offset: number; code: 'malformed-record' | 'unsupported-encoding' | 'incomplete-reference' }>; coverage: 'complete-recognized-records' | 'partial' }`.
- Recognized resource stream leaves: Image, Sound, PinModel, DmdFont and Script followed by a decimal index. Unknown stream families remain outside coverage; never claim all native dependencies are discovered.

- [ ] Write synthetic tests for both observed tag families: old name bytes `b2 be b2 ba`, path `b0 be ab b7`, end `bb b1 bb bd`; newer name `d7 d1 f4 a4`, path `d5 d1 ed a1`, end `e0 c4 fd a7`. Length is LE uint32 excluding its own four bytes; string value is LE byte length plus bytes. Assert source spelling, full stream path and record offset survive decoding.
- [ ] Test no TYPE/payload (external PinModel), no script, multiple references, unknown tags, exact-end records, byteOffset subarrays, truncated length, a string crossing its enclosing TLV, unsupported non-ASCII bytes, and misleading `.fpl` text in an unknown stream or non-path tag. Only structurally valid ASCII path records produce references in this first decoder; flag unsupported encodings rather than replacing bytes silently.
- [ ] Run `npm run test:run -- src/__tests__/fpt-external-references.test.ts`; observe failures for the missing module/API.
- [ ] Implement bounded TLV walking and preserve unknown-tag traversal by declared length. Split `.fpl` path components from member paths using separator boundaries, not a free-text regex. Require a nonempty library and member. Duplicate NAME/PATH or unterminated recognized records produce partial coverage and issues, not silent selection.
- [ ] Run focused tests and add private-corpus assertions for NewTable's named references and DmdDisplayDemo's old-family references. Require input bytes equal their pre-read copy. No fixture content enters Git.
- [ ] Commit only task-owned files after required checks; do not commit inherited changes.

### Task 2: Deterministic library-file resolution

**Files:**
- Create: `src/fpt/dependency-resolver.ts`
- Test: `src/__tests__/fpt-dependency-resolver.test.ts`

**Interfaces:**
- Consumes: `ExternalReference[]` from Task 1 and caller-inventoried file descriptors.
- `DependencyFile = { rootId: string; relativePath: string }`.
- `DependencyRoot = { id: string; priority: number }` (lower number searched first; equal priorities form a single ambiguity scope).
- Produces: `resolveLibraryFiles(references: readonly ExternalReference[], roots: readonly DependencyRoot[], files: readonly DependencyFile[]): LibraryFileResolution[]`.
- `LibraryFileResolution = { reference: ExternalReference; status: 'resolved-file' | 'missing-file' | 'ambiguous-file' | 'invalid-path'; candidates: DependencyFile[] }`.
- `resolved-file` explicitly means library file found, member not inspected.

- [ ] Write tests for Windows separators, case-insensitive library components, ordered roots, shuffled input determinism, nested relative library paths, missing files and case-colliding files. Two case-equivalent files at the winning priority are ambiguous even if one spelling exactly matches.
- [ ] Write tests rejecting absolute `/` paths, drive-qualified/drive-relative Windows paths, UNC paths, `..`, NUL/control characters, empty library/member components, and unknown root IDs. Distinct roots at lower priority cannot turn an already resolved higher-priority match into ambiguity. Reject duplicate root IDs as a caller configuration error.
- [ ] Run the focused test and observe missing implementation failures.
- [ ] Implement pure normalization with no filesystem, Node, DOM or Electron imports. Preserve original source names for diagnostics; match ASCII case-insensitively for the first supported encoding. Return stable candidates ordered by root priority, root ID and relative path.
- [ ] Run both new focused suites; commit task-owned files after required checks.

### Task 3: Read-only private table audit command

**Files:**
- Create: `scripts/audit-fpt-dependencies.ts`
- Create: `src/__tests__/fpt-dependency-audit.test.ts`
- Modify: `package.json` (one script only: `audit:fpt-dependencies`).
- Update: `docs/guides/VERIFICATION.md` (append a section, preserve inherited edits).

**Interfaces:**
- Consumes: Task 1 + Task 2 APIs, CFB `read`, explicit table arguments and ordered repeatable `--library-root` arguments.
- Produces CLI: `npm run audit:fpt-dependencies -- --table <absolute-fpt> --library-root <absolute-dir> [--library-root <absolute-dir> ...]`.
- Output JSON: `{ schemaVersion: 1, tables: Array<{ path: string; sha256: string; streamCount: number; referenceCoverage: ExternalReferenceReport['coverage']; issues: ExternalReferenceReport['issues']; resolutions: LibraryFileResolution[]; memberVerification: 'not-performed'; gameplayVerification: 'not-performed' }> }`.
- Exit 0 only when every table has complete recognized-record coverage and every discovered reference resolves to a file; exit 1 for unresolved/partial input; exit 2 for invalid CLI configuration. Document that zero references is not proof of no dependencies outside recognized records.

- [ ] Write a subprocess test generating a synthetic table and temporary library root. Assert root precedence, JSON schema, hash, source bytes unchanged and zero filesystem writes except caller-created temporary fixtures. Test missing/ambiguous libraries and malformed records yield exit 1; malformed flags yield exit 2 with no success JSON.
- [ ] Test symlink files/directories are not followed, nested inventory is deterministic and the table's parent root is inventoried first. Explicit library roots follow in argument order; no ambient home/default installation scanning. Canonicalize granted roots and keep reported paths within those roots. This is a read-only trusted-user CLI, never exposed to table scripts.
- [ ] Run focused tests and observe the missing command/API failure.
- [ ] Implement CLI using Node filesystem and crypto only at the host boundary; use existing `tsx` to run TypeScript. Report skipped symlinks/read failures as partial inventory, so a potentially missed conflicting file cannot yield a false resolved result. Keep error diagnostics on stderr and JSON on stdout.
- [ ] Run the command against all eight private tables and supplied Libraries directory, save JSON outside the public repo, verify table hashes against `table-corpus.json`, and inspect unresolved/partial cases. Fix only proven decoder/resolver defects; preserve genuinely unsupported results.
- [ ] Document invocation, expected statuses and limits. Run TypeScript and full tests; commit only task delta, retaining user's inherited verification-guide content.

### Task 4: Import preflight diagnostics in the active UI path

**Files:**
- Modify: `src/fpt/file-parser.ts`
- Create: `src/__tests__/fpt-import-dependencies.test.ts`
- Modify: `src/fpt-parser.ts` (export the pure report API).
- Modify: `docs/guides/VERIFICATION.md` (verification notes).

**Interfaces:**
- Consumes: `readExternalReferences` and the existing input `File` bytes in `parseFPTFile`.
- Produces: Native-reference diagnostics in the existing parse log before cache/worker/fallback parsing. No new filesystem privileges or script APIs; no automatic external-library loading in this task.
- Keep `parseFPTFile` signature and existing callbacks unchanged.

- [ ] Write a test importing a synthetic FPT with an external image reference and no script. Assert its native library/member is logged before either worker or cached-table build callbacks. Assert malformed recognized records produce a warning and no false verified-support message; JSON imports retain existing behavior.
- [ ] Run focused test and observe missing diagnostics failure.
- [ ] Decode preflight from an owned view of the original bytes before the worker transfers its ArrayBuffer. Emit concise warnings that external members need library resolution and are not yet verified. Preserve all current import/cache behavior; do not gate play based on guessed dependencies or present this step as hydration.
- [ ] Run focused tests, all project tests, `npm run typecheck` and `npm run build`. Use private corpus in existing production UI smoke tests where available; do not describe demo lifecycle success as native table-rule parity.
- [ ] Obtain a fresh code review covering binary bounds, path handling, inherited-change preservation and cache/worker parity. Fix actionable findings with regression tests. Record current support and remaining member hydration/3D/script/BAM work.
- [ ] Commit only task-owned delta after checks. Do not publish or merge as part of this local implementation.

## Completion record

Record each task's commands/results and decisions in a local ledger beside this plan. A phase is complete only when its tests and stated output exist. Preserve unsupported encodings, member extraction, script-only dynamic paths and native gameplay as explicit open items. The next implementation plan must use these reports to choose actual hydration fixes rather than broadening heuristics.

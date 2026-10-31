# Native Library Member Verification Plan

> **For agentic workers:** follow this plan task-by-task. Keep the implementation
> read-only; do not add asset hydration or gameplay claims in this plan.

**Goal:** Prove that every external reference discovered in a native FPT names an
actual member inside its resolved FPL library, and expose that result in the
read-only audit command. This closes the gap left by “resolved-file means library
found, member not inspected” without decoding or loading assets.

**Spec:** `docs/superpowers/specs/2026-10-31-fp-native-web-design.md` (approved).
**Predecessor plan:** `docs/superpowers/plans/2026-10-31-native-table-dependencies.md`.

## Evidence

Structural inspection of the eight supplied FPL libraries (independent `cfb-io`
reader) shows:

- Each member is a root storage such as `Root Entry/autoplunger` containing four
  streams: `FTYP` (LE uint32 type), `FLAD` (8 bytes), `FPAT` (Windows creator
  path), `FDAT` (payload).
- `FTYP` values observed: 1 image, 2 sound, 4 model, 5 DMD font, 6 script. These
  match the external-reference `kind` values decoded from native FPT records.
- Reference member paths include an extension (`autoplunger.bmp`,
  `ballrelease.ogg`, `rampender01-1.fpm`, `dmd05x05p.dmdf`) while storage names omit
  it. Matching the reference basename with its final extension removed,
  ASCII-case-insensitively, matched **1,267 / 1,267** references across the corpus
  with **0 ambiguous, 0 missing and 0 kind mismatches**.
- `FDAT` payloads remain opaque in this plan: compressed texture data, Ogg audio,
  nested CFB model data, DMD font data, and script text. Verifying membership does
  not verify that a member can be decoded or played.

Method and samples: analyst probe over `native-dependency-audit.json` plus the
supplied `Libraries/` directory. No fixture bytes enter the repository.

## Global constraints

- Read-only. Never rewrite a table or library; never extract payloads to disk.
- Pure decoder/matcher: no Node, DOM, Electron or filesystem imports.
- Synthetic public fixtures only; private libraries stay outside Git.
- Preserve inherited working-tree changes; commit only task-owned files.
- Do not claim hydration, render support or gameplay from member presence.

## Task 1: Pure FPL member inventory and matching

**Files:**
- Create: `src/fpt/library-members.ts`
- Create: `src/__tests__/fpt-library-members.test.ts`

**Interfaces:**
- Consumes: `CFBContainer` and `ExternalReference`.
- Produces:
  - `readLibraryMembers(container: CFBContainer): LibraryMemberInventory`
  - `resolveLibraryMembers(references, libraries): MemberResolution[]`
  - `LibraryMember = { name; kind; type; sourcePath; data }`
  - `LibraryMemberInventory = { members; issues; coverage }`
  - `MemberResolution = { reference; status: 'resolved-member' | 'missing-member' | 'ambiguous-member' | 'member-type-mismatch'; candidates }`

**Rules:**
- Inventory only root-level member storages whose direct children include
  `FTYP`/`FDAT`; ignore unrelated streams and nested storage noise.
- Require a bounded 4-byte `FTYP`; missing or short values are issues, not silent
  skips. Unknown type values are retained as `unknown` and make coverage partial.
- Preserve source spelling, source path and payload view; do not decompress or
  inspect payload bytes.
- Match a flat reference basename against the storage name, ASCII-case-insensitively,
  with the final extension removed; also consider an exact full-name match. Any
  second candidate is ambiguous, including case-only and extension variants.
- Reject subpaths, empty components and non-flat member paths as missing.
- Missing library inventories, duplicate normalized library paths and non-finite
  inputs are caller configuration errors where the resolver already treats them so.

**TDD:**
- [ ] Write synthetic FPL tests for one of each observed FTYP kind, extension and
  case-insensitive matching, exact/stem ambiguity, missing member/library, subpath,
  type mismatch, unknown type, missing FTYP/FDAT, duplicate names, non-ASCII names,
  shuffling and input-byte preservation.
- [ ] Run `npx vitest run src/__tests__/fpt-library-members.test.ts`; observe the
  missing module failure.
- [ ] Implement the pure module.
- [ ] Run focused tests, `npm run typecheck` and configured security lint; commit
  only task files.

## Task 2: Read-only audit integration and documentation

**Files:**
- Modify: `scripts/audit-fpt-dependencies.ts`
- Modify: `src/__tests__/fpt-dependency-audit.test.ts`
- Modify: `docs/guides/VERIFICATION.md`

**Rules:**
- Reuse resolved-file candidates to read each library once (cache by canonical
  absolute path), bounded to granted roots; never follow symlinks.
- Add additive `libraryMembers` inventory records and `memberResolutions`; change
  `memberVerification` from `not-performed` to `performed`/`partial`.
- Bump the audit schema version and document the new exit rule: exit 0 requires
  complete recognized-record coverage, resolved files, complete member inventories
  and every reference resolving to a member of the expected kind.
- Keep file-only `resolutions` unchanged. Missing/ambiguous/mismatched members
  must not be reported as verified compatibility.
- Document that member presence is not decoding, hydration, rendering or gameplay.
- [ ] Extend subprocess tests with synthetic FPL libraries: complete match, missing
  member, ambiguous match, type mismatch and unknown type exit 1; malformed
  inventory exits 1; unchanged exit 2 for bad flags.
- [ ] Run the command against all eight private tables and libraries, save JSON and
  stderr outside the public repository, and verify table/library hashes.
- [ ] Run focused tests, full suite, typecheck and build; commit only the task delta.

## Completion criteria

- Public synthetic tests cover every status and malformed case.
- Private corpus: all 1,267 resolved files are opened, every reference resolves to
  one member of the expected kind, and no library member inventory is partial.
- The audit never claims member contents were decoded or verified for gameplay.
- Ledger records commands, results, hashes and remaining unknowns.

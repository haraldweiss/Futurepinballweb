# Native FPL Asset Extraction Plan

**Goal:** Use the verified FPL member inventory to load native library assets by
`FTYP` instead of filename guessing. Keep unsupported payloads explicit and do not
claim rendering or gameplay verification.

**Spec:** `docs/superpowers/specs/2026-10-31-fp-native-web-design.md`.
**Predecessor:** `docs/superpowers/plans/2026-10-31-native-library-members.md`.

## Evidence

- FPL members are storages with `FTYP`/`FLAD`/`FPAT`/`FDAT`; `FTYP` 1/2/4/5/6 is
  image/sound/model/font/script.
- Stock `FDAT` signatures: sounds start with `OggS`; scripts are text; models are
  nested CFB; fonts start with `FPDMDFNT`; textures start with a custom
  `zLZO6l`/`BM6l` container that the current decoders do not read as BMP.
- Existing `parseFPM` parses 195/260 `fpModels.fpl` and 75/82 `fpRamps.fpl` members
  in a Node probe. This is extraction coverage, not geometry proof.
- Reference names omit the extension while storage names also omit it, so the
  member inventory is the authoritative source for dispatch and keys.

## Task 1: FTYP dispatch in `parseFPLFile`

**Files:** `src/fpt/library-members.ts`, `src/fpt/file-parser.ts`,
`src/__tests__/fpl-library-parsing.test.ts`.

- Add `groupLibraryMembers(inventory)` returning per-kind member arrays.
- In `parseFPLFile`, read `readLibraryMembers` once. When members exist, dispatch
  by `kind` and `FDAT` data:
  - image → existing `extractImageFromBytes`; failure counted, bytes retained only
    in diagnostics (no texture entry).
  - sound → existing `extractSoundFromBytes`; store decoded `AudioBuffer`.
  - model → retain bytes in `modelLibrary`, try `parseFPM`/`fpmToTHREE` and register
    a mesh; failures counted.
  - font → retain `FDAT` bytes in `fontLibrary`.
  - script → decode text and retain; invalid text counted.
  - unknown → counted and warned.
- Keep BAM/physics ancillary streams for root-level legacy streams.
- When no member storages exist, preserve the current filename-regex legacy path.
- Duplicate member names are skipped with a warning.
- Log one bounded summary of undecoded members; no per-file flood.
- Tests use synthetic FPL members plus mocked image/audio/model decoders to assert
  dispatch, keys and FDAT arguments; unknown/malformed and legacy fallback cases.

## Task 2: Private-library probe and documentation

- Run a Node probe over all eight supplied FPL libraries: count members by kind,
  decode sound signatures, parse models, and record texture/font limits.
- Update `docs/guides/VERIFICATION.md` with FTYP dispatch scope, exact counts and
  the fact that texture containers, font rendering and geometry are not verified.
- Keep private fixtures outside Git; no table or library bytes are copied.

## Completion criteria

- Public tests pass and `tsc`/build/security lint are clean.
- Sound/script/font/model bytes come from `FDAT`, not filename guesses.
- No claim that textures decode, fonts render or parsed geometry is faithful.
- Ledger records the probe counts and remaining unsupported formats.

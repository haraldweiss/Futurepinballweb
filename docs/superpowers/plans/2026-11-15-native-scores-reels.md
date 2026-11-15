# Native runtime scores and visible reels

Continuation of the approved 2026-10-31 native/web design: script contracts,
display output and verified base-table lifecycle. Execute inline with the
test-first and executing-plans skills. Preserve inherited edits/private assets.

## Scope

- Live runtime `nvScore1..4`, indexed `nvScore(player)`, `nvCredits` and
  `CurrentPlayer`, connected to existing game state; no claim of native NVRAM
  persistence, native high-score tables or complete VBScript semantics.
- API accessor reads/writes must remain live inside delayed handlers rather than
  snapshot at load. Generate internal accessor references without widening the
  script sandbox or exposing host globals. Preserve strings, comments and
  member accesses; script declarations must not be silently corrupted.
- Native reel value and bulb state are independent. Implement SetValue,
  AddValue and ResetToZero, bounded digit counts and a visible accessible display
  fallback for imported reels. It is not original model placement or DMD fonts.
- Clear display output/old handlers on table reset. Keep unsupported BAM physics
  and coordinate lookup explicitly unsupported.

## Steps

1. Reproduce missing score globals/stale accessors and reel-state defects with
   synthetic runtime tests, then implement small modules under `src/script/`.
2. Connect reel updates to a compact visible table-display panel. Verify output,
   score addition, bulb changes, malicious names rendered as text, and reset.
3. Run unit suite, typecheck, build, security lint and independent code review.
4. Run production browser checks: NewTable's caught BeginPlay failure must be
   gone, script scoring must update a visible reel, and AI1's unsupported
   coordinate boundary must remain explicit. Check responsive layout.
5. Document results and next steps: table-scoped persistence, input/rule/physics
   event ownership, visible DMD/fonts and native model/material placement,
   flipper physics, coordinate BAM lookup, broader corpus and installers.

No original native assets enter Git. Do not stage inherited changes. Existing
branch is codex/fp-native-compatibility; push authorization from the prior
continuation applies to this branch, but only verified task-owned changes ship.

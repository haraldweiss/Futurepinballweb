# Coin/start ownership implementation plan

Continuation of the approved native script-contract design and user request to
continue game compatibility. Execute inline with test-first implementation.

Goal: a physical coin/start press runs either native rules or demo rules once.
A declared FuturePinball_KeyPressed marks native coin/start ownership, including
when script compilation/execution fails; this is a routing policy, not a parity
claim. Legacy aliases and tables without this handler retain demo controls.

- [x] Reproduce native credit double changes, start score overwrite, premature
      host auto-start and delayed host coin screen with synthetic scripts/tests.
- [x] Add a small ownership state module, set before script evaluation, reset on
      reload/table change, and prevent demo coin/start/screen paths in native mode.
- [x] Consolidate demo credit/start writes in coin-system/coin-handler.ts and
      extract host arcade keyboard routing from main.ts. One accepted coin adds
      one credit; start spends credits once, initializes players/scores once,
      and supports remaining credits for another game. Keep modifiers/repeats
      from starting games. Native BeginGame/EndGame remain runtime script APIs.
- [x] Native plunger fallback requires script BeginGame; it must not auto-start
      a game using demo credits. Query native game-in-play through runtime state.
- [x] Run unit/type/build/security checks and independent review, verify visible
      synthetic native credit/start/EndGame output and demo launch in production
      browser, plus private base-table startup. Verify exact staged tree.
- [x] Document evidence/limits; commit and push only task-owned files under prior
      branch authorization. Never include inherited changes/private assets.

Remaining: native scoring/drain/ball-save ownership, element hit event parity,
script-driven solenoid physics, native bindings/persistence, BAM and 3D fidelity.
This change does not label native tables playable.

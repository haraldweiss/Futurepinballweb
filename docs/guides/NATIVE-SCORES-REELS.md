# Native runtime scores and reel output

Updated 2026-11-15. This continues the native compatibility design; it does not
establish original-table playability.

## Implemented

- Runtime `nvScore1` through `nvScore4`, indexed `nvScore(player)` and
  `nvCredits` connect to game state. `CurrentPlayer` switches the active score.
  These values are runtime state, not native nonvolatile storage.
- Native API accessors remain live in delayed script handlers. Script-owned
  declarations and parameters retain their own scope; strings and object member
  names are preserved.
- Imported reels expose independent numeric value and bulb state, SetValue,
  SetScore, AddValue, Reset/ResetToZero and bounded Count/Digits (1–12).
  A readable, labeled screen panel displays these values. BulbOff dims the
  fallback without erasing the score; native bulb constants are 0/1/3.
- EndGame clears the runtime game-in-play flag while preserving final scores.
- Table reset removes old handlers and reel output and cancels script-owned
  timeouts/intervals, including element timer callbacks.

## Limits

The display panel is a fallback, not native backglass geometry, mechanical reel
animation, blinking fidelity or FPDMDFNT rendering. Scores/credits are not saved
per table. NewTable and LightSequencerDemo lifecycle checks do not verify complete
rules, key mapping or flipper physics. AI1 still reaches the explicitly unsupported
BAM coordinate lookup. Script isolation remains the existing best-effort sandbox;
load trusted tables only.

## Verification

Local working-tree checks: 1,126 tests passed, 3 skipped; TypeScript and production
build clean; security lint 0 errors, 711 warnings. Ten score/reel/lifecycle tests
cover live handler state, script shadowing, indexed scores, case-insensitive reel
calls, EndGame and timer cleanup. Browser checks are recorded in the task ledger.
Exact staged-tree verification: 1,119 tests passed, 3 skipped; typecheck, build
and security lint passed. The difference is inherited uncommitted tests excluded
from this change. Production browser checks passed for the synthetic reel table,
NewTable, LightSequencerDemo and AI1's explicit unsupported boundary.
Private tables/assets remain outside the repository.

## Next steps

1. Define native input/rule ownership: implement verified GetKeyCode values and
   prevent demo game logic from conflicting with imported table rules. Connect
   script-driven flipper solenoids to actual physics and test event order.
2. Add versioned, table-identity-scoped score/credit/high-score persistence, with
   explicit reset and migration behavior.
3. Render native DMD fonts and display content, then validate reel/backglass
   placement and model UV/material fidelity against native captures.
4. Implement evidence-backed BAM coordinate object lookup and high-use COM
   members, keeping unsupported behavior explicit.
5. Validate a 3D physics replacement against native stepping, materials and
   constraints. Expand real-table gameplay checks before building installers.

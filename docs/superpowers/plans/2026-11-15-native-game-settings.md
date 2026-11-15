# Native runtime settings and NewTable start plan

Continuation of the approved native script-contract design and user's request
to continue. Execute inline with test-first implementation; preserve inherited
edits and keep native binaries, extracted scripts and fixtures outside Git.

Evidence: installed TYPELIB IScriptGlobalnvRam exposes read/write
nvBallsPerGame (DISPID9), nvJackpot(51), nvTotalGamesPlayed(52), scalar/indexed
special scores. Setter parameter records use VT_I4; getter pointers/defaults
and exact native overflow/persistence semantics still require deeper recovery.
Private NewTable explicitly increments statistics and initializes per-player
arrays when starting. Do not increment counters automatically in BeginGame.

- [x] Add an opt-in private production browser check for coin/start and the
      delayed ball-creation request; reproduce the actual failing path first.
      Red path: `nvTotalGamesPlayed is not defined`; green path reaches
      `PlungerKicker.CreateBall` (evidence logs in
      `analysis/future-pinball/2026-11-15-native-game-settings/`).
- [x] Reproduce missing runtime properties with synthetic tests. Add per-script
      runtime settings/statistics shared by live handlers; default balls=3,
      jackpot/games=0 are explicit web adapter defaults, not recovered native
      registry values. Validate finite nonnegative safe numbers; balls>=1.
- [x] Implement scalar/indexed special score state with BeginGame reset, while
      preserving settings, jackpot and script-managed statistics across games.
      Reset these values on script/table reload. No NVRAM persistence claim.
- [x] If the real start path exposes missing 1D Dim allocation, reproduce it
      with independent scripts and allocate inclusive bounds. Do not claim
      complete Empty/Variant/multidimensional/ReDim parity.
- [x] Run unit/type/build/security checks. Verify private start/delay control
      flow, explicit placeholder boundary and demo/browser regressions on the
      exact staged tree where appropriate.
- [x] Independent review report; fixed the confirmed mixed-case array,
      bare-accessor clobber, call-style index write and stale-settings findings
      with regressions in this change.
- [x] Document evidence, defaults and remaining game/physics/display gaps.
- [ ] Push task-owned commits; local commit lands first and push waits for
      explicit approval per the workspace rules of engagement.

A successful ball-creation request to a placeholder is not physical ball
creation, rendered fidelity, native physics or playability.

Rulings from observed failures: the real start required fixed1D Dim allocation,
array reads in conditions and shared top-level variable/constant scope. Existing
runSandboxed functions were outside that table scope; moving the prelude inside
the same proxy fixes visibility without changing host allowlists. Dedicated
security review and unknown-host/separate-table closure regressions cover it.
Quoted/nested array reads required a literal-masked balanced scanner rather than
a regex split across strings; the first candidate regression was rejected and
fixed before shipping. Native kicker requests remain explicit placeholders.

# Native drain and ball-count ownership

Updated 2026-11-15. This page records the second native script-to-host stage:
when a table script owns the rules, its drain handler and `CreateBall` requests
now drive the host ball lifecycle instead of the demo save/three-ball logic.

## Ownership switch

`setNativeCoinRules` marks a table as script-owned when it declares
`FuturePinball_KeyPressed`. That same ownership flag now covers drain and ball
count:

- While the host detects a drain (`ballPos.y < -5.4`, low speed) and the table
  is script-owned, the host dispatches the table's drain handler(s) and parks
  the ball. It does **not** run demo ball saves, bonus points, `ballNum++` or
  game-over.
- `callScriptDrain` matches `Drain_Hit`, `PinMechSound_Drain_Hit`,
  `BallDrain`, `Table_BallDrain` and `Table1_BallDrained`; every match runs.
- If no drain handler exists, the host falls back to the demo lifecycle so a
  table cannot silently die.
- A parked ball is moved out of play (`y = -20`, gravity 0) and the lane
  re-arm / stuck watchdog are suspended. Only the table's `CreateBall` brings a
  ball back.
- `Kicker.CreateBall` while parked re-arms the shooter-lane ball and advances
  the HUD ball number; while a ball is already in the lane it only re-arms;
  during play it spawns an extra ball through the existing multiball path.
- The demo's three-ball logic is replaced by the script's own
  `nvBallsPerGame`/`BallsRemaining` flow. `EndGame` resets the HUD ball number.

## Host points

Script-owned tables no longer receive the reconstructed demo points for
bumpers, targets, slingshots, spinners, ramps or the demo rollover lanes. The
host still plays sounds, shows particles/effects, updates lamps and dispatches
the table's handlers, so the table's own `AddScore` calls are the only score
source. Demo tables without a native script keep the old scoring unchanged.

## High-score completion

Native tables call `EnterHighScore(CurrentPlayer)` and expect
`FuturePinball_NameEntryComplete(Position, Special)` afterwards. The web adapter
records the score and then invokes that callback synchronously (there is no
initials UI), which lets the table run `EndOfBallComplete` → `EndOfGame` →
`EndGame`.

## Observed effect on the private NewTable reference

Production build, trusted local `NewTable.fpt`, coin + start + Enter:

- Natural drains now run the table's `Drain_Hit` (`Drain.DestroyBall` appears in
  the script log), the script's 1 s end-of-ball timer requests the next ball,
  and the HUD ball number moves 1 → 2 → 3.
- On the last ball the table records the score, completes name entry and calls
  `EndGame`; the HUD returns to ball 1 and the high score is persisted.
- The opt-in `imported reference plays through scoring, three balls and game
  over` production check passes for NewTable (≈26 s), including a persisted
  high score.
- Demo boot/reload, demo three-ball game over and the private start check still
  pass.

Evidence: `analysis/future-pinball/2026-11-15-native-element-bridge/`.

## Remaining limits

- Native ball saver / shoot-again logic is inert: `PlungerLaneGate_Hit`,
  `PlungerLaneTrigger_Hit` and `PlungerKicker_Hit` are not routed, so
  `bBallSaverActive` never arms. Extra-ball awards that rely on those events do
  not run.
- The HUD ball number is a host-side approximation of script `BallsRemaining`;
  multiball and extra-ball requests during play spawn a demo extra ball and do
  not change the HUD count. Multi-player games are not verified.
- High-score entry is synchronous and does not ask for initials.
- Element coordinates are still unused for ball placement; triggers, gates and
  rollovers are not routed; playfield geometry remains reconstructed demo
  shapes; native Newton physics/materials, BAM, DMD fonts and reels are
  incomplete.

Native drain ownership proves control flow and ball lifecycle, not native
physics or full playability.

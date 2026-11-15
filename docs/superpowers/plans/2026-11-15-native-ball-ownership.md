# Native drain and ball-count ownership plan

Second native script-to-host stage, after `2026-11-15-native-element-bridge.md`.
Goal: let a script-owned table's drain handler and `CreateBall` requests drive
the host ball lifecycle instead of the demo save/three-ball logic, and stop
double scoring.

Guardrails: no private assets or inherited edits in the commit; demo tables must
keep their current lifecycle; untested native behavior is documented, not
claimed.

- [x] Reproduce the gap: native `Drain_Hit` never ran, host demo ball saves and
      three-ball logic owned the ball, and host demo points added to script
      `AddScore`.
- [x] Route drain detection to matching native handlers (`Drain_Hit`,
      `PinMechSound_Drain_Hit`, plus the legacy demo names); fall back to the
      demo lifecycle when no handler exists.
- [x] Park the drained ball out of play and suspend the lane re-arm / stuck
      watchdog until the script requests a ball.
- [x] Make `CreateBall` re-arm the parked ball and advance the HUD ball number;
      `EndGame` resets it.
- [x] Complete `EnterHighScore` by invoking `FuturePinball_NameEntryComplete`
      synchronously so native tables can reach `EndOfGame`/`EndGame`.
- [x] Suppress reconstructed demo points for script-owned tables (bumper,
      target, slingshot, spinner, ramp, demo rollovers) while keeping visuals,
      sound and handler dispatch.
- [x] Unit regressions: drain-name matching, demo fallback names, unrelated
      timers, parking, next-ball service, HUD reset, high-score completion.
- [x] Production NewTable check: natural drains move the ball 1 → 2 → 3 and
      `EndGame` returns the HUD to 1; the imported-reference e2e passes with a
      persisted high score.
- [x] Demo boot/reload, demo three-ball game over and private start still pass.
- [ ] Ball saver / shoot-again, extra-ball awards, multi-player, trigger/gate
      routing, multiball HUD parity, native physics. These remain open.

Control-flow and ball-lifecycle evidence only; not native playability.

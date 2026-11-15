# Native element bridge plan

Continuation of the native script-contract work after the settings/array commit.
Goal: make imported table scripts actually drive the reconstructed host table
where a faithful mapping exists, and record what remains unreachable.

Guardrails: no native binary or fixture in Git, no weakening of tests, keep the
sandbox allowlist unchanged.

- [x] Reproduce that native handler names never fire: NewTable uses
      `LeftSlingshotRubber_Hit` / `RightSlingshotRubber_Hit`, while the host
      dispatched only `LeftSlingshot_Hit` / `Bumper1_Hit` demo names.
- [x] Dispatch collisions by handler-name shape instead of exact demo names:
      prefix/suffix-tolerant matching for bumpers, targets and slingshots, and
      invoke every matching handler.
- [x] Route `Flipper.SolenoidOn/Off/Pulse` to host flipper control through a new
      `setFlipperSolenoid` callback; keep it idempotent with keyboard input.
- [x] Route `Kicker.CreateBall` to a host ball request through a new
      `createBall` callback (re-arm the lane ball or add an extra ball).
- [x] Unit regressions for flipper solenoids, pulse release, CreateBall, native
      slingshot suffix dispatch, library-prefixed bumper dispatch and the
      no-handler case.
- [x] Verify on the private NewTable reference in a production build: the native
      slingshot handler's bulb flashes appear and score becomes 55 (host 50 +
      script 5).
- [x] Verify demo boot, demo three-ball game over and the private start check
      still pass (3/3).
- [ ] Native drain/ball-count ownership, host-scoring suppression, trigger and
      gate routing, kicker coordinates/impulses, playfield geometry and BAM.
      These remain open and are documented as such.

A working `CreateBall` request is not physical ball creation or native physics.

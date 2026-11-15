# Native element bridge

Updated 2026-11-15. This page records the first script-to-host element wiring for
imported native tables. It is deliberately narrow: it makes table scripts drive
the reconstructed host ball and flippers and lets native handler names run, but
it does **not** reproduce native physics, playfield geometry or ball rules.

## What is wired now

| Script call | Host behaviour |
| --- | --- |
| `LeftFlipper.SolenoidOn/Off` | Sets the host left-flipper key state; plays the flipper sound only when the state actually changes. |
| `RightFlipper.SolenoidOn/Off` | Same for the right flipper. |
| `Flipper.SolenoidPulse` | Engages for ~120 ms, then releases. |
| `Kicker.CreateBall` | When the host ball is in the shooter lane it is re-armed there; otherwise an extra ball is spawned through the existing multiball path. |
| `Kicker.DestroyBall` | Diagnostic only in this stage; the host drain path still owns ball removal. |

Events dispatched from host collisions now match native handler names instead
of only demo names:

- Bumpers: `Bumper1_Hit`, `PinMechSound_Bumper1_Hit`, `Left_Bumper1_Hit`
  (`(?:^|_)bumper_?<n>_hit`, case-insensitive).
- Targets: `Target1_Hit`, `StandupTarget1_Hit` (word must end in `target`).
- Slingshots: `LeftSlingshot_Hit`, `LeftSlingshot_Slingshot`,
  `LeftSlingshotRubber_Hit`, `PinMechSound_Left_Slingshot_Hit`
  (`(?:^|_)<side>_?slingshot.*(?:hit|slingshot)`).
- Every matching handler is invoked, so a table can keep a sound handler next to
  a scoring handler.

## Observed effect on the private NewTable reference

Before this change, host collisions called only `Bumper1_Hit`-style demo names.
NewTable's handlers are `LeftSlingshotRubber_Hit` / `RightSlingshotRubber_Hit`,
so its script scoring and bulb flashes never ran.

After the change (production build, trust-local `NewTable.fpt`, coin + start +
Enter launch + nudges):

- `PlungerKicker.CreateBall()` now reports `-> host ball requested` and re-arms
  the lane ball.
- A slingshot hit logs `RightSlingshotBulb1.FlashForMs(100, 50, 0)` and
  `RightSlingshotBulb2.FlashForMs(100, 50, 0)` — the native handler's own lines.
- Score changes from 50 (host slingshot points) to **55** (host 50 + script
  `AddScore(5)`).

Evidence: `analysis/future-pinball/2026-11-15-native-element-bridge/`
(`newtable-script-routing.log`, `production-browser.log`).

## Still missing

- **Drain and ball-count ownership** stay with the host demo lifecycle. Native
  `Drain_Hit`, ball-saver timers, end-of-ball bonus and high-score entry do not
  drive the host ball yet. Host score still adds demo points next to script
  `AddScore`, so scoring is not native-faithful.
- **Element positions are not used.** `CreateBall` and kicker actions fall back
  to the host shooter lane because imported FP coordinates are not mapped to the
  reconstructed table. Kicker placement, kick impulse and multiball position are
  therefore approximations.
- **No real playfield geometry.** Walls, rubbers, ramps and flippers are the
  reconstructed demo shapes; native Newton materials, constraints and multilevel
  surfaces are not reproduced.
- **Triggers, gates, spinners and lane rollovers** are not routed to native
  element names. `PlungerLaneTrigger`, `PlungerLaneGate` and `PlungerKicker`
  handlers do not fire.
- **BAM objects** (`xBAM.FindObject`, coordinate overloads, materials) remain
  unsupported; AI1 still stops at the BAM path.
- **Display output**: reels render from state, DMD fonts/presentation and native
  lamp sequencing are incomplete.

A successful `CreateBall` request is still not proof of native ball creation,
physics fidelity, rendering fidelity or playability.

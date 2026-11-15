# Native keyboard compatibility implementation plan

Continuation of the approved 2026-10-31 script-contract design and the user's
request to continue the next priorities. Execute inline using executing-plans.

Goal: native table handlers receive scan codes consistent with GetKeyCode,
distinguish left/right modifiers, and receive one press/release per physical key.
The native TYPELIB fixes eKeyCode names/values (0..16); private AI1 use sites
identify J=36/K=37, matching DirectInput scan codes. Web default action bindings
are an adapter policy, not recovered installed registry settings.

Architecture: a small physical-key mapper plus per-table key state under
src/script/. main.ts routes native handlers through it; legacy handler aliases
retain browser virtual-key values. The existing sandbox is unchanged.

- [x] Reproduce missing enum/GetKeyCode, left/right collapse, repeat duplication,
      editable-field input and focus-loss release in synthetic tests.
- [x] Implement enum constants, supported action defaults, keyboard-code mapping,
      explicit unsupported-key diagnostics and scoped press/release tracking.
- [x] Wire production native input dispatch/reset/blur. Keep demo controls
      separate from native event representation; full rule ownership and solenoid
      physics are explicitly deferred until base game lifecycle is verified.
- [x] Verify unit suite, typecheck/build/security lint, independent code review,
      production browser native press/release, and unchanged base-table startup.
- [x] Document static evidence, adapter defaults and remaining gaps. Stage only
      task-owned changes; no original fixtures or inherited edits. Push the
      verified feature branch under the existing user authorization.

Review focus: keys typed in editors; Shift side/location; browser repeat;
missing keyup after blur; reset/reload while held; unsupported layout codes.

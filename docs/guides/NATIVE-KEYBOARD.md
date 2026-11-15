# Native table keyboard adapter

Updated 2026-11-15. Native `FuturePinball_KeyPressed/KeyReleased` handlers now
receive physical DirectInput scan codes. Browser `keyCode` cannot distinguish
left and right Shift and uses a different number space. Older `_KeyPressed` /
`KeyPressed` (and release) aliases retain browser virtual-key values.

## Bindings

The installed TYPELIB defines 17 eKeyCode action IDs, numbered 0–16. These IDs
are arguments to GetKeyCode; they are not keyboard scan codes. All names are
available case-insensitively, as is GetKeyCode.

| Action | Web native-table profile | Scan code |
| --- | --- | --- |
| LeftFlipperKey | Left Shift | 42 |
| RightFlipperKey | Right Shift | 54 |
| StartGameKey | 1 | 2 |
| InsertCoinKey | 5 | 6 |
| PlungerKey | Enter | 28 |
| NudgeLeftKey | Z physical position | 44 |
| NudgeUpKey | Space | 57 |
| NudgeRightKey | X physical position | 45 |
| InsertCoinKey2 / InsertCoinKey3 | 6 / 7 | 7 / 8 |

These are adapter defaults. They do not import the installed Future Pinball
registry or follow the separate demo key-binding settings. Special1/2,
ToggleHud, secondary flippers, Test and Service actions return 0 with an
unsupported-action diagnostic until their binding behavior is implemented.

## Event behavior

- Physical `KeyboardEvent.code` preserves left/right modifiers and layout
  position. Letters, digits, common punctuation, modifiers, F1–F12, numeric
  keypad and navigation keys map to scan codes; unidentified codes are ignored.
- A held key emits one press and one release. Browser repeat and composing
  input are ignored. Text fields, contenteditable and CodeMirror editors do not
  initiate gameplay presses; releases for already-held keys still work there.
- Blur/hidden-page events release held script keys and legacy flippers and
  cancel stored plunger power. Script/table reset discards prior held-key state.

## Evidence and limits

Private TYPELIB member offsets and inline constants are recorded in
`analysis/future-pinball/native-key-enum.json` outside the app repository.
Private AI1 use sites identify J=36 and K=37, consistent with Microsoft's
[DirectInput scan-code definitions](https://github.com/microsoft/win32metadata/blob/main/generation/WinSDK/RecompiledIdlHeaders/um/dinput.h).
The scan-code interpretation is corroborated by those script use sites; native
reference execution/event order and native configured bindings remain unverified.

Nine synthetic regressions cover scan-code/action matching, sides, repeats,
case-insensitive names, legacy aliases, editor/composing input, unknown keys,
focus loss, reload and plunger/legacy-flipper cleanup. The production browser
fixture checks separate Shift keys, repeated keydown, blur and later physical
keyup against visible reel output. NewTable and LightSequencerDemo startup
checks pass; AI1 still reports unsupported coordinate lookup.

Input compatibility alone does not establish gameplay. Demo coin/start and
native rules still overlap; rule ownership, native-configurable bindings and
script-driven solenoid physics remain next work. The existing script sandbox
is unchanged. Use trusted tables only.

Verification: isolated commit tree **1,128 passed / 3 skipped**, typecheck/build
clean, security lint **0 errors / 711 warnings**. Exact-tree production keyboard
and reel check passed. The working tree has **1,135 passed / 3 skipped** because
it includes inherited uncommitted tests excluded from this change.

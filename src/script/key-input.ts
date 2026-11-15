// SPDX-License-Identifier: AGPL-3.0-or-later
/** eKeyCode values recovered from the installed native TYPELIB (not scan codes). */
export const nativeKeyActions = {
  LeftFlipperKey: 0, RightFlipperKey: 1, StartGameKey: 2, InsertCoinKey: 3,
  PlungerKey: 4, NudgeLeftKey: 5, NudgeUpKey: 6, NudgeRightKey: 7,
  Special1Key: 8, Special2Key: 9, ToggleHudKey: 10, InsertCoinKey2: 11,
  InsertCoinKey3: 12, LeftFlipper2Key: 13, RightFlipper2Key: 14,
  TestKey: 15, ServiceKey: 16,
} as const;

// Physical DOM code -> DirectInput scan code. This is independent of layout/key.
// Numeric facts: Microsoft WinSDK dinput.h; native scripts corroborate J=36/K=37.
const scanCodes: Readonly<Record<string, number>> = {
  Escape: 1, Digit1: 2, Digit2: 3, Digit3: 4, Digit4: 5, Digit5: 6,
  Digit6: 7, Digit7: 8, Digit8: 9, Digit9: 10, Digit0: 11,
  Minus: 12, Equal: 13, Backspace: 14, Tab: 15,
  KeyQ: 16, KeyW: 17, KeyE: 18, KeyR: 19, KeyT: 20, KeyY: 21,
  KeyU: 22, KeyI: 23, KeyO: 24, KeyP: 25, BracketLeft: 26, BracketRight: 27,
  Enter: 28, ControlLeft: 29, KeyA: 30, KeyS: 31, KeyD: 32, KeyF: 33,
  KeyG: 34, KeyH: 35, KeyJ: 36, KeyK: 37, KeyL: 38, Semicolon: 39,
  Quote: 40, Backquote: 41, ShiftLeft: 42, Backslash: 43, KeyZ: 44,
  KeyX: 45, KeyC: 46, KeyV: 47, KeyB: 48, KeyN: 49, KeyM: 50,
  Comma: 51, Period: 52, Slash: 53, ShiftRight: 54, NumpadMultiply: 55,
  AltLeft: 56, Space: 57, CapsLock: 58,
  F1: 59, F2: 60, F3: 61, F4: 62, F5: 63, F6: 64,
  F7: 65, F8: 66, F9: 67, F10: 68, NumLock: 69, ScrollLock: 70,
  Numpad7: 71, Numpad8: 72, Numpad9: 73, NumpadSubtract: 74,
  Numpad4: 75, Numpad5: 76, Numpad6: 77, NumpadAdd: 78,
  Numpad1: 79, Numpad2: 80, Numpad3: 81, Numpad0: 82, NumpadDecimal: 83,
  IntlBackslash: 86, F11: 87, F12: 88, NumpadEnter: 156, ControlRight: 157,
  NumpadDivide: 181, PrintScreen: 183, AltRight: 184, Pause: 197,
  Home: 199, ArrowUp: 200, PageUp: 201, ArrowLeft: 203,
  ArrowRight: 205, End: 207, ArrowDown: 208, PageDown: 209,
  Insert: 210, Delete: 211, MetaLeft: 219, MetaRight: 220, ContextMenu: 221,
};

// Web native-table profile. Not an import of the installed FP registry bindings.
const actionCodes: Readonly<Partial<Record<number, string>>> = {
  0: 'ShiftLeft', 1: 'ShiftRight', 2: 'Digit1', 3: 'Digit5', 4: 'Enter',
  5: 'KeyZ', 6: 'Space', 7: 'KeyX', 11: 'Digit6', 12: 'Digit7',
};
export function getNativeKeyCode(action: unknown): number {
  const id = Number(action);
  const code = Number.isInteger(id) ? actionCodes[id] : undefined;
  return code ? scanCodes[code] : 0;
}

export function isEditableKeyTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],.cm-editor');
}

function physicalCode(event: KeyboardEvent): string {
  if (event.code) return event.code;
  // Older synthetic touch plunger events include key but not always code.
  if (event.key === 'Enter') return 'Enter';
  if (event.key === 'Shift' && event.location) return event.location === 2 ? 'ShiftRight' : 'ShiftLeft';
  return '';
}

type HeldKey = { scan: number; legacy: number };
export class NativeKeyInput {
  private held = new Map<string, HeldKey>();
  constructor(private emit: (scan: number, legacy: number, pressed: boolean) => void) {}

  handle(event: KeyboardEvent, pressed: boolean): void {
    const code = physicalCode(event);
    if (pressed) {
      if (event.repeat || event.isComposing || isEditableKeyTarget(event.target) || this.held.has(code)) return;
      const scan = Object.hasOwn(scanCodes, code) ? scanCodes[code] : 0;
      if (!scan) return;
      const key = { scan, legacy: event.keyCode };
      this.held.set(code, key); this.emit(scan, key.legacy, true);
    } else {
      const key = this.held.get(code);
      if (!key) return;
      this.held.delete(code); this.emit(key.scan, key.legacy, false);
    }
  }

  release(): void {
    const held = [...this.held.values()]; this.held.clear();
    for (const key of held) this.emit(key.scan, key.legacy, false);
  }
  reset(): void { this.held.clear(); }
}

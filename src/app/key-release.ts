// SPDX-License-Identifier: AGPL-3.0-or-later
import { keys, state } from '../game';
import { releaseFPScriptKeys, callScriptFlipper } from '../script-engine';

/** Cancel held controls when the page loses keyboard focus. */
export function releaseHeldControls(): void {
  releaseFPScriptKeys();
  const left = keys.left, right = keys.right;
  keys.left = false; keys.right = false;
  state.plungerCharging = false; state.plungerCharge = 0;
  if (left) callScriptFlipper('left', false);
  if (right) callScriptFlipper('right', false);
}

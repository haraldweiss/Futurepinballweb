// SPDX-License-Identifier: AGPL-3.0-or-later
let nativeCoinRules = false;
export function usesNativeCoinRules(): boolean { return nativeCoinRules; }
/** The loaded table script owns game rules (coins, scoring, drain, ball count). */
export function usesNativeScriptRules(): boolean { return nativeCoinRules; }
export function setNativeCoinRules(enabled: boolean): void { nativeCoinRules = enabled; }

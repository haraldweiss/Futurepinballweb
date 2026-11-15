// SPDX-License-Identifier: AGPL-3.0-or-later
let nativeCoinRules = false;
export function usesNativeCoinRules(): boolean { return nativeCoinRules; }
export function setNativeCoinRules(enabled: boolean): void { nativeCoinRules = enabled; }

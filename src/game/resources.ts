import type { FPTResources } from '../types';

export const fptResources: FPTResources = {
  textures:  {},
  sounds:    {},
  playfield: null,
  script:    null,
  animations: new Map(),
  models: new Map(),
  mapped: { bumper: null, flipper: null, drain: null },
};

export const fptRawBytes = {
  textures:  {} as Record<string, Uint8Array>,
  sounds:    {} as Record<string, Uint8Array>,
  models:    {} as Record<string, Uint8Array>,
  otherStreams: [] as Array<{ name: string; data: Uint8Array }>,
  scriptOriginal: null as string | null,
};

export function resetFPTRawBytes(): void {
  fptRawBytes.textures = {};
  fptRawBytes.sounds   = {};
  fptRawBytes.models   = {};
  fptRawBytes.otherStreams = [];
  fptRawBytes.scriptOriginal = null;
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as CFB from 'cfb';

export interface FPTSerializeInput {
  script: string;
  textures: Record<string, Uint8Array>;
  sounds:   Record<string, Uint8Array>;
  models:   Record<string, Uint8Array>;
  otherStreams: Array<{ name: string; data: Uint8Array }>;
}

/**
 * Serialize FPT state into a CFB container ready for writing to disk.
 *
 * Stream layout:
 * - /Script — VBScript source (UTF-8)
 * - /Textures/<name> — raw image bytes
 * - /Sounds/<name>   — raw audio bytes
 * - /Models/<name>   — raw model bytes
 * - /<name>          — preserved unknown streams (top-level)
 */
export function serializeFPT(input: FPTSerializeInput): Uint8Array {
  const cfb = CFB.utils.cfb_new();

  if (input.script) {
    const bytes = new TextEncoder().encode(input.script);
    CFB.utils.cfb_add(cfb, '/Script', bytes);
  }

  for (const [name, data] of Object.entries(input.textures)) {
    CFB.utils.cfb_add(cfb, '/Textures/' + name, data);
  }

  for (const [name, data] of Object.entries(input.sounds)) {
    CFB.utils.cfb_add(cfb, '/Sounds/' + name, data);
  }

  for (const [name, data] of Object.entries(input.models)) {
    CFB.utils.cfb_add(cfb, '/Models/' + name, data);
  }

  for (const stream of input.otherStreams) {
    CFB.utils.cfb_add(cfb, '/' + stream.name, stream.data);
  }

  const out = CFB.write(cfb, { type: 'array' });
  return out instanceof Uint8Array ? out : new Uint8Array(out as number[]);
}

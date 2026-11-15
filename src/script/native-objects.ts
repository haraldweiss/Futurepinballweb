// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ParsedTableElement } from '../fpt/table-elements';

type ScriptObject = Record<string, unknown>;
type Diagnostic = (message: string) => void;

// IDs verified in the native table corpus for the adapters implemented here.
// Do not depend on older parser versions' guessed element labels.
export function nativeScriptKind(element: ParsedTableElement): string {
  const kinds = new Map([[3, 'light'], [7, 'flipper'], [23, 'light'], [25, 'reel'], [29, 'light']]);
  return kinds.get(element.type) ?? 'unknown';
}

const adapterProperties = new Map([
  'Strength', 'AngleSwing', 'Enabled', 'State', 'Intensity', 'Brightness',
  'Value', 'Score', 'Digits', 'Count', 'Z', 'Angle',
].map(name => [name.toLowerCase(), name]));

/** Session-local identities for decoded declarations, not native physics bodies. */
export class NativeScriptObjects {
  private readonly entries = new Map<string, ParsedTableElement[]>();
  private readonly objects = new Map<string, ScriptObject>();
  private readonly info = new Map<string, ScriptObject>();
  private readonly reported = new Set<string>();

  constructor(
    elements: readonly ParsedTableElement[],
    private readonly createElement: (name: string, kind?: string) => ScriptObject,
    private readonly report: Diagnostic,
  ) {
    for (const element of elements) {
      const key = element.name.toLowerCase();
      this.entries.set(key, [...(this.entries.get(key) ?? []), element]);
    }
  }

  private warn(message: string): void {
    if (this.reported.has(message)) return;
    this.reported.add(message);
    this.report(message);
  }

  element(name: string): ScriptObject {
    const key = name.toLowerCase();
    if (!this.entries.has(key) && key.endsWith('ext') && this.entries.has(key.slice(0, -3))) {
      return this.find(name.slice(0, -3));
    }
    let object = this.objects.get(key);
    if (!object) {
      const matches = this.entries.get(key);
      const entry = matches?.length === 1 ? matches[0] : undefined;
      object = this.createElement(entry?.name ?? name, entry ? nativeScriptKind(entry) : undefined);
      this.objects.set(key, object);
    }
    return object;
  }

  find(name: string): ScriptObject {
    const key = name.toLowerCase();
    const existing = this.info.get(key);
    if (existing) return existing;
    const matches = this.entries.get(key) ?? [];
    const entry = matches.length === 1 ? matches[0] : undefined;
    const reason = matches.length > 1 ? 'ambiguous' : 'missing';
    if (!entry) this.warn(`BAM FindObject: ${name} is ${reason} in imported table declarations`);
    const values = new Map<string, unknown>([
      ['name', entry?.name ?? name], ['exist', !!entry], ['x', entry?.x], ['y', entry?.y],
      ['extint1', 0], ['extint2', 0], ['extfloat1', 0], ['extfloat2', 0],
    ]);
    const base = entry ? this.element(entry.name) : undefined;
    const info = new Proxy<ScriptObject>(Object.create(null), {
      get: (_target, prop) => {
        if (typeof prop !== 'string') return undefined;
        const property = prop.toLowerCase();
        if (property === 'setmaterial') return (...coefficients: unknown[]) => {
          if (!entry) throw new Error(`BAM SetMaterial: ${name} is ${reason}`);
          if (coefficients.length !== 4 || !coefficients.every(v => typeof v === 'number' && Number.isFinite(v))) {
            throw new Error(`BAM SetMaterial: ${name} requires four finite numeric coefficients`);
          }
          const [elasticity, softness, staticFriction, kineticFriction] = coefficients;
          values.set('physicsmaterial', Object.freeze({ elasticity, softness, staticFriction, kineticFriction }));
          this.warn(`BAM ${entry.name}.SetMaterial retained but not applied to native physics`);
        };
        if (values.has(property)) return values.get(property);
        // Extension values use case-insensitive keys. Base adapters retain their
        // existing callbacks and property semantics.
        return base?.[adapterProperties.get(property) ?? prop];
      },
      set: (_target, prop, value) => {
        if (typeof prop !== 'string') return false;
        const property = prop.toLowerCase();
        if (['name', 'exist', 'x', 'y', 'physicsmaterial'].includes(property)) return false;
        const adapterProperty = adapterProperties.get(property);
        if (base && adapterProperty) {
          base[adapterProperty] = value;
        } else {
          values.set(property, value);
        }
        return true;
      },
    });
    this.info.set(key, info);
    return info;
  }

  findObject(...args: unknown[]): ScriptObject {
    if (args.length !== 1 || typeof args[0] !== 'string') {
      throw new Error('BAM FindObject: coordinate lookup is unsupported; only imported element names are implemented');
    }
    return this.find(args[0]);
  }

  createAllExt(): void {
    for (const entries of this.entries.values()) {
      if (entries.length === 1) this.find(entries[0].name);
    }
    this.warn('BAM CreateAllExt: imported element bindings available; native extension physics is unsupported');
  }
}

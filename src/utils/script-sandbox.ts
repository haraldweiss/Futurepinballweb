// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * Sandbox for VBScript-transpiled JavaScript.
 *
 * Background: `script-engine.ts` transpiles VBScript inside user-supplied .fpt
 * files to JS, then evaluates that JS via `new Function`. Without isolation, a
 * malicious table can call `fetch`, read `localStorage`, etc. This module
 * provides two layers of defense:
 *
 *   1. Static scan: reject scripts that reference forbidden identifiers,
 *      including the `constructor` / `prototype` / `__proto__` chain that would
 *      otherwise reach the real `Function` constructor.
 *   2. Runtime scope: a Proxy returns `undefined` for any bare identifier the
 *      script references that isn't in the explicit allowlist below. Used as
 *      `with(__sandbox__) { ... }` so bare names go through the trap.
 *
 * THREAT MODEL — this is best-effort, defense-in-depth, NOT a hard isolation
 * boundary. The Proxy only governs bare-identifier resolution; it cannot stop a
 * script that obtains any live built-in (e.g. via a function literal) from
 * walking `.constructor.constructor` to the real `Function` in this realm. The
 * static scan closes the practical, copy-paste escape vectors, but a determined
 * attacker using computed-string obfuscation (e.g. `["con"+"structor"]`) can
 * still slip through. Treat loaded tables as semi-trusted (like a downloaded
 * program). True isolation would require a separate realm (Worker/iframe) — see
 * the follow-up note in the review. Do not widen ALLOWED_GLOBALS without
 * re-examining this boundary.
 */

/** Browser/runtime globals safe to expose to scripts. Read-only intent. */
const ALLOWED_GLOBALS: ReadonlySet<string> = new Set([
  // ECMAScript built-ins
  'Math', 'Date', 'JSON',
  'String', 'Number', 'Boolean', 'Array', 'Object', 'Symbol',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'Error', 'TypeError', 'RangeError', 'SyntaxError',
  'RegExp', 'Map', 'Set', 'WeakMap', 'WeakSet',
  'Promise',
  'undefined', 'NaN', 'Infinity',
  // Timers (game scripts genuinely need these)
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  // Logging
  'console',
]);

/**
 * Identifiers whose mere appearance in a transpiled script is rejected.
 * Catches the common attack patterns; the Proxy is the actual fence.
 */
const FORBIDDEN_PATTERNS: ReadonlyArray<{ re: RegExp; name: string }> = [
  { re: /\bfetch\s*\(/, name: 'fetch' },
  { re: /\bnew\s+(?:XMLHttpRequest|WebSocket|EventSource|RTCPeerConnection)\b/, name: 'network constructor' },
  { re: /\beval\s*\(/, name: 'eval' },
  { re: /\bnew\s+Function\s*\(/, name: 'Function constructor' },
  { re: /\bimport\s*\(/, name: 'dynamic import' },
  { re: /\b(?:localStorage|sessionStorage|indexedDB|caches)\b/, name: 'browser storage' },
  { re: /\b(?:electronAPI|ipcRenderer|require)\b/, name: 'Electron/Node bridge' },
  { re: /\b(?:parent|opener|frames)\.\s*\w/, name: 'cross-frame access' },
  // eslint-disable-next-line no-useless-escape -- Escapes are necessary in regex character class
  { re: /\b(?:window|globalThis|self|top)\s*[\.\[]/, name: 'global object access' },
  { re: /\bdocument\s*\.\s*(?:write|cookie|domain|location)\b/, name: 'document.write/cookie/domain/location' },
  { re: /\bnavigator\s*\.\s*(?:sendBeacon|serviceWorker|geolocation|credentials|usb|hid|bluetooth)\b/, name: 'navigator privileged API' },
  { re: /\blocation\s*\.\s*(?:assign|replace|href|hash|search)\b/, name: 'location redirect' },
  // Constructor-chain escape: `obj.constructor.constructor` is the real Function
  // constructor, which runs in the global realm and bypasses the `with` proxy.
  // The transpiler never emits these tokens legitimately, so reject them outright.
  { re: /\bconstructor\b/, name: 'constructor (prototype-chain escape)' },
  { re: /\bprototype\b/, name: 'prototype access' },
  { re: /\b__proto__\b/, name: '__proto__ access' },
  { re: /\b(?:Reflect|Proxy)\b/, name: 'Reflect/Proxy' },
];

export class ScriptSandboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScriptSandboxError';
  }
}

/**
 * Pre-execution scan. Throws `ScriptSandboxError` listing every match.
 * Returns silently if the script is clean.
 */
export function validateTranspiledJs(jsCode: string): void {
  const hits: string[] = [];
  for (const { re, name } of FORBIDDEN_PATTERNS) {
    const m = re.exec(jsCode);
    if (m) hits.push(`${name} (matched "${m[0].slice(0, 40)}")`);
  }
  if (hits.length) {
    throw new ScriptSandboxError(
      `Script rejected — ${hits.length} forbidden reference${hits.length === 1 ? '' : 's'}: ${hits.join('; ')}`
    );
  }
}

/**
 * Build a Proxy that becomes the `with` target. Bare identifiers in the script
 * resolve here first; anything outside the allowlist returns `undefined`.
 *
 * Assignments to bare names land on an internal store (sandbox-scoped vars)
 * so the script can mutate locals without poisoning real globals.
 */
/**
 * Names the `with` block must NOT trap — they are function parameters that
 * the script engine relies on (`__api__` for game API injection, `__h__` for
 * handler harvest). Without this exception the proxy would shadow them and
 * `__api__.score = …` becomes `undefined.score = …`.
 *
 * `Symbol.unscopables` lets us punch through `with` for specific names while
 * still trapping everything else.
 */
const UNSCOPABLE_NAMES = ['__api__', '__h__', '__sandbox__'] as const;
const UNSCOPABLES_OBJ: Record<string, boolean> = Object.freeze(
  UNSCOPABLE_NAMES.reduce((acc, n) => { acc[n] = true; return acc; }, {} as Record<string, boolean>)
);

function buildSandboxScope(passthrough: ReadonlySet<string> = new Set()): object {
  const unscopables = passthrough.size > 0
    ? { ...UNSCOPABLES_OBJ, ...Object.fromEntries([...passthrough].map(name => [name, true])) }
    : UNSCOPABLES_OBJ;
  const scopeStore: Record<string | symbol, unknown> = Object.create(null);
  return new Proxy(scopeStore, {
    has() {
      // Claim every name exists so `with` always traps and never falls through
      // to the real global scope. Names listed in Symbol.unscopables (see
      // `get`) bypass this and resolve via the enclosing function parameters.
      return true;
    },
    get(target, key) {
      // `with` consults Symbol.unscopables and skips properties whose value
      // is truthy in the returned object. We use it to expose the engine's
      // reserved parameter names (__api__, __h__, __sandbox__).
      if (key === Symbol.unscopables) return unscopables;
      if (key in target) return target[key];
      if (typeof key === 'string' && ALLOWED_GLOBALS.has(key)) {
        return (globalThis as Record<string, unknown>)[key];
      }
      return undefined;
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  });
}

/**
 * Run a transpiled VBScript program inside the sandbox.
 *
 * `bindings` and `collect` are the existing string fragments built by
 * `runFPScript` (var-injection of api members and post-run handler harvest).
 * They are passed verbatim so behavior matches the previous implementation.
 *
 * Throws `ScriptSandboxError` for forbidden references. Other errors from
 * the script body propagate unchanged.
 */

function splitLeadingFunctions(code: string): { prelude: string; body: string } {
  const lines = code.split('\n');
  const prelude: string[] = [];
  const body: string[] = [];
  let depth = 0, i = 0;
  const delta = (line: string) => {
    let value = 0, quote = '';
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (quote) { if (ch === quote) quote = ''; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '/' && line[j + 1] === '/') break;
      if (ch === '{') value++;
      else if (ch === '}') value--;
    }
    return value;
  };
  while (i < lines.length) {
    if (/^\s*function\s+\w+/.test(lines[i])) {
      const block: string[] = [lines[i]];
      let blockDepth = delta(lines[i]);
      while (blockDepth > 0 && i + 1 < lines.length) {
        i++;
        block.push(lines[i]);
        blockDepth += delta(lines[i]);
      }
      prelude.push(block.join('\n'));
      depth = 0;
      i++;
      continue;
    }
    body.push(lines[i]);
    depth += delta(lines[i]);
    i++;
  }
  return { prelude: prelude.join('\n'), body: body.join('\n') };
}

export function runSandboxed(
  jsCode: string,
  bindings: string,
  collect: string,
  api: Record<string, unknown>,
  handlers: Record<string, (...args: any[]) => any>,
  passthrough: ReadonlySet<string> = new Set(),
): void {
  validateTranspiledJs(jsCode);
  const bindingNames = new Set([...bindings.matchAll(/var\s+(\w+)/g)].map(match => match[1]));
  const { prelude, body } = splitLeadingFunctions(jsCode);
  const functionNames = new Set([...prelude.matchAll(/^function\s+(\w+)/gm)].map(match => match[1]));
  const sandbox = buildSandboxScope(new Set([...passthrough, ...bindingNames, ...functionNames]));
  // Function declarations and API bindings live outside `with`; the proxy only
  // traps unknown identifiers. Passthrough names resolve to the outer scope.
  // eslint-disable-next-line no-new-func -- Dynamic code is necessary for VBScript sandbox (input pre-validated)
  const fn = new Function(
    '__api__', '__h__', '__sandbox__',
    `${bindings}\n${prelude}\nwith (__sandbox__) {\n${body}\n${collect}\n}`
  );
  fn(api, handlers, sandbox);
}

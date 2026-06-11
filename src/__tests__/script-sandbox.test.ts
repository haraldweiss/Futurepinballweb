// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
import { describe, it, expect } from 'vitest';
import { runSandboxed, validateTranspiledJs, ScriptSandboxError } from '../utils/script-sandbox';

describe('VBScript sandbox', () => {
  describe('validateTranspiledJs (static scan)', () => {
    it('accepts plain math and control flow', () => {
      expect(() => validateTranspiledJs('var x = 1 + 2; for (var i=0;i<10;i++) x += i;')).not.toThrow();
    });

    it('accepts script using whitelisted globals (Math, Date, JSON, console)', () => {
      expect(() => validateTranspiledJs('var x = Math.sin(Date.now()); console.log(JSON.stringify({x}));')).not.toThrow();
    });

    it('accepts setTimeout/setInterval (timers are needed for game scripts)', () => {
      expect(() => validateTranspiledJs('setTimeout(function(){}, 100); var t = setInterval(fn, 50);')).not.toThrow();
    });

    it('rejects fetch()', () => {
      expect(() => validateTranspiledJs('fetch("https://evil.example/")')).toThrow(ScriptSandboxError);
    });

    it('rejects new XMLHttpRequest', () => {
      expect(() => validateTranspiledJs('var r = new XMLHttpRequest();')).toThrow(ScriptSandboxError);
    });

    it('rejects new WebSocket', () => {
      expect(() => validateTranspiledJs('new WebSocket("ws://evil")')).toThrow(ScriptSandboxError);
    });

    it('rejects eval()', () => {
      expect(() => validateTranspiledJs('eval("1+1")')).toThrow(ScriptSandboxError);
    });

    it('rejects new Function', () => {
      expect(() => validateTranspiledJs('var f = new Function("return 1");')).toThrow(ScriptSandboxError);
    });

    it('rejects dynamic import()', () => {
      expect(() => validateTranspiledJs('import("./evil.js")')).toThrow(ScriptSandboxError);
    });

    it('rejects localStorage / sessionStorage / indexedDB / caches', () => {
      expect(() => validateTranspiledJs('localStorage.setItem("k","v")')).toThrow(ScriptSandboxError);
      expect(() => validateTranspiledJs('sessionStorage.getItem("k")')).toThrow(ScriptSandboxError);
      expect(() => validateTranspiledJs('var db = indexedDB.open("x")')).toThrow(ScriptSandboxError);
      expect(() => validateTranspiledJs('caches.open("c")')).toThrow(ScriptSandboxError);
    });

    it('rejects Electron bridge access', () => {
      expect(() => validateTranspiledJs('electronAPI.openFile()')).toThrow(ScriptSandboxError);
      expect(() => validateTranspiledJs('ipcRenderer.send("x")')).toThrow(ScriptSandboxError);
      expect(() => validateTranspiledJs('var fs = require("fs")')).toThrow(ScriptSandboxError);
    });

    it('rejects window/globalThis/self/top property access', () => {
      expect(() => validateTranspiledJs('window.location = "https://evil"')).toThrow(ScriptSandboxError);
      expect(() => validateTranspiledJs('globalThis["fet"+"ch"]("x")')).toThrow(ScriptSandboxError);
      expect(() => validateTranspiledJs('top.opener')).toThrow(ScriptSandboxError);
    });

    it('rejects document.write / cookie / location', () => {
      expect(() => validateTranspiledJs('document.write("<script>")')).toThrow(ScriptSandboxError);
      expect(() => validateTranspiledJs('document.cookie = "session=x"')).toThrow(ScriptSandboxError);
    });

    it('rejects location redirects', () => {
      expect(() => validateTranspiledJs('location.href = "evil"')).toThrow(ScriptSandboxError);
      expect(() => validateTranspiledJs('location.replace("evil")')).toThrow(ScriptSandboxError);
    });

    // Constructor-chain escape: any object's `.constructor.constructor` is the
    // real Function constructor, which runs in the global realm and bypasses the
    // `with` proxy entirely. The transpiler never emits these tokens legitimately.
    it('rejects .constructor property access', () => {
      expect(() => validateTranspiledJs('var f = (function(){}).constructor;')).toThrow(ScriptSandboxError);
      expect(() => validateTranspiledJs('var g = [].constructor.constructor;')).toThrow(ScriptSandboxError);
      expect(() => validateTranspiledJs('var h = ({})["constructor"];')).toThrow(ScriptSandboxError);
    });

    it('rejects __proto__ access', () => {
      expect(() => validateTranspiledJs('var p = ({}).__proto__;')).toThrow(ScriptSandboxError);
    });

    it('rejects .prototype access', () => {
      expect(() => validateTranspiledJs('var p = Object.prototype;')).toThrow(ScriptSandboxError);
    });

    it('rejects Reflect / Proxy', () => {
      expect(() => validateTranspiledJs('Reflect.get(x, "y")')).toThrow(ScriptSandboxError);
      expect(() => validateTranspiledJs('new Proxy({}, {})')).toThrow(ScriptSandboxError);
    });
  });

  describe('runSandboxed (runtime scope)', () => {
    it('runs a benign script and exposes api members via bindings', () => {
      const api = { greet: (n: string) => `hello ${n}`, score: 0 };
      const handlers: Record<string, (...args: any[]) => any> = {};
      // Mimic the bindings the engine builds at runtime
      const bindings = "var greet = __api__['greet']; var score = __api__['score'];";
      const collect = "if (typeof Table_Init === 'function') __h__['Table_Init'] = Table_Init;";
      const jsCode = "function Table_Init() { __api__.score = greet('world').length; }";

      runSandboxed(jsCode, bindings, collect, api, handlers);

      // Handler harvested
      expect(typeof handlers.Table_Init).toBe('function');
      handlers.Table_Init!();
      expect(api.score).toBe('hello world'.length);
    });

    it('returns undefined for forbidden globals at runtime even if static scan misses', () => {
      // We bypass the static scan by running pre-validated code that *would*
      // touch a non-allowlisted global if the proxy weren't in place.
      const api: Record<string, unknown> = { result: undefined };
      const handlers: Record<string, (...args: any[]) => any> = {};
      const bindings = "var result = undefined;";
      const collect = "__api__.result = typeof someUnknownGlobal;";
      const jsCode = ""; // no forbidden tokens — just rely on bindings/collect
      runSandboxed(jsCode, bindings, collect, api, handlers);
      expect(api.result).toBe('undefined');
    });

    it('throws ScriptSandboxError for forbidden references before executing', () => {
      const api = {};
      const handlers: Record<string, (...args: any[]) => any> = {};
      expect(() =>
        runSandboxed('fetch("evil")', '', '', api, handlers),
      ).toThrow(ScriptSandboxError);
    });

    it('does not pollute the real globalThis', () => {
      const api = {};
      const handlers: Record<string, (...args: any[]) => any> = {};
      const bindings = '';
      const collect = '';
      const jsCode = 'somePolluterFlag = 12345;'; // bare assignment in `with(sandbox)` should land on sandbox, not globalThis
      runSandboxed(jsCode, bindings, collect, api, handlers);
      expect((globalThis as Record<string, unknown>).somePolluterFlag).toBeUndefined();
    });

    it('blocks the constructor-chain escape to the real global realm', () => {
      // A malicious table can reach the real Function constructor via `.constructor`
      // on any value — property access the `with` proxy cannot trap — and use it to
      // execute code in the global realm. The payload uses NO forbidden literal token
      // (`new Function`, `eval`, `fetch`, `window`); without `.constructor` blocking the
      // static scan passes and the sandbox is escaped.
      // Assembled from fragments so this test's own source doesn't trip static
      // "new Function" scanners — the runtime string is the real escape payload.
      // `process` exists in the real (node) realm but is neither allowlisted nor
      // forbidden, so reading it proves the script reached the global realm rather
      // than the sandbox (which would yield 'undefined'). Crucially the payload
      // contains NO currently-forbidden token, so only `.constructor` blocking stops it.
      const ctor = 'con' + 'structor';
      const api: Record<string, unknown> = { leaked: undefined };
      const handlers: Record<string, (...args: any[]) => any> = {};
      const jsCode = `__api__.leaked = (function(){})['${ctor}']('return typeof process')();`;
      expect(() => runSandboxed(jsCode, '', '', api, handlers)).toThrow(ScriptSandboxError);
      // Defense-in-depth: the escape body must never have executed.
      expect(api.leaked).toBeUndefined();
    });

    it('exposes Math/Date/JSON inside the script', () => {
      const api: Record<string, unknown> = {};
      const handlers: Record<string, (...args: any[]) => any> = {};
      const bindings = '';
      const collect = '__api__.pi = Math.PI; __api__.serialized = JSON.stringify({a: 1});';
      runSandboxed('', bindings, collect, api, handlers);
      expect(api.pi).toBe(Math.PI);
      expect(api.serialized).toBe('{"a":1}');
    });
  });
});

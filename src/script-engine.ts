/**
 * script-engine.ts — VBScript → JavaScript Transpiler + FP Script API
 */
import { state, fptResources, setFpScriptHandlers, bumpers, targets, cb } from './game';
import { getAudioCtx, playSound, playFPTMusic, startBGMusic, stopBGMusic } from './audio-system';
import { dmdEvent } from './dmd';
import { getBamBridge } from './bam-bridge';
import { runSandboxed, ScriptSandboxError } from './utils/script-sandbox';

// ─── VBScript → JS Transpiler ─────────────────────────────────────────────────

// Phase 1.1: Line continuation preprocessing
function preprocessLineContinuation(src: string): string {
  // Join lines ending with _ (VB line continuation)
  return src.replace(/\s*_\s*\r?\n\s*/g, ' ');
}

// Phase 1.3: Extract parenthesis-matched content for nested functions
function extractParenContent(s: string, start: number): [string, number] {
  let depth = 1, i = start + 1;
  while (i < s.length && depth > 0) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    i++;
  }
  return [s.slice(start + 1, i - 1), i];
}

// Phase 1.4: String-safe pattern replacement
function replaceOutsideStrings(text: string, pattern: string, replacement: string): string {
  const parts = text.split(/(["'])/);
  let inString = false, delimiter = '';
  let result = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if ((part === '"' || part === "'") && (i === 0 || parts[i-1] !== '\\')) {
      if (!inString) { inString = true; delimiter = part; }
      else if (part === delimiter) inString = false;
      result += part;
    } else if (inString) {
      result += part;
    } else {
      result += part.replace(new RegExp(pattern, 'g'), replacement);
    }
  }
  return result;
}

function _vbsXpr(e: string): string {
  let result = e;

  // String-safe replacement for & (concatenation operator)
  result = replaceOutsideStrings(result, '\\s*&\\s*', ' + ');

  return result
    .replace(/\bTrue\b/gi, 'true')
    .replace(/\bFalse\b/gi, 'false')
    .replace(/\bNothing\b/gi, 'null')
    .replace(/\bNull\b/gi, 'null')
    .replace(/\bNot\s+/gi, '!')
    .replace(/\s+And\s+/gi, ' && ')
    .replace(/\s+Or\s+/gi, ' || ')
    .replace(/\s+Mod\s+/gi, ' % ')
    .replace(/<>/g, '!==')
    .replace(/(?<![<>!])=(?!=)/g, '===')
    // String functions with improved nested paren handling
    .replace(/\bLen\(([^)]*)\)/gi, (m, arg) => `(${_vbsXpr(arg)}).length`)
    .replace(/\bUCase\(([^)]*)\)/gi, (m, arg) => `(${_vbsXpr(arg)}).toUpperCase()`)
    .replace(/\bLCase\(([^)]*)\)/gi, (m, arg) => `(${_vbsXpr(arg)}).toLowerCase()`)
    .replace(/\bTrim\(([^)]*)\)/gi, (m, arg) => `(${_vbsXpr(arg)}).trim()`)
    .replace(/\bInt\(([^)]*)\)/gi, (m, arg) => `Math.floor(${_vbsXpr(arg)})`)
    .replace(/\bFix\(([^)]*)\)/gi, (m, arg) => `Math.trunc(${_vbsXpr(arg)})`)
    .replace(/\bCInt\(([^)]*)\)/gi, (m, arg) => `parseInt(${_vbsXpr(arg)})`)
    .replace(/\bCDbl\(([^)]*)\)/gi, (m, arg) => `parseFloat(${_vbsXpr(arg)})`)
    .replace(/\bCStr\(([^)]*)\)/gi, (m, arg) => `String(${_vbsXpr(arg)})`)
    .replace(/\bRnd\b/gi, 'Math.random()')
    .replace(/\bAbs\(([^)]*)\)/gi, (m, arg) => `Math.abs(${_vbsXpr(arg)})`)
    .replace(/\bSgn\(([^)]*)\)/gi, (m, arg) => `Math.sign(${_vbsXpr(arg)})`)
    .replace(/\bSqr\(([^)]*)\)/gi, (m, arg) => `Math.sqrt(${_vbsXpr(arg)})`)
    .replace(/\bChr\((\d+)\)/gi, 'String.fromCharCode($1)')

    // ─── Phase 8: Extended String Functions ───────────────────────────────────────
    // InStr(haystack, needle, [start]) - Find substring position (1-based, 0 if not found)
    .replace(/\bInStr\(([^,]+),([^,)]+)(?:,\s*([^)]+))?\)/gi, (m, haystack, needle, start) => {
      const h = `String(${_vbsXpr(haystack)})`;
      const n = `String(${_vbsXpr(needle)})`;
      const s = start ? `Math.max(0, ${_vbsXpr(start)} - 1)` : '0';
      return `(${h}.indexOf(${n}, ${s}) + 1)`;
    })

    // InStrRev(haystack, needle, [start]) - Find from right
    .replace(/\bInStrRev\(([^,]+),([^,)]+)(?:,\s*([^)]+))?\)/gi, (m, haystack, needle, start) => {
      const h = `String(${_vbsXpr(haystack)})`;
      const n = `String(${_vbsXpr(needle)})`;
      const s = start ? `Math.max(0, ${_vbsXpr(start)} - 1)` : 'undefined';
      return `(${h}.lastIndexOf(${n}, ${s}) + 1)`;
    })

    // Left(str, n) - First n characters
    .replace(/\bLeft\(([^,]+),\s*([^)]+)\)/gi, (m, str, n) => {
      return `String(${_vbsXpr(str)}).substring(0, Math.max(0, ${_vbsXpr(n)}))`;
    })

    // Right(str, n) - Last n characters
    .replace(/\bRight\(([^,]+),\s*([^)]+)\)/gi, (m, str, n) => {
      const s = `String(${_vbsXpr(str)})`;
      const len = `Math.max(0, ${_vbsXpr(n)})`;
      return `${s}.substring(${s}.length - ${len})`;
    })

    // Replace(str, find, replace, [start], [count]) - Replace substring
    .replace(/\bReplace\(([^,]+),([^,]+),([^,)]+)(?:,[^,)]*)?(?:,[^)]+)?\)/gi, (m, str, find, replace) => {
      const s = `String(${_vbsXpr(str)})`;
      const f = `String(${_vbsXpr(find)})`;
      const r = `String(${_vbsXpr(replace)})`;
      return `${s}.split(${f}).join(${r})`;
    })

    // LTrim(str) - Remove leading whitespace
    .replace(/\bLTrim\(([^)]+)\)/gi, (m, str) => {
      return `String(${_vbsXpr(str)}).replace(/^\\s+/, '')`;
    })

    // RTrim(str) - Remove trailing whitespace
    .replace(/\bRTrim\(([^)]+)\)/gi, (m, str) => {
      return `String(${_vbsXpr(str)}).replace(/\\s+$/, '')`;
    })

    // Space(n) - Repeat space n times
    .replace(/\bSpace\(([^)]+)\)/gi, (m, n) => {
      return `' '.repeat(Math.max(0, ${_vbsXpr(n)}))`;
    })

    // Asc(char) - Character code (opposite of Chr)
    .replace(/\bAsc\(([^)]+)\)/gi, (m, char) => {
      return `String(${_vbsXpr(char)})[0].charCodeAt(0) || 0`;
    })

    // ─── Phase 8: Math Functions (Extended) ────────────────────────────────────────
    // Sin, Cos, Tan, Atn, Log, Exp, Pow
    .replace(/\bSin\(([^)]+)\)/gi, (m, x) => `Math.sin(${_vbsXpr(x)})`)
    .replace(/\bCos\(([^)]+)\)/gi, (m, x) => `Math.cos(${_vbsXpr(x)})`)
    .replace(/\bTan\(([^)]+)\)/gi, (m, x) => `Math.tan(${_vbsXpr(x)})`)
    .replace(/\bAtn\(([^)]+)\)/gi, (m, x) => `Math.atan(${_vbsXpr(x)})`)
    .replace(/\bLog\(([^)]+)\)/gi, (m, x) => `Math.log(${_vbsXpr(x)})`)
    .replace(/\bExp\(([^)]+)\)/gi, (m, x) => `Math.exp(${_vbsXpr(x)})`)
    .replace(/\bPow\(([^,]+),\s*([^)]+)\)/gi, (m, base, exp) => `Math.pow(${_vbsXpr(base)}, ${_vbsXpr(exp)})`)

    // ─── Type Checking Functions ────────────────────────────────────────────────────
    .replace(/\bIsNull\(([^)]+)\)/gi, (m, x) => `(${_vbsXpr(x)} === null || ${_vbsXpr(x)} === undefined)`)
    .replace(/\bIsEmpty\(([^)]+)\)/gi, (m, x) => `(${_vbsXpr(x)} === null || ${_vbsXpr(x)} === undefined || ${_vbsXpr(x)} === '')`)
    .replace(/\bIsNumeric\(([^)]+)\)/gi, (m, x) => `(!isNaN(Number(${_vbsXpr(x)})))`)
    .replace(/\bIsArray\(([^)]+)\)/gi, (m, x) => `Array.isArray(${_vbsXpr(x)})`)
    .replace(/\bTypeName\(([^)]+)\)/gi, (m, x) => {
      const v = _vbsXpr(x);
      return `(Array.isArray(${v}) ? 'Array' : typeof ${v})`;
    });
}

function _vbsStmt(s: string, withContext?: string): string {
  const t = s.trim();

  // Handle With context: .Property becomes __with__.Property
  let target = t;
  if (withContext && t.startsWith('.')) {
    target = '__with__' + t;
  }

  const eqIdx = target.search(/(?<![<>!])=(?!=)/);
  if (eqIdx > 0 && /^[\w_.[\]()]+$/.test(target.slice(0, eqIdx).trim())) {
    return `${target.slice(0, eqIdx).trim()} = ${_vbsXpr(target.slice(eqIdx + 1).trim())}`;
  }
  const noParens = target.match(/^(\w+)\s+(?![=<>])(.+)$/);
  if (noParens && !target.includes('(')) {
    const args = noParens[2].split(',').map(a => _vbsXpr(a.trim())).join(', ');
    return `${noParens[1]}(${args})`;
  }
  return _vbsXpr(target);
}

export function vbsToJS(src: string): string {
  // Phase 1.1: Preprocess line continuation
  const preprocessed = preprocessLineContinuation(src);
  const lines = preprocessed.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let depth = 0;
  let withStack: string[] = [];  // Track With context for property access
  const pad = () => '  '.repeat(Math.max(0, depth));

  for (const rawLine of lines) {
    const t = rawLine.trim();
    if (!t) { out.push(''); continue; }
    if (t.startsWith("'") || /^rem\s/i.test(t)) {
      out.push(pad() + '// ' + t.replace(/^'|^rem\s+/i, '')); continue;
    }
    let code = t;
    const sqIdx = t.indexOf("'");
    if (sqIdx > 0 && (t.slice(0, sqIdx).match(/"/g) || []).length % 2 === 0)
      code = t.slice(0, sqIdx).trim();
    if (!code) continue;

    let m: RegExpMatchArray | null;

    if ((m = code.match(/^(?:(?:Private|Public)\s+)?Sub\s+(\w+)\s*\((.*?)\)/i)))     { out.push(pad() + `function ${m[1]}(${m[2]}) {`); depth++; continue; }
    if ((m = code.match(/^(?:(?:Private|Public)\s+)?Function\s+(\w+)\s*\((.*?)\)/i))) { out.push(pad() + `function ${m[1]}(${m[2]}) {`); depth++; continue; }
    if (/^End\s+(Sub|Function)$/i.test(code))  { depth = Math.max(0,depth-1); out.push(pad()+'}'); continue; }

    if ((m = code.match(/^If\s+(.*?)\s+Then$/i)))         { out.push(pad()+`if (${_vbsXpr(m[1])}) {`); depth++; continue; }
    if ((m = code.match(/^If\s+(.*?)\s+Then\s+(.+)$/i)))  { out.push(pad()+`if (${_vbsXpr(m[1])}) { ${_vbsStmt(m[2])}; }`); continue; }
    if ((m = code.match(/^ElseIf\s+(.*?)\s+Then$/i)))     { depth=Math.max(0,depth-1); out.push(pad()+`} else if (${_vbsXpr(m[1])}) {`); depth++; continue; }
    if (/^Else$/i.test(code))   { depth=Math.max(0,depth-1); out.push(pad()+'} else {'); depth++; continue; }
    if (/^End\s+If$/i.test(code)) { depth=Math.max(0,depth-1); out.push(pad()+'}'); continue; }

    // Phase 1.2: For...To...Next and For Each...In loops
    if ((m = code.match(/^For\s+(\w+)\s*=\s*(.+?)\s+To\s+(.+?)(?:\s+Step\s+(.+))?$/i))) {
      const v=m[1], a=_vbsXpr(m[2].trim()), b=_vbsXpr(m[3].trim()), st=m[4]?parseFloat(m[4]):1;
      const op=st<0?'>=':'<=', inc=st===1?`${v}++`:st===-1?`${v}--`:`${v}+=${st}`;
      out.push(pad()+`for (let ${v}=${a}; ${v}${op}${b}; ${inc}) {`); depth++; continue;
    }
    if ((m = code.match(/^For\s+Each\s+(\w+)\s+In\s+(.+)$/i))) {
      const v = m[1], arr = _vbsXpr(m[2].trim());
      out.push(pad() + `for (let ${v} of ${arr}) {`); depth++; continue;
    }
    if (/^Next(?:\s+\w+)?$/i.test(code)) { depth=Math.max(0,depth-1); out.push(pad()+'}'); continue; }

    // Phase 2.1: Do loop variants (Do, Do While, Do Until, post-test loops)
    if ((m = code.match(/^Do\s*$/i))) {
      out.push(pad() + `while(true) {`); depth++; continue;
    }
    if ((m = code.match(/^Do\s+While\s+(.*)/i)))  { out.push(pad()+`while (${_vbsXpr(m[1])}) {`); depth++; continue; }
    if ((m = code.match(/^Do\s+Until\s+(.*)/i)))  { out.push(pad()+`while (!(${_vbsXpr(m[1])})) {`); depth++; continue; }
    if ((m = code.match(/^Loop\s+While\s+(.*)/i))) {
      depth = Math.max(0, depth - 1);
      out.push(pad() + `} while(${_vbsXpr(m[1])})`); continue;
    }
    if ((m = code.match(/^Loop\s+Until\s+(.*)/i))) {
      depth = Math.max(0, depth - 1);
      out.push(pad() + `} while(!(${_vbsXpr(m[1])}))`); continue;
    }
    if (/^Loop$/i.test(code)) { depth=Math.max(0,depth-1); out.push(pad()+'}'); continue; }
    if (/^Exit\s+Do$/i.test(code)) { out.push(pad()+'break;'); continue; }

    if ((m = code.match(/^Select\s+Case\s+(.*)/i)))  { out.push(pad()+`switch (${_vbsXpr(m[1])}) {`); depth++; continue; }
    if (/^Case\s+Else$/i.test(code)) { out.push(pad()+'default:'); continue; }
    if ((m = code.match(/^Case\s+(.*)/i))) { out.push(pad()+m[1].split(',').map(v=>`case ${_vbsXpr(v.trim())}:`).join(' ')); continue; }
    if (/^End\s+Select$/i.test(code)) { depth=Math.max(0,depth-1); out.push(pad()+'}'); continue; }

    if ((m = code.match(/^Dim\s+(.*)/i))) {
      const vars = m[1].split(',').map(v=>v.trim().replace(/\s+As\s+\w+/i,'').replace(/\(.*?\)/,'').trim()).filter(Boolean);
      out.push(pad()+'let '+vars.join(', ')+';'); continue;
    }
    if ((m = code.match(/^Const\s+(\w+)\s*=\s*(.*)/i))) { out.push(pad()+`const ${m[1]} = ${_vbsXpr(m[2])};`); continue; }

    if (/^Exit\s+(Sub|Function)$/i.test(code)) { out.push(pad()+'return;'); continue; }
    if (/^Exit\s+For$/i.test(code))            { out.push(pad()+'break;');  continue; }

    if (/^On\s+Error\s+Resume\s+Next$/i.test(code)) {
      out.push(pad() + 'try {'); depth++; continue;
    }

    // Phase 3.1: With statement - properly track context
    if ((m = code.match(/^With\s+([\w.]+)\s*$/i))) {
      const objName = m[1];
      out.push(pad() + `let __with__ = ${_vbsXpr(objName)};`);
      out.push(pad() + '{');
      depth++;
      withStack.push(objName);
      continue;
    }
    if (/^End\s+With$/i.test(code)) {
      withStack.pop();
      depth = Math.max(0, depth - 1);
      out.push(pad() + '}');
      continue;
    }

    if ((m = code.match(/^Call\s+(.*)/i)))               { out.push(pad()+_vbsStmt(m[1], withStack[withStack.length-1])+';'); continue; }
    if ((m = code.match(/^Set\s+([\w.]+)\s*=\s*(.*)/i))) { out.push(pad()+`${m[1]} = ${_vbsXpr(m[2])};`); continue; }

    out.push(pad() + _vbsStmt(code, withStack[withStack.length-1]) + ';');
  }
  return out.join('\n');
}

// ─── Script Log ───────────────────────────────────────────────────────────────
export function fpScriptLog(msg: string, type = 'info'): void {
  const el = document.getElementById('script-log');
  if (!el) return;

  // Phase 4.2: Enhanced logging with timestamps
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fullMsg = `[${timeStr}] ${msg}`;

  const span = document.createElement('span');
  span.className = 'log-' + type;
  span.textContent = fullMsg;
  el.appendChild(span);
  el.appendChild(document.createElement('br'));
  el.scrollTop = el.scrollHeight;

  // Also log to browser console for debugging
  const logLevel = { ok: 'info', warn: 'warn', error: 'error', debug: 'debug' }[type] || 'log';
  (console as any)[logLevel](`[FPScript] ${fullMsg}`);
}

// ─── FP Script API ────────────────────────────────────────────────────────────
function buildFPScriptAPI() {
  const sounds = fptResources.sounds;
  const timers: Record<string, any> = {};

  const makeTimer = (name: string) => ({
    get Enabled() { return !!timers[name + '_id']; },
    set Enabled(v: boolean) {
      clearInterval(timers[name + '_id']); delete timers[name + '_id'];
      if (v) timers[name + '_id'] = setInterval(() => callScriptFn(name + '_Expired'), timers[name + '_ms'] || 1000);
    },
    get Interval() { return timers[name + '_ms'] || 1000; },
    set Interval(ms: number) { timers[name + '_ms'] = ms; },
  });

  return {
    AddScore:  (n: number) => { state.score += Math.floor(+n || 0); cb.updateHUD(); },
    AddBonus:  (n: number) => { state.score += Math.floor((+n || 0) * 0.5); cb.updateHUD(); },
    BIPScore:  (_t: any, n: number) => { state.score += Math.floor(+n || 0); cb.updateHUD(); },
    GetScore:  () => state.score,
    GetBall:   () => state.ballNum,
    get BallInPlay() { return state.ballNum; },

    PlaySound: (name: string, loop = 0, vol = 100) => {
      const key = Object.keys(sounds).find(k => k === name || k.toLowerCase().includes(String(name).toLowerCase()));
      const buf = key ? sounds[key] : null;
      if (buf) {
        const ctx = getAudioCtx();
        const src = ctx.createBufferSource(), gain = ctx.createGain();
        src.buffer = buf; src.loop = !!loop;
        gain.gain.value = Math.max(0, Math.min(1, (+vol || 100) / 100));
        src.connect(gain); gain.connect(ctx.destination); src.start();
      } else {
        playSound(/flip/i.test(name) ? 'flipper' : /drain/i.test(name) ? 'drain' : 'bumper');
      }
    },
    StopSound:  () => {},
    PlayMusic:  (name: string) => { const b = sounds[name] || fptResources.musicTrack; if (b) playFPTMusic(b); else startBGMusic(); },
    StopMusic:  () => stopBGMusic(),

    DMDText:     (text: string) => dmdEvent(String(text).slice(0, 22).toUpperCase()),
    LightOn:     (name: string) => fpScriptLog('Light ON: ' + name),
    LightOff:    (name: string) => fpScriptLog('Light OFF: ' + name),
    LightBlink:  (name: string) => fpScriptLog('Light BLINK: ' + name),
    SetLight:    (name: string, val: any) => fpScriptLog(`SetLight: ${name}=${val}`),
    FlasherOn:   (name: string) => { cb.showNotification('💡 ' + name); fpScriptLog('Flasher ON: ' + name); },
    FlasherOff:  (name: string) => fpScriptLog('Flasher OFF: ' + name),
    FlasherBlink:(name: string) => fpScriptLog('Flasher BLINK: ' + name),
    FireCoil:    (name: string) => fpScriptLog('FireCoil: ' + name),
    SolenoidOn:  (name: string) => fpScriptLog('Solenoid ON: ' + name),
    SolenoidOff: (name: string) => fpScriptLog('Solenoid OFF: ' + name),

    AddBalls:       (n: number) => { for (let i = 0; i < Math.max(0,(+n||1)-1); i++) cb.launchMultiBall(); },
    MultiballStart: (n: number) => { for (let i = 0; i < Math.max(0,(+n||2)-1); i++) cb.launchMultiBall(); },
    MsgBox: (msg: string) => { fpScriptLog(String(msg)); cb.showNotification(String(msg).slice(0,30)); },

    Int: Math.floor, Fix: Math.trunc, Abs: Math.abs, Sqr: Math.sqrt,
    Sin: Math.sin, Cos: Math.cos, Tan: Math.tan, Atn: Math.atan,
    Exp: Math.exp, Log: Math.log, Rnd: Math.random, Randomize: () => {},
    Chr: (n: number) => String.fromCharCode(n),
    Asc: (s: string) => (s || '').charCodeAt(0),
    Len: (s: string) => String(s || '').length,
    Left:  (s: string, n: number) => String(s||'').slice(0,n),
    Right: (s: string, n: number) => String(s||'').slice(-n),
    Mid:   (s: string, p: number, l?: number) => { const ss=String(s||''); return l!=null?ss.slice(p-1,p-1+l):ss.slice(p-1); },
    UCase: (s: string) => String(s||'').toUpperCase(),
    LCase: (s: string) => String(s||'').toLowerCase(),
    Trim:  (s: string) => String(s||'').trim(),
    LTrim: (s: string) => String(s||'').trimStart(),
    RTrim: (s: string) => String(s||'').trimEnd(),
    CInt: (n: any) => parseInt(n)||0, CDbl: (n: any) => parseFloat(n)||0,
    CStr: String, CBool: Boolean,
    InStr:   (s: string, sub: string) => { const i=String(s||'').indexOf(sub); return i<0?0:i+1; },
    Replace: (s: string, a: string, b: string) => String(s||'').replaceAll(a,b),
    Space:   (n: number) => ' '.repeat(+n||0),
    IsNothing: (x: any) => x==null, IsNull: (x: any) => x==null,
    IsEmpty:   (x: any) => x==null||x==='', IsNumeric: (x: any) => !isNaN(parseFloat(x)),

    // ─── Game State API (Phase 2.3) ───
    GetMultiplier: () => state.multiplier,
    GetBumperHits: () => state.bumperHits,
    IsTiltActive: () => state.tiltActive,
    GetBallPosition: () => ({ x: state.ballPos.x, y: state.ballPos.y }),
    GetBallVelocity: () => ({ x: state.ballVel.x, y: state.ballVel.y }),
    SetMultiplier: (m: number) => {
      state.multiplier = Math.max(1, Math.min(10, Math.floor(m)));
      cb.updateHUD();
    },

    // ─── String Functions (Phase 2.4) ───
    Split: (s: string, delim: string = ' ') => String(s).split(String(delim)),
    Join: (arr: any, delim: string = ' ') => (arr || []).join(String(delim)),
    InStrRev: (s: string, sub: string) => {
      const i = String(s).lastIndexOf(String(sub));
      return i < 0 ? 0 : i + 1;
    },
    StrReverse: (s: string) => String(s).split('').reverse().join(''),
    Concat: (...args: any[]) => args.map(String).join(''),
    Repeat: (s: string, n: number) => String(s).repeat(Math.max(0, n)),

    // ─── Array Functions (Phase 2.5) ───
    IsArray: (x: any) => Array.isArray(x),
    Erase: (arr: any) => { if (Array.isArray(arr)) arr.length = 0; },
    LBound: (arr: any) => 0,  // JS arrays always 0-indexed
    UBound: (arr: any) => Array.isArray(arr) ? arr.length - 1 : 0,
    ArrayLength: (arr: any) => Array.isArray(arr) ? arr.length : 0,
    Push: (arr: any, val: any) => { if (Array.isArray(arr)) arr.push(val); },
    Pop: (arr: any) => Array.isArray(arr) ? arr.pop() : null,

    // ─── Game Object Stubs (Phase 3.2) ───
    Bumpers: new Proxy({}, {
      get: (_, idx) => {
        const i = parseInt(String(idx)) - 1;
        return {
          Index: i + 1,
          Enabled: true,
          Light: { Intensity: 0, Color: 0xffffff },
          Fire: () => fpScriptLog(`Bumper ${i + 1} fired`),
        };
      },
    }),

    Flippers: new Proxy({}, {
      get: (_, side) => ({
        Side: String(side),
        Enabled: true,
        Power: 50,
        Enable: function() { this.Enabled = true; },
        Disable: function() { this.Enabled = false; },
      }),
    }),

    Ramps: new Proxy({}, {
      get: (_, name) => ({
        Name: String(name),
        Enabled: true,
        IsActive: false,
        Fire: () => fpScriptLog(`Ramp ${String(name)} fired`),
      }),
    }),

    Lights: new Proxy({}, {
      get: (_, name) => ({
        Name: String(name),
        Enabled: false,
        Intensity: 0,
        TurnOn: () => fpScriptLog(`Light ${String(name)} ON`),
        TurnOff: () => fpScriptLog(`Light ${String(name)} OFF`),
      }),
    }),

    // ─── Extended Math & Type Functions (Phase 4.1) ───
    IIf: (cond: boolean, trueVal: any, falseVal: any) => cond ? trueVal : falseVal,
    Val: (s: any) => parseFloat(String(s)) || 0,
    Hex: (n: number) => (parseInt(String(n)) >>> 0).toString(16).toUpperCase(),
    Oct: (n: number) => (parseInt(String(n)) >>> 0).toString(8),

    // ─── Phase 8: Extended Date/Time Functions ───
    Now: () => new Date(),
    Date: () => new Date(),
    Time: () => new Date(),
    Year: (d?: Date) => new Date(d || Date.now()).getFullYear(),
    Month: (d?: Date) => new Date(d || Date.now()).getMonth() + 1,  // VB uses 1-12
    Day: (d?: Date) => new Date(d || Date.now()).getDate(),
    Hour: (d?: Date) => new Date(d || Date.now()).getHours(),
    Minute: (d?: Date) => new Date(d || Date.now()).getMinutes(),
    Second: (d?: Date) => new Date(d || Date.now()).getSeconds(),
    Weekday: (d?: Date, mode?: number) => {
      const day = new Date(d || Date.now()).getDay();
      return mode === 0 ? day : (day || 7);  // VB: 1-7 (Monday-Sunday) default
    },
    DateAdd: (interval: string, num: number, d?: Date) => {
      const date = new Date(d || Date.now());
      const intStr = String(interval).toLowerCase();
      if (intStr.startsWith('yyyy') || intStr === 'y') {
        date.setFullYear(date.getFullYear() + num);
      } else if (intStr.startsWith('m') && !intStr.startsWith('mi')) {
        date.setMonth(date.getMonth() + num);
      } else if (intStr.startsWith('d')) {
        date.setDate(date.getDate() + num);
      } else if (intStr.startsWith('h')) {
        date.setHours(date.getHours() + num);
      } else if (intStr.startsWith('mi')) {
        date.setMinutes(date.getMinutes() + num);
      } else if (intStr.startsWith('s')) {
        date.setSeconds(date.getSeconds() + num);
      }
      return date;
    },
    DateDiff: (interval: string, d1?: Date, d2?: Date) => {
      const date1 = new Date(d1 || Date.now());
      const date2 = new Date(d2 || Date.now());
      const diff = Math.abs(date2.getTime() - date1.getTime());
      const intStr = String(interval).toLowerCase();
      if (intStr.startsWith('d')) return Math.floor(diff / 86400000);
      if (intStr.startsWith('h')) return Math.floor(diff / 3600000);
      if (intStr.startsWith('mi')) return Math.floor(diff / 60000);
      if (intStr.startsWith('s')) return Math.floor(diff / 1000);
      return Math.floor(diff / 86400000);  // Default to days
    },
    DateSerial: (year: number, month: number, day: number) => {
      return new Date(year, (month || 1) - 1, day || 1);
    },
    TimeSerial: (hour: number, minute: number, second: number) => {
      const d = new Date();
      d.setHours(hour || 0, minute || 0, second || 0);
      return d;
    },
    FormatDate: (d: Date, format?: string) => {
      const date = new Date(d || Date.now());
      const fmt = String(format || 'MM/DD/YYYY').toUpperCase();
      const pad = (n: number) => String(n).padStart(2, '0');
      return fmt
        .replace('YYYY', String(date.getFullYear()))
        .replace('YY', String(date.getFullYear()).slice(-2))
        .replace('MM', pad(date.getMonth() + 1))
        .replace('DD', pad(date.getDate()))
        .replace('HH', pad(date.getHours()))
        .replace('MI', pad(date.getMinutes()))
        .replace('SS', pad(date.getSeconds()));
    },
    GetTickCount: () => Date.now(),

    // ─── Phase 8: Extended Array Functions ───
    Array: (...items: any[]) => items,
    Filter: (arr: any[], match: any) => {
      if (!Array.isArray(arr)) return [];
      return arr.filter(item => item === match || (typeof match === 'function' && match(item)));
    },
    Sort: (arr: any[]) => {
      if (!Array.isArray(arr)) return arr;
      return arr.sort((a, b) => {
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return String(a).localeCompare(String(b));
      });
    },
    Reverse: (arr: any[]) => {
      if (!Array.isArray(arr)) return arr;
      return arr.reverse();
    },
    Contains: (arr: any[], val: any) => Array.isArray(arr) && arr.includes(val),
    IndexOf: (arr: any[], val: any) => Array.isArray(arr) ? arr.indexOf(val) : -1,

    // ─── Phase 8: Extended Utility Functions ───
    IsString: (x: any) => typeof x === 'string',
    IsObject: (x: any) => x !== null && typeof x === 'object',
    IsBoolean: (x: any) => typeof x === 'boolean',
    TypeName: (x: any) => {
      if (x === null) return 'Null';
      if (x === undefined) return 'Empty';
      if (Array.isArray(x)) return 'Array';
      const t = typeof x;
      if (t === 'number') return Number.isInteger(x) ? 'Integer' : 'Double';
      return t.charAt(0).toUpperCase() + t.slice(1);  // String, Boolean, Object
    },

    // ─── Random Functions ───
    RandomInt: (min: number, max: number) => {
      const m = Math.floor(min || 0);
      const M = Math.floor(max || 100);
      return Math.floor(Math.random() * (M - m + 1)) + m;
    },
    RandomFloat: (min: number, max: number) => {
      return Math.random() * ((max || 100) - (min || 0)) + (min || 0);
    },
    RandomChoice: (arr: any[]) => {
      return Array.isArray(arr) && arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;
    },

    // ─── Constants ───
    Constants: {
      Pi: Math.PI,
      E: Math.E,
      VT_NULL: 0,
      VT_EMPTY: 0,
      VT_INTEGER: 3,
      VT_DOUBLE: 5,
      VT_STRING: 8,
      VT_ARRAY: 0x2000,
    },

    // ─── Phase 8 Task 4: Game Object Queries ───
    GetElement: (name: string) => {
      const nameStr = String(name).toLowerCase();

      // Search bumpers
      for (let i = 0; i < bumpers.length; i++) {
        if (bumpers[i].mesh?.userData?.name?.toLowerCase() === nameStr ||
            String(i).includes(nameStr)) {
          return {
            type: 'bumper',
            index: i,
            name: `Bumper${i}`,
            mesh: bumpers[i].mesh,
            x: bumpers[i].x,
            y: bumpers[i].y,
          };
        }
      }

      // Search targets
      for (let i = 0; i < targets.length; i++) {
        if (targets[i].mesh?.userData?.name?.toLowerCase() === nameStr ||
            String(i).includes(nameStr)) {
          return {
            type: 'target',
            index: i,
            name: `Target${i}`,
            mesh: targets[i].mesh,
            x: targets[i].x,
            y: targets[i].y,
          };
        }
      }

      return null;
    },

    GetElementPosition: (obj: any) => {
      if (!obj || !obj.mesh) return { x: 0, y: 0, z: 0 };
      return {
        x: obj.mesh.position?.x || obj.x || 0,
        y: obj.mesh.position?.y || obj.y || 0,
        z: obj.mesh.position?.z || 0,
      };
    },

    GetElementType: (obj: any) => {
      return obj?.type || 'unknown';
    },

    SetElementEnabled: (obj: any, enabled: boolean) => {
      if (obj && obj.mesh) {
        obj.mesh.visible = !!enabled;
        if (obj.mesh.userData) obj.mesh.userData.enabled = !!enabled;
      }
    },

    SetElementVisible: (obj: any, visible: boolean) => {
      if (obj && obj.mesh) {
        obj.mesh.visible = !!visible;
      }
    },

    SetElementColor: (obj: any, color: number) => {
      if (!obj || !obj.mesh) return;

      const colorNum = Math.floor(color);

      if (Array.isArray(obj.mesh.material)) {
        obj.mesh.material.forEach((mat: any) => {
          if (mat.color) mat.color.setHex(colorNum);
        });
      } else if (obj.mesh.material?.color) {
        obj.mesh.material.color.setHex(colorNum);
      }
    },

    TriggerElement: (obj: any) => {
      if (!obj) return;

      if (obj.type === 'bumper') {
        fpScriptLog(`Triggered Bumper ${obj.index}`);
        cb.notifyBumperHit({ x: obj.x, y: obj.y, mesh: obj.mesh, index: obj.index });
      } else if (obj.type === 'target') {
        fpScriptLog(`Triggered Target ${obj.index}`);
        cb.notifyTargetHit({ x: obj.x, y: obj.y, mesh: obj.mesh, index: obj.index });
      }
    },

    GetElementCount: (type?: string) => {
      const t = String(type || 'all').toLowerCase();
      if (t === 'bumper') return bumpers.length;
      if (t === 'target') return targets.length;
      return bumpers.length + targets.length;
    },

    GetElementName: (obj: any) => {
      return obj?.name || 'Unknown';
    },

    ListElements: (type?: string) => {
      const t = String(type || 'all').toLowerCase();
      const elements = [];

      if (t === 'bumper' || t === 'all') {
        bumpers.forEach((b, i) => {
          elements.push({ type: 'bumper', index: i, name: `Bumper${i}` });
        });
      }

      if (t === 'target' || t === 'all') {
        targets.forEach((tg, i) => {
          elements.push({ type: 'target', index: i, name: `Target${i}` });
        });
      }

      return elements;
    },

    GetProperty: (obj: any, propName: string) => {
      if (!obj) return null;
      const prop = String(propName).toLowerCase();
      if (prop === 'enabled') return obj.mesh?.userData?.enabled ?? true;
      if (prop === 'visible') return obj.mesh?.visible ?? true;
      if (prop === 'x') return obj.x ?? obj.mesh?.position?.x ?? 0;
      if (prop === 'y') return obj.y ?? obj.mesh?.position?.y ?? 0;
      if (prop === 'z') return obj.mesh?.position?.z ?? 0;
      if (prop === 'type') return obj.type ?? 'unknown';
      if (prop === 'name') return obj.name ?? '';
      return null;
    },

    SetProperty: (obj: any, propName: string, value: any) => {
      if (!obj) return;
      const prop = String(propName).toLowerCase();
      if (prop === 'enabled') {
        if (obj && obj.mesh) {
          obj.mesh.visible = !!value;
          if (obj.mesh.userData) obj.mesh.userData.enabled = !!value;
        }
      }
      if (prop === 'visible') {
        if (obj && obj.mesh) {
          obj.mesh.visible = !!value;
        }
      }
      if (prop === 'x' && obj.mesh) obj.mesh.position.x = Number(value);
      if (prop === 'y' && obj.mesh) obj.mesh.position.y = Number(value);
      if (prop === 'z' && obj.mesh) obj.mesh.position.z = Number(value);
    },

    HasProperty: (obj: any, propName: string) => {
      if (!obj) return false;
      const prop = String(propName).toLowerCase();
      return ['enabled', 'visible', 'x', 'y', 'z', 'type', 'name'].includes(prop);
    },

    GetProperties: (obj: any) => {
      if (!obj) return [];
      return ['enabled', 'visible', 'x', 'y', 'z', 'type', 'name'];
    },

    // ─── Phase 8 Task 5: Error Handling ───
    Err: {
      Number: 0,
      Description: '',
      Source: '',
      Raise: function(num: number, source?: string, desc?: string) {
        this.Number = num;
        this.Source = source || 'VBScript';
        this.Description = desc || `Error ${num}`;
        fpScriptLog(`Error ${num}: ${this.Description} (${this.Source})`, 'error');
      },
      Clear: function() {
        this.Number = 0;
        this.Description = '';
        this.Source = '';
      },
    },

    Debug: {
      Print: (msg: string) => {
        fpScriptLog(`[DEBUG] ${msg}`, 'debug');
      },
      Assert: (condition: boolean, msg?: string) => {
        if (!condition) {
          fpScriptLog(`[ASSERT] ${msg || 'Assertion failed'}`, 'error');
        }
      },
    },

    LogMessage: (msg: string, level?: string) => {
      const lvl = String(level || 'info').toLowerCase();
      fpScriptLog(String(msg), lvl === 'error' ? 'error' : lvl === 'warn' ? 'warn' : 'debug');
    },

    LogError: (msg: string) => {
      fpScriptLog(`[ERROR] ${msg}`, 'error');
    },

    LogWarning: (msg: string) => {
      fpScriptLog(`[WARNING] ${msg}`, 'warn');
    },

    // ─── Phase 8 Task 6: Additional Utilities ───
    // Encoding helpers
    URLEncode: (str: string) => encodeURIComponent(String(str)),
    URLDecode: (str: string) => decodeURIComponent(String(str)),
    Base64Encode: (str: string) => btoa(String(str)),
    Base64Decode: (str: string) => atob(String(str)),

    // Extended Math
    Ceil: (n: number) => Math.ceil(n),
    Round: (n: number, digits?: number) => {
      const d = Math.pow(10, digits || 0);
      return Math.round(n * d) / d;
    },
    Min: (...args: number[]) => Math.min(...args),
    Max: (...args: number[]) => Math.max(...args),

    // Timer helpers
    SetTimeout: (fn: Function, ms: number) => {
      if (typeof fn === 'function') {
        return setTimeout(() => fn(), ms);
      }
      return null;
    },

    SetInterval: (fn: Function, ms: number) => {
      if (typeof fn === 'function') {
        return setInterval(() => fn(), ms);
      }
      return null;
    },

    ClearTimeout: (id: any) => {
      if (typeof id === 'number') clearTimeout(id);
    },

    ClearInterval: (id: any) => {
      if (typeof id === 'number') clearInterval(id);
    },

    // Validation
    Validate: (value: any, type: string) => {
      const t = String(type).toLowerCase();
      if (t === 'number') return !isNaN(Number(value));
      if (t === 'string') return typeof value === 'string';
      if (t === 'boolean') return typeof value === 'boolean';
      if (t === 'array') return Array.isArray(value);
      if (t === 'object') return value !== null && typeof value === 'object';
      return false;
    },

    // ─── PHASE 12: Task 1 - Progressive Target System ───
    SetTargetMode: (mode: string, count?: number) => {
      const m = String(mode).toLowerCase();
      const validModes = ['3-of-5', 'all', 'multi-level', 'none'];
      if (validModes.includes(m)) {
        state.progressiveTargetMode = m as any;
        state.targetHitCounts.clear();
        state.progressiveTargets.clear();
        state.targetProgress = 0;
        fpScriptLog(`SetTargetMode: ${m}${count ? ` (${count} required)` : ''}`);
      } else {
        fpScriptLog(`SetTargetMode ERROR: Invalid mode ${m}`);
      }
    },

    GetTargetProgress: () => {
      const hitCount = state.targetHitCounts.size;
      const requiredCount = state.progressiveTargetMode === '3-of-5' ? 3 : 5;
      return {
        hit: hitCount,
        required: requiredCount,
        completed: state.targetProgress >= 1.0,
        progress: state.targetProgress,
        mode: state.progressiveTargetMode,
      };
    },

    ResetTargetMode: () => {
      state.progressiveTargetMode = 'none';
      state.targetHitCounts.clear();
      state.progressiveTargets.clear();
      state.targetProgress = 0;
      fpScriptLog('ResetTargetMode: Cleared');
    },

    GetTargetHitCount: (index: number) => {
      return state.targetHitCounts.get(Math.floor(index)) || 0;
    },

    SetTargetLights: (indices: any) => {
      const idx = Array.isArray(indices) ? indices : [indices];
      fpScriptLog(`SetTargetLights: [${idx.join(',')}]`);
      // Implementation would update visual highlights on specified targets
    },

    // ─── PHASE 12: Task 2 - Kickback & Ball Hold Mechanics ───
    FireKickback: (power?: number) => {
      if (!physics || !physics.ballBody || state.kickbacksRemaining <= 0) return;
      const p = Math.max(0, Math.min(10, Number(power) || 5));
      physics.ballBody.applyImpulse({ x: 0, y: p * 1.5 }, true);
      state.kickbacksRemaining--;
      state.kickbackActive = true;
      setTimeout(() => { state.kickbackActive = false; }, 500);
      fpScriptLog(`FireKickback: Power ${p}, remaining ${state.kickbacksRemaining}`);
      cb.showNotification(`🎯 KICKBACK! ${state.kickbacksRemaining} left`);
    },

    SetKickbacks: (count: number) => {
      state.kickbacksRemaining = Math.max(0, Math.floor(count));
      fpScriptLog(`SetKickbacks: ${state.kickbacksRemaining}`);
    },

    GetKickbacksRemaining: () => state.kickbacksRemaining,

    HoldBall: (time_ms?: number) => {
      const t = Math.max(100, Number(time_ms) || 3000);
      state.heldBalls.push(state.ballNum);
      state.ballHoldTime = Date.now() + t;
      fpScriptLog(`HoldBall: Held for ${t}ms`);
      cb.showNotification(`🧲 BALL HELD`);
    },

    ReleaseBalls: () => {
      if (state.heldBalls.length === 0) return;
      const count = state.heldBalls.length;
      state.heldBalls = [];
      state.ballHoldTime = 0;
      fpScriptLog(`ReleaseBalls: Released ${count} ball(s)`);
      cb.showNotification(`⚡ RELEASE!`);
    },

    GetHeldBallCount: () => state.heldBalls.length,

    SetMagnetLocation: (x: number, y: number) => {
      state.magnetLocationX = Number(x) || 0;
      state.magnetLocationY = Number(y) || 0;
      fpScriptLog(`SetMagnetLocation: (${state.magnetLocationX}, ${state.magnetLocationY})`);
    },

    // ─── PHASE 12: Task 3 - Advanced Combo System ───
    StartSkillShot: (targetId?: number, timeout?: number) => {
      state.skillShotActive = true;
      const t = Math.max(1000, Number(timeout) || 5000);
      state.skillShotTimeout = Date.now() + t;
      fpScriptLog(`StartSkillShot: Target ${targetId}, ${t}ms window`);
      cb.showNotification(`🎲 SKILL SHOT!`);
      cb.dmdEvent(`SKILL SHOT!`);
    },

    IsSkillShotActive: () => state.skillShotActive,

    CompleteSkillShot: (bonus?: number) => {
      if (!state.skillShotActive) return;
      const b = Math.max(0, Math.floor(bonus || 1000));
      state.score += b * state.multiplier;
      state.skillShotActive = false;
      cb.showNotification(`✨ SKILL SHOT BONUS! +${b * state.multiplier}`);
      fpScriptLog(`CompleteSkillShot: +${b * state.multiplier}`);
    },

    StartComboChain: (elements?: any[]) => {
      state.lastHitElement = 'none';
      state.lastHitTime = Date.now();
      fpScriptLog(`StartComboChain: Ready for sequence`);
      cb.dmdEvent(`COMBO READY!`);
    },

    AddComboMultiplier: (amount?: number) => {
      const a = Math.max(0, Number(amount) || 0.5);
      state.comboMultiplier = Math.min(10, state.comboMultiplier + a);
      fpScriptLog(`AddComboMultiplier: ${state.comboMultiplier.toFixed(1)}×`);
    },

    GetComboMultiplier: () => state.comboMultiplier,

    StartMode: (type: string, duration?: number) => {
      const d = Math.max(1000, Number(duration) || 30000);
      const mode = String(type).toLowerCase();
      state.activeModes.set(mode, { type: mode, progress: 0, timeout: Date.now() + d });
      cb.dmdEvent(`MODE: ${mode.toUpperCase()}`);
      fpScriptLog(`StartMode: ${mode} for ${d}ms`);
    },

    EndMode: (type: string) => {
      const mode = String(type).toLowerCase();
      state.activeModes.delete(mode);
      fpScriptLog(`EndMode: ${mode}`);
    },

    GetActiveModes: () => Array.from(state.activeModes.keys()),

    IsComboWindowActive: () => {
      const elapsed = Date.now() - state.lastHitTime;
      return elapsed < 3000; // 3-second window
    },

    // ─── PHASE 12: Task 5 - Ramp Sequencing & Combos ───
    SetRampSequence: (indices?: any, ordered?: boolean) => {
      const idx = Array.isArray(indices) ? indices : [indices];
      state.rampSequenceMode = ordered ? 'ordered' : 'any';
      fpScriptLog(`SetRampSequence: [${idx.join(',')}] ${ordered ? 'ordered' : 'any order'}`);
      cb.dmdEvent(`RAMP SEQ: ${idx.length}`);
    },

    GetRampProgress: () => {
      const hit = state.rampComboCounter;
      return { hit, required: 3, mode: state.rampSequenceMode };
    },

    GetRampComboMultiplier: () => state.rampComboMultiplier,

    LockRamp: (rampIndex: number, lockState?: string) => {
      const state_val = String(lockState || 'locked').toLowerCase();
      state.rampLockStates.set(Math.floor(rampIndex), state_val as any);
      fpScriptLog(`LockRamp: ${rampIndex} → ${state_val}`);
    },

    UnlockAllRamps: () => {
      state.rampLockStates.clear();
      fpScriptLog(`UnlockAllRamps: Cleared`);
    },

    GetRampLockState: (rampIndex: number) => {
      return state.rampLockStates.get(Math.floor(rampIndex)) || 'unlocked';
    },

    SetRampComboWindow: (seconds?: number) => {
      const s = Math.max(1, Math.floor(seconds || 5));
      fpScriptLog(`SetRampComboWindow: ${s} seconds`);
    },

    // ─── PHASE 12: Task 4 - Magnet Zones Physics ───
    SetMagnetZone: (x: number, y: number, radius?: number, holdTime?: number, power?: number) => {
      try {
        const { magnetSystem } = require('./mechanics/magnet-system');
        if (!magnetSystem) return '';
        const r = Math.max(0.1, Number(radius) || 1.0);
        const h = Math.max(100, Number(holdTime) || 3000);
        const p = Math.max(0, Math.min(10, Number(power) || 5));
        const zoneId = magnetSystem.createZone(Number(x), Number(y), r, h, p);
        fpScriptLog(`SetMagnetZone: Created zone ${zoneId} at (${x}, ${y}) radius ${r}m, hold ${h}ms, power ${p}`);
        return zoneId;
      } catch (e) {
        fpScriptLog(`SetMagnetZone ERROR: ${e}`);
        return '';
      }
    },

    RemoveMagnetZone: (zoneId: string) => {
      try {
        const { magnetSystem } = require('./mechanics/magnet-system');
        if (magnetSystem) {
          magnetSystem.removeZone(String(zoneId));
          fpScriptLog(`RemoveMagnetZone: Removed zone ${zoneId}`);
        }
      } catch (e) {
        fpScriptLog(`RemoveMagnetZone ERROR: ${e}`);
      }
    },

    HoldBallInZone: (ballIndex: number, zoneId: string, holdTime?: number) => {
      try {
        const { magnetSystem } = require('./mechanics/magnet-system');
        if (magnetSystem) {
          const held = magnetSystem.holdBallInZone(Math.floor(ballIndex), String(zoneId), holdTime);
          fpScriptLog(`HoldBallInZone: Ball ${ballIndex} in zone ${zoneId}, held=${held}`);
        }
      } catch (e) {
        fpScriptLog(`HoldBallInZone ERROR: ${e}`);
      }
    },

    ReleaseBallFromZone: (zoneId: string, directionX?: number, directionY?: number, power?: number) => {
      try {
        const { magnetSystem } = require('./mechanics/magnet-system');
        if (magnetSystem) {
          const count = magnetSystem.releaseBallsFromZone(String(zoneId), directionX, directionY, power);
          fpScriptLog(`ReleaseBallFromZone: Released ${count} ball(s) from zone ${zoneId}`);
          cb.showNotification(`⚡ MAGNET RELEASE!`);
        }
      } catch (e) {
        fpScriptLog(`ReleaseBallFromZone ERROR: ${e}`);
      }
    },

    GetHeldBalls: () => {
      try {
        const { magnetSystem } = require('./mechanics/magnet-system');
        if (magnetSystem) {
          return magnetSystem.getAllHeldBalls();
        }
      } catch (e) {
        fpScriptLog(`GetHeldBalls ERROR: ${e}`);
      }
      return [];
    },

    IsZoneActive: (zoneId: string) => {
      try {
        const { magnetSystem } = require('./mechanics/magnet-system');
        if (magnetSystem) {
          return magnetSystem.isZoneActive(String(zoneId));
        }
      } catch (e) {
        fpScriptLog(`IsZoneActive ERROR: ${e}`);
      }
      return false;
    },

    SetMagnetPower: (zoneId: string, power: number) => {
      try {
        const { magnetSystem } = require('./mechanics/magnet-system');
        if (magnetSystem) {
          magnetSystem.setZonePower(String(zoneId), power);
          fpScriptLog(`SetMagnetPower: Zone ${zoneId} power = ${power}`);
        }
      } catch (e) {
        fpScriptLog(`SetMagnetPower ERROR: ${e}`);
      }
    },

    // ─── PHASE 11: Task 5 - Persistent Configuration (localStorage) ───
    SaveSetting: (appName: string, section: string, key: string, value: any) => {
      const storageKey = `fp_web_${String(appName).toLowerCase()}_${String(section).toLowerCase()}_${String(key).toLowerCase()}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
        fpScriptLog(`SaveSetting: ${storageKey} = ${JSON.stringify(value)}`);
      } catch (e) {
        fpScriptLog(`SaveSetting ERROR: Storage quota exceeded or disabled`);
      }
    },

    GetSetting: (appName: string, section: string, key: string, defaultValue?: any) => {
      const storageKey = `fp_web_${String(appName).toLowerCase()}_${String(section).toLowerCase()}_${String(key).toLowerCase()}`;
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored !== null) {
          const parsed = JSON.parse(stored);
          fpScriptLog(`GetSetting: ${storageKey} = ${JSON.stringify(parsed)}`);
          return parsed;
        }
      } catch (e) {
        fpScriptLog(`GetSetting ERROR: Parse failed for ${storageKey}`);
      }
      const def = defaultValue !== undefined ? defaultValue : null;
      fpScriptLog(`GetSetting: ${storageKey} (default) = ${JSON.stringify(def)}`);
      return def;
    },

    DeleteSetting: (appName: string, section: string, key: string) => {
      const storageKey = `fp_web_${String(appName).toLowerCase()}_${String(section).toLowerCase()}_${String(key).toLowerCase()}`;
      try {
        localStorage.removeItem(storageKey);
        fpScriptLog(`DeleteSetting: ${storageKey}`);
      } catch (e) {
        fpScriptLog(`DeleteSetting ERROR: ${storageKey}`);
      }
    },

    ClearAppSettings: (appName: string) => {
      const prefix = `fp_web_${String(appName).toLowerCase()}`;
      try {
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) keysToDelete.push(key);
        }
        keysToDelete.forEach(k => localStorage.removeItem(k));
        fpScriptLog(`ClearAppSettings: Deleted ${keysToDelete.length} entries for ${appName}`);
      } catch (e) {
        fpScriptLog(`ClearAppSettings ERROR: ${appName}`);
      }
    },

    GetAllSettings: (appName: string, section?: string) => {
      const appPrefix = `fp_web_${String(appName).toLowerCase()}`;
      const sectionFilter = section ? `${appPrefix}_${String(section).toLowerCase()}` : appPrefix;
      const result: any[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(sectionFilter)) {
            try {
              const value = JSON.parse(localStorage.getItem(key) || 'null');
              const parts = key.replace(appPrefix + '_', '').split('_');
              if (parts.length >= 2) {
                const sec = parts[0];
                const k = parts.slice(1).join('_');
                result.push({ section: sec, key: k, value });
              }
            } catch { /* ignore parse errors */ }
          }
        }
      } catch (e) {
        fpScriptLog(`GetAllSettings ERROR: ${appName}`);
      }
      return result;
    },

    SettingsExists: (appName: string, section: string, key: string) => {
      const storageKey = `fp_web_${String(appName).toLowerCase()}_${String(section).toLowerCase()}_${String(key).toLowerCase()}`;
      return localStorage.getItem(storageKey) !== null;
    },

    // ─── PHASE 11: Task 3 - Type System Enhancement ───
    IsDate: (x: any) => x instanceof Date,

    IsError: (x: any) => x instanceof Error,

    CDate: (x: any) => {
      const d = new Date(x);
      if (isNaN(d.getTime())) throw new Error(`CDate: Invalid date ${JSON.stringify(x)}`);
      return d;
    },

    CVar: (x: any) => x,  // Variant type — in JS all values are typeless

    TypeOf: (x: any) => {
      if (x === null) return 'Null';
      if (x === undefined) return 'Undefined';
      if (x instanceof Date) return 'Date';
      if (Array.isArray(x)) return 'Array';
      if (x instanceof Error) return 'Error';
      const t = typeof x;
      if (t === 'number') return 'Number';
      if (t === 'string') return 'String';
      if (t === 'boolean') return 'Boolean';
      if (t === 'object') return 'Object';
      if (t === 'function') return 'Function';
      return 'Unknown';
    },

    VarType: (x: any) => {
      if (x === null || x === undefined) return 0;  // VT_NULL / VT_EMPTY
      if (typeof x === 'number') return Number.isInteger(x) ? 3 : 5;  // VT_INTEGER : VT_DOUBLE
      if (typeof x === 'string') return 8;  // VT_STRING
      if (Array.isArray(x)) return 0x2000;  // VT_ARRAY
      if (x instanceof Date) return 7;  // VT_DATE
      if (x instanceof Error) return 10;  // VT_ERROR (custom)
      if (typeof x === 'boolean') return 11;  // VT_BOOL
      if (typeof x === 'object') return 13;  // VT_UNKNOWN
      return 0;
    },

    // ─── PHASE 11: Task 2 - Advanced Array Functions ───
    ReDim: (arr: any, newSize: number) => {
      if (Array.isArray(arr)) {
        arr.length = Math.max(0, Math.floor(newSize || 0));
      }
      return arr;
    },

    ReDimPreserve: (arr: any, newSize: number) => {
      if (!Array.isArray(arr)) return arr;
      const newLen = Math.max(0, Math.floor(newSize || 0));
      const oldValues = [...arr];
      arr.length = newLen;
      oldValues.forEach((v, i) => { if (i < newLen) arr[i] = v; });
      return arr;
    },

    CreateDictionary: () => {
      return {};  // Plain JS object for key-value storage
    },

    GetDictValue: (dict: any, key: any, defaultValue?: any) => {
      if (dict === null || dict === undefined || typeof dict !== 'object') {
        return defaultValue !== undefined ? defaultValue : null;
      }
      const k = String(key);
      return (k in dict) ? dict[k] : (defaultValue !== undefined ? defaultValue : null);
    },

    SetDictValue: (dict: any, key: any, value: any) => {
      if (dict !== null && dict !== undefined && typeof dict === 'object') {
        dict[String(key)] = value;
      }
    },

    HasDictKey: (dict: any, key: any) => {
      if (dict === null || dict === undefined || typeof dict !== 'object') return false;
      return String(key) in dict;
    },

    GetDictKeys: (dict: any) => {
      if (dict === null || dict === undefined || typeof dict !== 'object') return [];
      return Object.keys(dict);
    },

    GetDictValues: (dict: any) => {
      if (dict === null || dict === undefined || typeof dict !== 'object') return [];
      return Object.values(dict);
    },

    // ─── PHASE 11: Task 4 - Number & String Formatting ───
    Format: (value: any, formatCode: string) => {
      const v = Number(value);
      const fmt = String(formatCode || '0');

      // Handle common format patterns
      if (fmt === '0.00' || fmt === '#.##') return v.toFixed(2);
      if (fmt === '0.0' || fmt === '#.#') return v.toFixed(1);
      if (fmt === '#,##0' || fmt === '#,##0.00') {
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: fmt.endsWith('.00') ? 2 : 0,
          maximumFractionDigits: fmt.endsWith('.00') ? 2 : 0,
        }).format(v);
      }
      if (fmt === '$#,##0.00') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(v);
      }
      // Fallback to string
      return String(v);
    },

    FormatNumber: (n: number, digits?: number, grouping?: boolean) => {
      const num = Number(n || 0);
      const d = Math.max(0, Math.floor(digits || 0));
      const useGrouping = grouping !== false;
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
        useGrouping: useGrouping,
      }).format(num);
    },

    FormatCurrency: (n: number, symbol?: string, digits?: number) => {
      const num = Number(n || 0);
      const sym = String(symbol || '$');
      const d = Math.max(0, Math.floor(digits || 2));

      if (sym === '$') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: d,
          maximumFractionDigits: d,
        }).format(num);
      }
      // Custom symbol
      const formatted = num.toFixed(d);
      return sym + formatted;
    },

    FormatPercent: (n: number, digits?: number) => {
      const num = Number(n || 0) * 100;
      const d = Math.max(0, Math.floor(digits || 2));
      return num.toFixed(d) + '%';
    },

    FormatBytes: (n: number) => {
      const bytes = Math.max(0, Math.floor(n || 0));
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let size = bytes;
      let unitIdx = 0;

      while (size >= 1024 && unitIdx < units.length - 1) {
        size /= 1024;
        unitIdx++;
      }

      return size.toFixed(unitIdx === 0 ? 0 : 1) + ' ' + units[unitIdx];
    },

    PadLeft: (s: string, len: number, char?: string) => {
      const str = String(s || '');
      const c = String(char || ' ').charAt(0);
      const l = Math.max(0, Math.floor(len || 0));
      return str.padStart(l, c);
    },

    PadRight: (s: string, len: number, char?: string) => {
      const str = String(s || '');
      const c = String(char || ' ').charAt(0);
      const l = Math.max(0, Math.floor(len || 0));
      return str.padEnd(l, c);
    },

    CenterText: (s: string, len: number, char?: string) => {
      const str = String(s || '');
      const c = String(char || ' ').charAt(0);
      const l = Math.max(0, Math.floor(len || 0));
      if (str.length >= l) return str;
      const pad = l - str.length;
      const left = Math.floor(pad / 2);
      const right = pad - left;
      return c.repeat(left) + str + c.repeat(right);
    },

    StrComp: (s1: string, s2: string, mode?: number) => {
      const a = String(s1 || '');
      const b = String(s2 || '');
      const m = Math.floor(mode || 0);

      if (m === 1) {
        // Text comparison (case-insensitive)
        const res = a.toLowerCase().localeCompare(b.toLowerCase());
        return res < 0 ? -1 : res > 0 ? 1 : 0;
      }
      // Binary comparison (case-sensitive, default)
      return a < b ? -1 : a > b ? 1 : 0;
    },

    StrConv: (s: string, conv: number) => {
      const str = String(s || '');
      const c = Math.floor(conv || 0);

      if (c === 1) return str.toUpperCase();  // VbUpperCase
      if (c === 2) return str.toLowerCase();  // VbLowerCase
      if (c === 4) {  // VbProperCase
        return str.replace(/\b\w/g, ch => ch.toUpperCase());
      }
      if (c === 16) {  // VbHiragana
        fpScriptLog('StrConv: Hiragana not implemented');
        return str;
      }
      if (c === 32) {  // VbKatakana
        fpScriptLog('StrConv: Katakana not implemented');
        return str;
      }
      return str;
    },

    IndexOfAny: (s: string, chars: string) => {
      const str = String(s || '');
      const charSet = String(chars || '');
      for (let i = 0; i < str.length; i++) {
        if (charSet.includes(str[i])) return i + 1;  // 1-indexed
      }
      return 0;  // Not found
    },

    LastIndexOfAny: (s: string, chars: string) => {
      const str = String(s || '');
      const charSet = String(chars || '');
      for (let i = str.length - 1; i >= 0; i--) {
        if (charSet.includes(str[i])) return i + 1;  // 1-indexed
      }
      return 0;  // Not found
    },

    // ─── PHASE 11: Task 1 - Physics Query Functions ───
    GetBallSpin: () => {
      if (!physics || !physics.ballBody) return { x: 0, y: 0, z: 0 };
      try {
        const angVel = physics.ballBody.angvel();
        return { x: angVel.x || 0, y: angVel.y || 0, z: angVel.z || 0 };
      } catch {
        return { x: 0, y: 0, z: 0 };
      }
    },

    GetBallAngularVelocity: () => {
      if (!physics || !physics.ballBody) return { x: 0, y: 0, z: 0 };
      try {
        const angVel = physics.ballBody.angvel();
        return { x: angVel.x || 0, y: angVel.y || 0, z: angVel.z || 0 };
      } catch {
        return { x: 0, y: 0, z: 0 };
      }
    },

    GetBallMass: () => {
      // Standard pinball mass: 0.0265 kg (~27g)
      return 0.0265;
    },

    GetBallRadius: () => {
      // Standard pinball radius: ~13.97mm = 0.01397m
      return 0.01397;
    },

    GetCollisionForce: () => {
      // Return cached collision force from last frame (physics engine would set this)
      return physics?.__lastCollisionForce || 0;
    },

    GetCollisionNormal: () => {
      // Return cached collision normal from last frame
      const normal = physics?.__lastCollisionNormal;
      return normal ? { x: normal.x, y: normal.y, z: normal.z } : { x: 0, y: 1, z: 0 };
    },

    GetCollisionPoint: () => {
      // Return cached collision point in world space
      const point = physics?.__lastCollisionPoint;
      return point ? { x: point.x, y: point.y, z: point.z } : { x: 0, y: 0, z: 0 };
    },

    GetElementVelocity: (obj: any) => {
      if (!obj) return { x: 0, y: 0, z: 0 };
      // Try to get velocity from physics body if element is dynamic
      if (obj.body && obj.body.linvel) {
        try {
          const vel = obj.body.linvel();
          return { x: vel.x || 0, y: vel.y || 0, z: vel.z || 0 };
        } catch { }
      }
      // Default to stationary
      return { x: 0, y: 0, z: 0 };
    },

    GetFlipperImpactVelocity: (side: string) => {
      if (!physics) return 0;
      const s = String(side || '').toLowerCase();
      try {
        if (s === 'left' && physics.lFlipperBody) {
          const vel = physics.lFlipperBody.linvel();
          return Math.sqrt((vel.x || 0) ** 2 + (vel.y || 0) ** 2);
        }
        if (s === 'right' && physics.rFlipperBody) {
          const vel = physics.rFlipperBody.linvel();
          return Math.sqrt((vel.x || 0) ** 2 + (vel.y || 0) ** 2);
        }
      } catch { }
      return 0;
    },

    GetBallTrajectory: (dt: number) => {
      if (!physics || !physics.ballBody) return { x: 0, y: 0, z: 0 };
      try {
        const pos = physics.ballBody.translation();
        const vel = physics.ballBody.linvel();
        const t = Math.max(0, Number(dt) || 0.1);
        return {
          x: (pos.x || 0) + (vel.x || 0) * t,
          y: (pos.y || 0) + (vel.y || 0) * t,
          z: (pos.z || 0) + (vel.z || 0) * t,
        };
      } catch {
        return { x: 0, y: 0, z: 0 };
      }
    },

    GetBallKineticEnergy: () => {
      if (!physics || !physics.ballBody) return 0;
      try {
        const vel = physics.ballBody.linvel();
        const v2 = (vel.x || 0) ** 2 + (vel.y || 0) ** 2 + (vel.z || 0) ** 2;
        const mass = 0.0265;  // kg
        return 0.5 * mass * v2;  // Joules
      } catch {
        return 0;
      }
    },

    GetBallPotentialEnergy: (ref_y?: number) => {
      if (!physics || !physics.ballBody) return 0;
      try {
        const pos = physics.ballBody.translation();
        const y = pos.y || 0;
        const refY = Number(ref_y) || 0;
        const mass = 0.0265;  // kg
        const g = 9.81;  // m/s²
        return mass * g * (y - refY);  // Joules (relative to ref_y)
      } catch {
        return 0;
      }
    },

    GetBallTotalEnergy: (ref_y?: number) => {
      if (!physics || !physics.ballBody) return 0;
      try {
        const vel = physics.ballBody.linvel();
        const pos = physics.ballBody.translation();
        const v2 = (vel.x || 0) ** 2 + (vel.y || 0) ** 2 + (vel.z || 0) ** 2;
        const mass = 0.0265;  // kg
        const g = 9.81;  // m/s²
        const y = pos.y || 0;
        const refY = Number(ref_y) || 0;

        const ke = 0.5 * mass * v2;
        const pe = mass * g * (y - refY);
        return ke + pe;  // Joules
      } catch {
        return 0;
      }
    },

    SetBallSpin: (x: number, y: number, z: number) => {
      if (!physics || !physics.ballBody) return;
      try {
        physics.ballBody.setAngvel({ x: Number(x) || 0, y: Number(y) || 0, z: Number(z) || 0 }, true);
        fpScriptLog(`SetBallSpin: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
      } catch (e) {
        fpScriptLog(`SetBallSpin ERROR: ${e}`);
      }
    },

    ApplyBallForce: (x: number, y: number, z: number, dt?: number) => {
      if (!physics || !physics.ballBody) return;
      try {
        const force = { x: Number(x) || 0, y: Number(y) || 0, z: Number(z) || 0 };
        const duration = Math.max(0.001, Number(dt) || 0.016);  // Minimum 1ms
        physics.ballBody.applyImpulse(
          { x: force.x * duration, y: force.y * duration, z: force.z * duration },
          true
        );
        fpScriptLog(`ApplyBallForce: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) for ${duration.toFixed(3)}s`);
      } catch (e) {
        fpScriptLog(`ApplyBallForce ERROR: ${e}`);
      }
    },

    // ─── B.A.M. (Better Arcade Mode) API (Session 20.2) ───
    xBAM: (() => {
      const bamAPI: any = {
        // Camera control
        setViewMode: (mode: string) => {
          const validModes = ['desktop', 'cabinet', 'vr'];
          if (validModes.includes(String(mode).toLowerCase())) {
            fpScriptLog(`BAM: View mode set to ${mode}`);
            callScriptFn('BAM_ViewModeChanged', mode);
          }
        },
        getViewMode: () => 'desktop',  // Default

        // Table mechanics (Phase 13: Real BAM Bridge integration)
        setTableTilt: (x: number = 0, y: number = 0, z: number = 0) => {
          const bridge = getBamBridge();
          if (bridge) {
            bridge.setTableTilt(x, y, z);
            fpScriptLog(`BAM: Table tilt (${x.toFixed(1)}°, ${y.toFixed(1)}°, ${z.toFixed(1)}°)`);
          }
        },
        getTableTilt: () => {
          const bridge = getBamBridge();
          return bridge ? bridge.getTableTilt() : { x: 0, y: 0, z: 0 };
        },

        getAccelerometerX: () => 0,
        getAccelerometerY: () => -9.81,  // Standard gravity
        getAccelerometerZ: () => 0,

        // Flipper power control (Phase 13: Real BAM Bridge integration)
        setFlipperPower: (side: string, power: number) => {
          const validSides = ['left', 'right'];
          const sideName = String(side).toLowerCase();
          if (validSides.includes(sideName)) {
            const bridge = getBamBridge();
            if (bridge) {
              bridge.setFlipperPower(sideName as 'left' | 'right', power);
              fpScriptLog(`BAM: ${sideName} flipper power ${power.toFixed(0)}%`);
            }
          }
        },
        getFlipperPower: (side: string) => {
          const bridge = getBamBridge();
          if (bridge) {
            return bridge.getFlipperPower(String(side).toLowerCase() as 'left' | 'right');
          }
          return 50;
        },

        // Animation sequencing (Phase 13: Real BAM Bridge integration)
        playAnimation: (seqId: number = 1) => {
          const bridge = getBamBridge();
          if (bridge) {
            bridge.playAnimation(seqId);
            fpScriptLog(`BAM: Playing animation sequence ${seqId}`);
          }
        },
        stopAnimation: () => {
          const bridge = getBamBridge();
          if (bridge) {
            bridge.stopAnimation();
            fpScriptLog('BAM: Animation stopped');
          }
        },
        isAnimationPlaying: () => {
          const bridge = getBamBridge();
          return bridge ? bridge.isAnimationPlaying() : false;
        },

        // Lighting (Phase 13: Real BAM Bridge integration)
        Light: {
          setIntensity: (intensity: number) => {
            const bridge = getBamBridge();
            if (bridge) {
              bridge.setLightIntensity(intensity);
              fpScriptLog(`BAM.Light: Intensity ${intensity.toFixed(1)}`);
            }
          },
          getIntensity: () => {
            const bridge = getBamBridge();
            return bridge ? bridge.getLightIntensity() : 2.0;
          },
          pulse: (duration: number, peakIntensity: number = 3.0) => {
            const bridge = getBamBridge();
            if (bridge) {
              bridge.pulseLight(duration, peakIntensity);
              fpScriptLog(`BAM.Light: Pulse ${duration}ms at ${peakIntensity.toFixed(1)}`);
            }
          },
          flash: (count: number, duration: number = 100, interval: number = 200) => {
            const bridge = getBamBridge();
            if (bridge) {
              bridge.flashLight(count, duration, interval);
              fpScriptLog(`BAM.Light: Flash ${count}x ${duration}ms every ${interval}ms`);
            }
          },
        },

        // Effects
        startTableShake: (duration: number = 100, intensity: number = 1.0) => {
          const dur = Math.max(0, Math.floor(duration));
          const inten = Math.max(0, Math.min(10, intensity));
          fpScriptLog(`BAM: Table shake ${dur}ms intensity ${inten.toFixed(1)}`);
          callScriptFn('BAM_TableShake', dur, inten);
        },
        startTableTwist: (duration: number = 100, degrees: number = 45) => {
          const dur = Math.max(0, Math.floor(duration));
          const deg = Math.max(-180, Math.min(180, degrees));
          fpScriptLog(`BAM: Table twist ${dur}ms ${deg}°`);
          callScriptFn('BAM_TableTwist', dur, deg);
        },

        // Configuration (Phase 13: Real BAM Bridge integration)
        saveSettings: (section: string, key: string, value: any) => {
          const bridge = getBamBridge();
          if (bridge) {
            const configKey = `${String(section).toLowerCase()}_${String(key).toLowerCase()}`;
            bridge.saveConfig(configKey, value);
            fpScriptLog(`BAM: Save ${section}.${key} = ${value}`);
          }
        },
        loadSettings: (section: string, key: string, defaultValue?: any) => {
          const bridge = getBamBridge();
          if (bridge) {
            const configKey = `${String(section).toLowerCase()}_${String(key).toLowerCase()}`;
            return bridge.loadConfig(configKey, defaultValue);
          }
          return defaultValue;
        },
        loadSettingsOld: (section: string, key: string) => {
          const storageKey = `fp_web_bam_${String(section).toLowerCase()}_${String(key).toLowerCase()}`;
          try {
            const stored = localStorage.getItem(storageKey);
            if (stored !== null) {
              const parsed = JSON.parse(stored);
              fpScriptLog(`BAM: Load ${String(section)}.${String(key)} = ${JSON.stringify(parsed)}`);
              return parsed;
            }
          } catch (e) {
            fpScriptLog(`BAM: Load ERROR for ${section}.${key}`);
          }
          fpScriptLog(`BAM: Load ${String(section)}.${String(key)} (not found)`);
          return null;
        },

        // Sub-objects for structured access
        Config: {
          set: (key: string, value: any) => fpScriptLog(`BAM.Config.${key} = ${value}`),
          get: (key: string) => null,
        },

        Animation: {
          PlaySequence: (id: number) => bamAPI.playAnimation(id),
          Stop: () => bamAPI.stopAnimation(),
          IsPlaying: () => false,
        },

        Camera: {
          setMode: (mode: number) => {  // 0=Desktop, 1=Cabinet, 2=VR
            const modeNames = ['desktop', 'cabinet', 'vr'];
            if (mode >= 0 && mode <= 2) {
              fpScriptLog(`BAM.Camera: Mode ${modeNames[mode]}`);
              callScriptFn('BAM_CameraMode', mode);
            }
          },
          getMode: () => 0,
        },

        Table: {
          Tilt: { X: 0, Y: 0, Z: 0 },
          Translation: { X: 0, Y: 0, Z: 0 },
          Scale: { X: 1, Y: 1, Z: 1 },
          Rotation: { X: 0, Y: 0, Z: 0 },
        },
      };

      return bamAPI;
    })(),

    _makeTimer: makeTimer,
  };
}

function _collectTimers(api: any, jsCode: string): void {
  const re = /\b(\w+Timer\w*)\b/gi;
  const names = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(jsCode)) !== null) names.add(m[1]);
  for (const name of names) { if (!(name in api)) api[name] = api._makeTimer(name); }
}

// ─── Script Runner ────────────────────────────────────────────────────────────
export function runFPScript(vbsCode: string): void {
  const handlers: Record<string, Function> = {};

  // Phase 4.2: Debug hooks
  const lineCount = vbsCode.split('\n').length;
  fpScriptLog(`Starting script (${lineCount} lines)`, 'debug');

  let jsCode: string;
  try { jsCode = vbsToJS(vbsCode); }
  catch(e: any) { fpScriptLog('Transpile-Fehler: ' + e.message, 'error'); return; }

  const api = buildFPScriptAPI();
  _collectTimers(api, jsCode);

  const fnNames: string[] = [];
  const fnRe = /^function\s+(\w+)\s*\(/mg;
  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(jsCode)) !== null) fnNames.push(m[1]);

  const bindings  = Object.keys(api).map(k => `var ${k} = __api__['${k}'];`).join('\n');
  const collect   = fnNames.map(n => `if (typeof ${n} === 'function') __h__['${n}'] = ${n};`).join('\n');

  try {
    runSandboxed(jsCode, bindings, collect, api, handlers);
  } catch(e: any) {
    if (e instanceof ScriptSandboxError) {
      fpScriptLog('Script blocked by sandbox: ' + e.message, 'error');
    } else {
      fpScriptLog('Script-Fehler: ' + e.message, 'error');
    }
  }

  setFpScriptHandlers(handlers);
  const count = Object.keys(handlers).length;
  fpScriptLog(`${count} Handler: ${Object.keys(handlers).slice(0,5).join(', ')}${count>5?'...':''}`, count>0?'ok':'warn');

  const rawEl  = document.getElementById('script-raw') as HTMLTextAreaElement;
  const jsEl   = document.getElementById('script-js')  as HTMLTextAreaElement;
  const statEl = document.getElementById('script-status');
  if (rawEl)  rawEl.value  = vbsCode;
  if (jsEl)   jsEl.value   = jsCode;
  if (statEl) {
    statEl.textContent = `${count} Handler aktiv | ${vbsCode.split('\n').length} Zeilen VBScript`;
    (statEl as HTMLElement).style.color = count > 0 ? '#00cc66' : '#ffaa00';
  }

  callScriptFn('Table1_Init') || callScriptFn('Init') || callScriptFn('Initialize');
}

// ─── Event Dispatch ───────────────────────────────────────────────────────────
import { fpScriptHandlers } from './game';

export function callScriptFn(name: string, ...args: any[]): boolean {
  try {
    const fn = fpScriptHandlers[name];
    if (typeof fn === 'function') { fn(...args); return true; }
  } catch(e: any) { fpScriptLog(`${name} Fehler: ${e.message}`, 'warn'); }
  return false;
}

export const callScriptBumper    = (i: number) => callScriptFn('Bumper' + (i+1) + '_Hit');
export const callScriptTarget    = (i: number) => callScriptFn('Target' + (i+1) + '_Hit') || callScriptFn('StandupTarget' + (i+1) + '_Hit');
export const callScriptSlingshot = (side: string) => { const n = side==='left'?'LeftSlingshot':'RightSlingshot'; callScriptFn(n+'_Hit') || callScriptFn(n+'_Slingshot'); };
export const callScriptDrain     = () => callScriptFn('BallDrain') || callScriptFn('Table1_BallDrained') || callScriptFn('Table_BallDrain');
export const callScriptFlipper   = (side: string, isDown: boolean) => callScriptFn((side==='left'?'LeftFlipper':'RightFlipper') + (isDown?'_Enabled':'_Disabled'));

// ─── B.A.M. Event Dispatch (Session 20.2) ───
export function callScriptBAMEvent(eventName: string, ...args: any[]): boolean {
  return callScriptFn('BAM_' + String(eventName), ...args);
}

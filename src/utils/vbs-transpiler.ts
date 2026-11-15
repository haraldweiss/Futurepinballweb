// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * vbs-transpiler.ts — VBScript → JavaScript Transpiler
 *
 * Pure functions for transpiling VBScript expressions and statements
 * to JavaScript. Extracted from script-engine.ts for modularity.
 *
 * All functions are side-effect-free — they take a string and return a string.
 */

// ─── Line Continuation Preprocessing ───────────────────────────────────────────

export function preprocessLineContinuation(src: string): string {
  // Join lines ending with _ (VB line continuation)
  return src.replace(/\s*_\s*\r?\n\s*/g, ' ');
}

// ─── String-safe Pattern Replacement ───────────────────────────────────────────

function replaceOutsideStrings(text: string, pattern: string, replacement: string): string {
  const parts = text.split(/(["'])/);
  let inString = false, delimiter = '';
  let result = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if ((part === '"' || part === "'") && (i === 0 || !parts[i-1].endsWith('\\'))) {
      if (!inString) { inString = true; delimiter = part; }
      else if (part === delimiter) inString = false;
      result += part;
    } else if (inString) {
      result += part;
    } else {
      // eslint-disable-next-line security/detect-non-literal-regexp -- pattern arg is a literal VBS-token regex hardcoded by callers
      result += part.replace(new RegExp(pattern, 'g'), replacement);
    }
  }
  return result;
}

// ─── VBScript Expression Parser ────────────────────────────────────────────────


function escapeVbsStrings(text: string): string {
  let out = '', i = 0;
  while (i < text.length) {
    if (text[i] !== '"') { out += text[i++]; continue; }
    out += '"'; i++;
    while (i < text.length) {
      if (text[i] === '"' && text[i + 1] === '"') { out += '\\"'; i += 2; continue; }
      if (text[i] === '"') { out += '"'; i++; break; }
      out += text[i] === '\\' ? '\\\\' : text[i];
      i++;
    }
  }
  return out;
}


function _replaceSimpleCalls(text: string, handlers: Record<string, (arg: string) => string>): string {
  let out = '', i = 0;
  while (i < text.length) {
    const match = /^[A-Za-z_]\w*/.exec(text.slice(i));
    if (!match) { out += text[i++]; continue; }
    const name = match[0];
    const open = i + name.length;
    if (text[open] === '(' && handlers[name.toLowerCase()] && (i === 0 || text[i - 1] !== '.')) {
      let depth = 0, close = -1, quote = '';
      for (let j = open; j < text.length; j++) {
        const ch = text[j];
        if (quote) { if (ch === quote) quote = ''; continue; }
        if (ch === '"' || ch === "'") { quote = ch; continue; }
        if (ch === '(') depth++;
        else if (ch === ')' && --depth === 0) { close = j; break; }
      }
      if (close > 0) {
        out += handlers[name.toLowerCase()](text.slice(open + 1, close));
        i = close + 1;
        continue;
      }
    }
    out += name;
    i = open;
  }
  return out;
}

// Lowercase alias -> declared casing. VBScript names are case-insensitive, so
// rewriting to the declared spelling keeps references bound to the same array.
let _vbsArrayNames = new Map<string, string>();
function _replaceArrayAccess(text: string): string {
  // Mask literals without changing offsets, so indexes can contain strings or
  // nested calls while literal array-like text remains untouched.
  const masked = text.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, value => ' '.repeat(value.length));
  let result = '', cursor = 0;
  for (const match of masked.matchAll(/(?<![\w.])([A-Za-z_]\w*)\s*\(/g)) {
    const declared = _vbsArrayNames.get(match[1].toLowerCase());
    if (match.index < cursor || !declared) continue;
    if (masked.slice(0, match.index).trimEnd().endsWith('.')) continue;
    const open = match.index + match[0].length - 1;
    let depth = 1, close = open + 1;
    for (; close < masked.length; close++) {
      if (masked[close] === '(') depth++;
      else if (masked[close] === ')' && --depth === 0) break;
    }
    if (depth !== 0) continue;
    result += text.slice(cursor, match.index) + `${declared}[${_replaceArrayAccess(text.slice(open + 1, close))}]`;
    cursor = close + 1;
  }
  return result + text.slice(cursor);
}

function _vbsXpr(e: string): string {
  let result = _replaceSimpleCalls(_replaceArrayAccess(e), {
    len: arg => `(${_vbsXpr(arg)}).length`,
    ucase: arg => `(${_vbsXpr(arg)}).toUpperCase()`,
    lcase: arg => `(${_vbsXpr(arg)}).toLowerCase()`,
    trim: arg => `(${_vbsXpr(arg)}).trim()`,
    int: arg => `Math.floor(${_vbsXpr(arg)})`,
    fix: arg => `Math.trunc(${_vbsXpr(arg)})`,
    cint: arg => `parseInt(${_vbsXpr(arg)})`,
    cdbl: arg => `parseFloat(${_vbsXpr(arg)})`,
    cstr: arg => `String(${_vbsXpr(arg)})`,
    abs: arg => `Math.abs(${_vbsXpr(arg)})`,
    sgn: arg => `Math.sign(${_vbsXpr(arg)})`,
    sqr: arg => `Math.sqrt(${_vbsXpr(arg)})`,
    isnull: arg => `(${_vbsXpr(arg)} === null || ${_vbsXpr(arg)} === undefined)`,
    isempty: arg => `(${_vbsXpr(arg)} === null || ${_vbsXpr(arg)} === undefined || ${_vbsXpr(arg)} === '')`,
  });

  // String-safe replacement for & (concatenation operator)
  result = replaceOutsideStrings(result, '\\s*&\\s*', ' + ');
  result = replaceOutsideStrings(result, ',\\s*(?=[,)])', ', undefined');

  return result
    .replace(/\bTrue\b/gi, 'true')
    .replace(/\bFalse\b/gi, 'false')
    .replace(/\bNothing\b/gi, 'null')
    .replace(/\bNull\b/gi, 'null')
    .replace(/\bNot\s+/gi, '!')
    .replace(/\s+And\s+/gi, ' && ')
    .replace(/\s+Or\s+/gi, ' || ')
    .replace(/\s+Is\s+/gi, ' === ')
    .replace(/\s+Mod\s+/gi, ' % ')
    .replace(/=<\s*/g, '<= ').replace(/=>\s*/g, '>= ').replace(/<>/g, '!==')
    .replace(/(?<![<>!=])=(?!=)/g, '===')
    // String functions with improved nested paren handling
    .replace(/\bRnd\b/gi, 'Math.random()')
    .replace(/,\s*(?=[,)])/g, ', undefined')
    .replace(/\bChr\((\d+)\)/gi, 'String.fromCharCode($1)')

    // ─── Extended String Functions ──────────────────────────────────────
    .replace(/\bInStr\(([^,]+),([^,)]+)(?:,\s*([^)]+))?\)/gi, (m, haystack, needle, start) => {
      const h = `String(${_vbsXpr(haystack)})`;
      const n = `String(${_vbsXpr(needle)})`;
      const s = start ? `Math.max(0, ${_vbsXpr(start)} - 1)` : '0';
      return `(${h}.indexOf(${n}, ${s}) + 1)`;
    })

    .replace(/\bInStrRev\(([^,]+),([^,)]+)(?:,\s*([^)]+))?\)/gi, (m, haystack, needle, start) => {
      const h = `String(${_vbsXpr(haystack)})`;
      const n = `String(${_vbsXpr(needle)})`;
      const s = start ? `Math.max(0, ${_vbsXpr(start)} - 1)` : 'undefined';
      return `(${h}.lastIndexOf(${n}, ${s}) + 1)`;
    })

    .replace(/\bLeft\(([^,]+),\s*([^)]+)\)/gi, (m, str, n) => {
      return `String(${_vbsXpr(str)}).substring(0, Math.max(0, ${_vbsXpr(n)}))`;
    })

    .replace(/\bRight\(([^,]+),\s*([^)]+)\)/gi, (m, str, n) => {
      const s = `String(${_vbsXpr(str)})`;
      const len = `Math.max(0, ${_vbsXpr(n)})`;
      return `${s}.substring(${s}.length - ${len})`;
    })

    .replace(/\bReplace\(([^,]+),([^,]+),([^,)]+)(?:,[^,)]*)?(?:,[^)]+)?\)/gi, (m, str, find, replace) => {
      const s = `String(${_vbsXpr(str)})`;
      const f = `String(${_vbsXpr(find)})`;
      const r = `String(${_vbsXpr(replace)})`;
      return `${s}.split(${f}).join(${r})`;
    })

    .replace(/\bLTrim\(([^)]+)\)/gi, (m, str) => {
      return `String(${_vbsXpr(str)}).replace(/^\\s+/, '')`;
    })

    .replace(/\bRTrim\(([^)]+)\)/gi, (m, str) => {
      return `String(${_vbsXpr(str)}).replace(/\\s+$/, '')`;
    })

    .replace(/\bSpace\(([^)]+)\)/gi, (m, n) => {
      return `' '.repeat(Math.max(0, ${_vbsXpr(n)}))`;
    })

    .replace(/\bAsc\(([^)]+)\)/gi, (m, char) => {
      return `String(${_vbsXpr(char)})[0].charCodeAt(0) || 0`;
    })

    // ─── Math Functions (Extended) ────────────────────────────────────────
    .replace(/\bSin\(([^)]+)\)/gi, (m, x) => `Math.sin(${_vbsXpr(x)})`)
    .replace(/\bCos\(([^)]+)\)/gi, (m, x) => `Math.cos(${_vbsXpr(x)})`)
    .replace(/\bTan\(([^)]+)\)/gi, (m, x) => `Math.tan(${_vbsXpr(x)})`)
    .replace(/\bAtn\(([^)]+)\)/gi, (m, x) => `Math.atan(${_vbsXpr(x)})`)
    .replace(/\bLog\(([^)]+)\)/gi, (m, x) => `Math.log(${_vbsXpr(x)})`)
    .replace(/\bExp\(([^)]+)\)/gi, (m, x) => `Math.exp(${_vbsXpr(x)})`)
    .replace(/\bPow\(([^,]+),\s*([^)]+)\)/gi, (m, base, exp) => `Math.pow(${_vbsXpr(base)}, ${_vbsXpr(exp)})`)

    // ─── Type Checking Functions ──────────────────────────────────────────
    .replace(/\bIsNumeric\(([^)]+)\)/gi, (m, x) => `(!isNaN(Number(${_vbsXpr(x)})))`)
    .replace(/\bIsArray\(([^)]+)\)/gi, (m, x) => `Array.isArray(${_vbsXpr(x)})`)
    .replace(/\bTypeName\(([^)]+)\)/gi, (m, x) => {
      const v = _vbsXpr(x);
      return `(Array.isArray(${v}) ? 'Array' : typeof ${v})`;
    });
}

// ─── VBScript Statement Parser ─────────────────────────────────────────────────

function _splitArgs(raw: string): string[] {
  const parts: string[] = [];
  let current = '', depth = 0, quote = '';
  for (const char of raw) {
    if (quote) { current += char; if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; current += char; continue; }
    if (char === '(') depth++;
    else if (char === ')') depth--;
    if (char === ',' && depth === 0) { parts.push(current.trim()); current = ''; continue; }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}


function _splitStatements(raw: string): string[] {
  const parts: string[] = []; let current = '', depth = 0, quote = '';
  for (const char of raw) {
    if (quote) { current += char; if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; current += char; continue; }
    if (char === '(') depth++;
    else if (char === ')') depth--;
    if (char === ':' && depth === 0) { parts.push(current.trim()); current = ''; continue; }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}



function _splitElse(raw: string): { thenPart: string; elsePart: string | null } {
  let depth = 0, quote = '';
  const lower = raw.toLowerCase();
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (quote) { if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (depth === 0 && lower.startsWith('else', i)
      && (i === 0 || /\W/.test(raw[i - 1])) && (i + 4 >= raw.length || /\W/.test(raw[i + 4]))) {
      return { thenPart: raw.slice(0, i).trim(), elsePart: raw.slice(i + 4).trim() };
    }
  }
  return { thenPart: raw.trim(), elsePart: null };
}

/** Locate a top-level assignment `=` while ignoring quotes, index brackets and comparisons. */
function _findAssignmentEquals(text: string): number {
  let quote = '', depth = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) { if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth--;
    else if (char === '=' && depth === 0) {
      const previous = text[i - 1], next = text[i + 1];
      if (previous === '<' || previous === '>' || previous === '!' || previous === '=') continue;
      if (next === '=' || next === '<' || next === '>') continue;
      return i;
    }
  }
  return -1;
}

/**
 * Validate a VBScript assignment target (bare name, member chain or indexed
 * access) and normalize call-style indexes to bracket access. Returns null for
 * expressions that must not be treated as assignments.
 */
function _assignableTarget(lhs: string): string | null {
  const head = /^[A-Za-z_]\w*/.exec(lhs);
  if (!head) return null;
  let result = head[0], i = head[0].length;
  while (i < lhs.length) {
    const char = lhs[i];
    if (char === '.') {
      const member = /^\.[A-Za-z_]\w*/.exec(lhs.slice(i));
      if (!member) return null;
      result += member[0]; i += member[0].length; continue;
    }
    if (char === '[' || char === '(') {
      const close = char === '[' ? ']' : ')';
      let depth = 0, quote = '', end = i;
      for (; end < lhs.length; end++) {
        const current = lhs[end];
        if (quote) { if (current === quote) quote = ''; continue; }
        if (current === '"' || current === "'") { quote = current; continue; }
        if (current === char) depth++;
        else if (current === close && --depth === 0) break;
      }
      if (end >= lhs.length) return null;
      const index = lhs.slice(i + 1, end).trim();
      if (!index) return null;
      result += `[${_vbsXpr(index)}]`; i = end + 1; continue;
    }
    return null;
  }
  return result;
}

function _vbsStmt(s: string, withContext?: string): string {

  const t = s.trim();

  // Handle With context: .Property becomes __with__.Property
  let target = _replaceArrayAccess(t.replace(/^[:\s]+/, '').replace(/:\s*$/, ''));
  if (withContext && t.startsWith('.')) {
    target = `__with__${t}`;
  }

  const statements = _splitStatements(target);
  if (statements.length > 1) return statements.map(part => _vbsStmt(part)).join('; ');

  if (/^End\s+If\s*;?$/i.test(target)) return '';
  let inlineIf = target.match(/^If\s+(.*?)\s*Then\s+(.+)$/i);
  if (inlineIf) {
    const split = _splitElse(inlineIf[2].replace(/\s+end\s+if\s*$/i, ''));
    return split.elsePart === null
      ? `if (${_vbsXpr(inlineIf[1])}) { ${_vbsStmt(split.thenPart)}; }`
      : `if (${_vbsXpr(inlineIf[1])}) { ${_vbsStmt(split.thenPart)}; } else { ${_vbsStmt(split.elsePart)}; }`;
  }
  if (/^Exit\s+(?:Sub|Function)$/i.test(target)) return 'return';
  if (/^Exit\s+(?:For|Do|While)$/i.test(target)) return 'break';

  const eqIdx = _findAssignmentEquals(target);
  if (eqIdx > 0) {
    const targetLhs = _assignableTarget(target.slice(0, eqIdx).trim());
    if (targetLhs) return `${targetLhs} = ${_vbsXpr(target.slice(eqIdx + 1).trim())}`;
  }
  const noParens = target.match(/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s+(?![=<>])(.+)$/);
  const keyword = /^(Set|Let|Call|If|Then|Else|ElseIf|End|For|Each|Next|Do|Loop|While|Wend|Select|Case|Exit|On|Dim|ReDim|Const|Private|Public|Function|Sub|With|Erase|Randomize|Option|Rem)$/i;
  if (noParens && (noParens[1].includes('.') || !keyword.test(noParens[1]))) {
    const args = _splitArgs(noParens[2]).map(a => a.trim() ? _vbsXpr(a) : 'undefined').join(', ');
    return `${noParens[1]}(${args})`;
  }
  // A bare procedure/method name is a zero-argument statement call in VBScript.
  if (target.split('.').every(part => /^[A-Za-z_]\w*$/.test(part)) && !keyword.test(target)) return `${target}()`;
  return _vbsXpr(target);
}

// ─── VBScript → JS Transpiler ──────────────────────────────────────────────────

// VBScript parameter modifiers are not valid JavaScript.
function _vbsParams(raw: string): string {
  return raw.split(',').map(part => {
    let p = part.trim();
    const paramArray = /^ParamArray\s+/i.test(p);
    p = p.replace(/^(?:(?:ByVal|ByRef|Optional)\s+)+/i, '');
    p = p.replace(/^ParamArray\s+/i, '');
    p = p.replace(/\s+As\s+\w+$/i, '');
    const eq = p.indexOf('=');
    if (eq > 0) return `${p.slice(0, eq).trim()} = ${_vbsXpr(p.slice(eq + 1).trim())}`;
    return paramArray ? `...${p}` : p;
  }).filter(Boolean).join(', ');
}



function braceDelta(line: string): number {
  let delta = 0, quote = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) { if (ch === quote) quote = ''; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '/' && line[i + 1] === '/') break;
    if (ch === '{') delta++;
    else if (ch === '}') delta--;
  }
  return delta;
}

function hoistFunctions(js: string): string {
  const lines = js.split('\n');
  const functions: string[] = [];
  const rest: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*function\s+\w+/.test(lines[i])) {
      const block = [lines[i]];
      let depth = braceDelta(lines[i]);
      while (depth > 0 && i + 1 < lines.length) {
        i++;
        block.push(lines[i]);
        depth += braceDelta(lines[i]);
      }
      functions.push(block.join('\n'));
    } else {
      rest.push(lines[i]);
    }
  }
  return [...functions, ...rest].join('\n');
}

export function vbsToJS(src: string): string {
  _vbsArrayNames = new Map<string, string>();
  // Phase 1.1: Preprocess line continuation
  const preprocessed = preprocessLineContinuation(src);
  const rawLines = preprocessed.replace(/\r\n?/g, '\n').split('\n');
  const lines: string[] = [];
  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith("'") || /^rem\s/i.test(trimmed) || /^(?:If\b.*\bThen\b.*|Case\b.*|[A-Za-z_]\w*:)$/i.test(trimmed)) lines.push(rawLine);
    else lines.push(..._splitStatements(rawLine));
  }
  const out: string[] = [];
  let depth = 0;
  let errorDepth = 0;
  let currentFunction: string | null = null;
  const withStack: string[] = [];  // Track With context for property access
  const pad = () => '  '.repeat(Math.max(0, depth));

  for (const rawLine of lines) {
    const t = rawLine.trim();
    if (!t) { out.push(''); continue; }
    if (t.startsWith("'") || /^rem\s/i.test(t)) {
      out.push(`${pad()}// ${t.replace(/^'|^rem\s+/i, '')}`); continue;
    }
    let code = t;
    const sqIdx = t.indexOf("'");
    if (sqIdx > 0 && (t.slice(0, sqIdx).match(/"/g) || []).length % 2 === 0)
      code = t.slice(0, sqIdx).trim();
    if (!code) continue;
    code = escapeVbsStrings(code).replace(/;\s*$/, '');

    let m: RegExpMatchArray | null;

    if (/^Option\s+(?:Explicit|Compare\b.*)$/i.test(code)) { out.push(`${pad()}// ${code}`); continue; }
    if (currentFunction) {
      const ret = code.match(new RegExp(`^${currentFunction}\\s*=\\s*(.*)$`, 'i'));
      if (ret) { out.push(`${pad()}__ret_${currentFunction} = ${_vbsXpr(ret[1])};`); continue; }
    }

    // eslint-disable-next-line security/detect-unsafe-regex
    if ((m = code.match(/^(?:(?:Private|Public)\s+)?Sub\s+(\w+)\s*;?$/i)))          { while (depth > 0) { out.push('}'); depth--; } errorDepth = 0; out.push(`function ${m[1]}() {`); currentFunction = null; depth = 1; continue; }
    // eslint-disable-next-line security/detect-unsafe-regex
    if ((m = code.match(/^(?:(?:Private|Public)\s+)?Function\s+(\w+)\s*;?$/i)))     { while (depth > 0) { out.push('}'); depth--; } errorDepth = 0; out.push(`function ${m[1]}() {`); out.push(`  let __ret_${m[1]};`); currentFunction = m[1]; depth = 1; continue; }
    // eslint-disable-next-line security/detect-unsafe-regex
    if ((m = code.match(/^(?:(?:Private|Public)\s+)?Sub\s+(\w+)\s*\((.*?)\)/i)))     { while (depth > 0) { out.push('}'); depth--; } errorDepth = 0; out.push(`function ${m[1]}(${_vbsParams(m[2])}) {`); currentFunction = null; depth = 1; continue; }
    // eslint-disable-next-line security/detect-unsafe-regex
    if ((m = code.match(/^(?:(?:Private|Public)\s+)?Function\s+(\w+)\s*\((.*?)\)/i))) { while (depth > 0) { out.push('}'); depth--; } errorDepth = 0; out.push(`function ${m[1]}(${_vbsParams(m[2])}) {`); out.push(`  let __ret_${m[1]};`); currentFunction = m[1]; depth = 1; continue; }
    if (/^End\s+(Sub|Function)\s*$/i.test(code))  {
      while (errorDepth > 0) { depth = Math.max(0, depth - 1); out.push(`${pad()}} catch (e) { /* ignored */ }`); errorDepth--; }
      if (currentFunction) out.push(`${pad()}return __ret_${currentFunction};`);
      depth = Math.max(0,depth-1); out.push(`${pad()}}`); currentFunction = null; continue;
    }

    if ((m = code.match(/^If\s+(.*?)\s*Then\s*$/i)))         { out.push(`${pad()}if (${_vbsXpr(m[1])}) {`); depth++; continue; }
    if ((m = code.match(/^If\s+(.*?)\s*Then\s+(.+)$/i))) {
      const split = _splitElse(m[2].replace(/\s+end\s+if\s*$/i, ''));
      out.push(split.elsePart === null
        ? `${pad()}if (${_vbsXpr(m[1])}) { ${_vbsStmt(split.thenPart)}; }`
        : `${pad()}if (${_vbsXpr(m[1])}) { ${_vbsStmt(split.thenPart)}; } else { ${_vbsStmt(split.elsePart)}; }`);
      continue;
    }
    if ((m = code.match(/^ElseIf\s+(.*?)\s*Then\s*$/i)))     { depth=Math.max(0,depth-1); out.push(`${pad()}} else if (${_vbsXpr(m[1])}) {`); depth++; continue; }
    if (/^Else$/i.test(code))   { depth=Math.max(0,depth-1); out.push(`${pad()}} else {`); depth++; continue; }
    if (/^End\s+If\s*;?$/i.test(code)) { depth=Math.max(0,depth-1); out.push(`${pad()}}`); continue; }

    // Phase 1.2: For...To...Next and For Each...In loops
    if ((m = code.match(/^For\s+(\w+)\s*=\s*(.+?)\s+To\s+(.+?)(?:\s+Step\s+(.+))?$/i))) {
      const v=m[1], a=_vbsXpr(m[2].trim()), b=_vbsXpr(m[3].trim()), st=m[4]?parseFloat(m[4]):1;
      const op=st<0?'>=':'<=', inc=st===1?`${v}++`:st===-1?`${v}--`:`${v}+=${st}`;
      out.push(`${pad()}for (let ${v}=${a}; ${v}${op}${b}; ${inc}) {`); depth++; continue;
    }
    if ((m = code.match(/^For\s+Each\s+(\w+)\s+In\s+(.+)$/i))) {
      const v = m[1], arr = _vbsXpr(m[2].trim());
      out.push(`${pad()}for (let ${v} of ${arr}) {`); depth++; continue;
    }
    if (/^Next(?:\s+\w+)?$/i.test(code)) { depth=Math.max(0,depth-1); out.push(`${pad()}}`); continue; }

    // Phase 2.1: Do loop variants
    if ((m = code.match(/^Do\s*$/i))) {
      out.push(`${pad()}while(true) {`); depth++; continue;
    }
    if ((m = code.match(/^Do\s+While\s+(.*)/i)))  { out.push(`${pad()}while (${_vbsXpr(m[1])}) {`); depth++; continue; }
    if ((m = code.match(/^Do\s+Until\s+(.*)/i)))  { out.push(`${pad()}while (!(${_vbsXpr(m[1])})) {`); depth++; continue; }
    if ((m = code.match(/^Loop\s+While\s+(.*)/i))) {
      depth = Math.max(0, depth - 1);
      out.push(`${pad()}} while(${_vbsXpr(m[1])})`); continue;
    }
    if ((m = code.match(/^Loop\s+Until\s+(.*)/i))) {
      depth = Math.max(0, depth - 1);
      out.push(`${pad()}} while(!(${_vbsXpr(m[1])}))`); continue;
    }
    if (/^Loop$/i.test(code)) { depth=Math.max(0,depth-1); out.push(`${pad()}}`); continue; }
    if (/^Exit\s+Do$/i.test(code)) { out.push(`${pad()}break;`); continue; }

    if ((m = code.match(/^Select\s+Case\s+(.*)/i)))  { out.push(`${pad()}switch (${_vbsXpr(m[1])}) {`); depth++; continue; }
    if (/^Case\s+Else$/i.test(code)) { out.push(`${pad()}default:`); continue; }
    if ((m = code.match(/^Case\s+(.+?):\s*(.*)$/i))) {
      out.push(pad()+m[1].split(',').map(v=>`case ${_vbsXpr(v.trim())}:`).join(' '));
      if (m[2].trim()) out.push(`${pad()}  ${_vbsStmt(m[2].trim())};`);
      continue;
    }
    if ((m = code.match(/^Case\s+(.*)/i))) { out.push(pad()+m[1].split(',').map(v=>`case ${_vbsXpr(v.trim())}:`).join(' ')); continue; }
    if (/^End\s+Select$/i.test(code)) { depth=Math.max(0,depth-1); out.push(`${pad()}}`); continue; }

    if ((m = code.match(/^ReDim\s+(Preserve\s+)?([A-Za-z_]\w*)\s*\((.*)\)/i))) {
      _vbsArrayNames.set(m[2].toLowerCase(), m[2]);
      const size = _vbsXpr(m[3]);
      out.push(m[1] ? `${pad()}${m[2]}.length = ${size} + 1;` : `${pad()}${m[2]} = new Array(${size} + 1);`);
      continue;
    }
    if ((m = code.match(/^Dim\s+(.*)/i))) {
      const vars = _splitArgs(m[1]).map(v => {
        const raw = v.trim();
        const isArray = raw.includes('(');
        const name = raw.replace(/\s+As\s+\w+/i, '').replace(/\(.*?\)/, '').trim();
        if (isArray && name) {
          _vbsArrayNames.set(name.toLowerCase(), name);
          const bounds = /\((.*)\)/.exec(raw)?.[1] ?? '';
          // Only fixed 1D allocation is implemented; dynamic/multidimensional
          // array and Empty/Variant semantics remain separate compatibility work.
          if (bounds.trim() && _splitArgs(bounds).length === 1) return `${name} = new Array((${_vbsXpr(bounds)}) + 1)`;
        }
        return name;
      }).filter(Boolean);
      out.push(`${pad()}var ${vars.join(', ')};`); continue;
    }
    if ((m = code.match(/^Const\s+(\w+)\s*=\s*(.*)/i))) { out.push(`${pad()}const ${m[1]} = ${_vbsXpr(m[2])};`); continue; }

    if (/^Exit\s+(Sub|Function)$/i.test(code)) { out.push(`${pad()}${currentFunction ? `return __ret_${currentFunction};` : 'return;'}`); continue; }
    if (/^Exit\s+For$/i.test(code))            { out.push(`${pad()}break;`);  continue; }

    if (/^On\s+Error\s+Resume\s+Next$/i.test(code)) {
      out.push(`${pad()}try {`); depth++; errorDepth++; continue;
    }
    if (/^On\s+Error\s+(?:GoTo\s+0|GoTo\s+\w+)$/i.test(code)) {
      if (errorDepth > 0) {
        depth = Math.max(0, depth - 1);
        out.push(`${pad()}} catch (e) { /* ignored */ }`);
        errorDepth--;
      }
      continue;
    }

    // Phase 3.1: With statement
    if ((m = code.match(/^With\s+([\w.]+)\s*$/i))) {
      const objName = m[1];
      out.push(`${pad()}let __with__ = ${_vbsXpr(objName)};`);
      out.push(`${pad()}{`);
      depth++;
      withStack.push(objName);
      continue;
    }
    if (/^End\s+With$/i.test(code)) {
      withStack.pop();
      depth = Math.max(0, depth - 1);
      out.push(`${pad()}}`);
      continue;
    }

    if ((m = code.match(/^Call\s+(.*)/i)))               { out.push(`${pad()}${_vbsStmt(m[1], withStack[withStack.length-1])};`); continue; }
    if ((m = code.match(/^Set\s+([\w.\[\]()]+)\s*=\s*(.*)/i))) { out.push(`${pad()}${m[1].replace(/^(\w+)\((.*)\)$/, '$1[$2]')} = ${_vbsXpr(m[2])};`); continue; }

    out.push(`${pad()}${_vbsStmt(code, withStack[withStack.length-1])};`);
  }
  return hoistFunctions(out.join('\n'));
}

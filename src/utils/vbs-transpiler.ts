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

function preprocessLineContinuation(src: string): string {
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

function _vbsXpr(e: string): string {
  let result = e;

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
    .replace(/\bIsNull\(([^)]+)\)/gi, (m, x) => `(${_vbsXpr(x)} === null || ${_vbsXpr(x)} === undefined)`)
    .replace(/\bIsEmpty\(([^)]+)\)/gi, (m, x) => `(${_vbsXpr(x)} === null || ${_vbsXpr(x)} === undefined || ${_vbsXpr(x)} === '')`)
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

function _vbsStmt(s: string, withContext?: string): string {

  const t = s.trim();

  // Handle With context: .Property becomes __with__.Property
  let target = t.replace(/^[:\s]+/, '').replace(/:\s*$/, '');
  if (withContext && t.startsWith('.')) {
    target = `__with__${t}`;
  }

  const statements = _splitStatements(target);
  if (statements.length > 1) return statements.map(part => _vbsStmt(part)).join('; ');

  if (/^End\s+If$/i.test(target)) return '';
  let inlineIf = target.match(/^If\s+(.*?)\s+Then\s+(.+)$/i);
  if (inlineIf) {
    const split = _splitElse(inlineIf[2].replace(/\s+end\s+if\s*$/i, ''));
    return split.elsePart === null
      ? `if (${_vbsXpr(inlineIf[1])}) { ${_vbsStmt(split.thenPart)}; }`
      : `if (${_vbsXpr(inlineIf[1])}) { ${_vbsStmt(split.thenPart)}; } else { ${_vbsStmt(split.elsePart)}; }`;
  }
  if (/^Exit\s+(?:Sub|Function)$/i.test(target)) return 'return';
  if (/^Exit\s+(?:For|Do|While)$/i.test(target)) return 'break';

  const eqIdx = target.search(/(?<![<>!])=(?!=)/);
  if (eqIdx > 0 && /^[\w_.[\]()]+$/.test(target.slice(0, eqIdx).trim())) {
    const lhs = target.slice(0, eqIdx).trim().replace(/^(\w+)\((.*)\)$/, '$1[$2]');
    return `${lhs} = ${_vbsXpr(target.slice(eqIdx + 1).trim())}`;
  }
  const noParens = target.match(/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s+(?![=<>])(.+)$/);
  const keyword = /^(Set|Let|Call|If|Then|Else|ElseIf|End|For|Each|Next|Do|Loop|While|Wend|Select|Case|Exit|On|Dim|ReDim|Const|Private|Public|Function|Sub|With|Erase|Randomize|Option|Rem)$/i;
  if (noParens && !keyword.test(noParens[1].split('.').pop() ?? '')) {
    const args = _splitArgs(noParens[2]).map(a => a.trim() ? _vbsXpr(a) : 'undefined').join(', ');
    return `${noParens[1]}(${args})`;
  }
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


export function vbsToJS(src: string): string {
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
    code = escapeVbsStrings(code);

    let m: RegExpMatchArray | null;

    if (/^Option\s+(?:Explicit|Compare\b.*)$/i.test(code)) { out.push(`${pad()}// ${code}`); continue; }

    // eslint-disable-next-line security/detect-unsafe-regex
    if ((m = code.match(/^(?:(?:Private|Public)\s+)?Sub\s+(\w+)\s*;?$/i)))          { out.push(`${pad()}function ${m[1]}() {`); depth++; continue; }
    // eslint-disable-next-line security/detect-unsafe-regex
    if ((m = code.match(/^(?:(?:Private|Public)\s+)?Function\s+(\w+)\s*;?$/i)))     { out.push(`${pad()}function ${m[1]}() {`); depth++; continue; }
    // eslint-disable-next-line security/detect-unsafe-regex
    if ((m = code.match(/^(?:(?:Private|Public)\s+)?Sub\s+(\w+)\s*\((.*?)\)/i)))     { out.push(`${pad()}function ${m[1]}(${_vbsParams(m[2])}) {`); depth++; continue; }
    // eslint-disable-next-line security/detect-unsafe-regex
    if ((m = code.match(/^(?:(?:Private|Public)\s+)?Function\s+(\w+)\s*\((.*?)\)/i))) { out.push(`${pad()}function ${m[1]}(${_vbsParams(m[2])}) {`); depth++; continue; }
    if (/^End\s+(Sub|Function)$/i.test(code))  {
      while (errorDepth > 0) { depth = Math.max(0, depth - 1); out.push(`${pad()}} catch (e) { /* ignored */ }`); errorDepth--; }
      depth = Math.max(0,depth-1); out.push(`${pad()}}`); continue;
    }

    if ((m = code.match(/^If\s+(.*?)\s+Then$/i)))         { out.push(`${pad()}if (${_vbsXpr(m[1])}) {`); depth++; continue; }
    if ((m = code.match(/^If\s+(.*?)\s+Then\s+(.+)$/i))) {
      const split = _splitElse(m[2].replace(/\s+end\s+if\s*$/i, ''));
      out.push(split.elsePart === null
        ? `${pad()}if (${_vbsXpr(m[1])}) { ${_vbsStmt(split.thenPart)}; }`
        : `${pad()}if (${_vbsXpr(m[1])}) { ${_vbsStmt(split.thenPart)}; } else { ${_vbsStmt(split.elsePart)}; }`);
      continue;
    }
    if ((m = code.match(/^ElseIf\s+(.*?)\s+Then$/i)))     { depth=Math.max(0,depth-1); out.push(`${pad()}} else if (${_vbsXpr(m[1])}) {`); depth++; continue; }
    if (/^Else$/i.test(code))   { depth=Math.max(0,depth-1); out.push(`${pad()}} else {`); depth++; continue; }
    if (/^End\s+If$/i.test(code)) { depth=Math.max(0,depth-1); out.push(`${pad()}}`); continue; }

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
      const size = _vbsXpr(m[3]);
      out.push(m[1] ? `${pad()}${m[2]}.length = ${size} + 1;` : `${pad()}${m[2]} = new Array(${size} + 1);`);
      continue;
    }
    if ((m = code.match(/^Dim\s+(.*)/i))) {
      const vars = _splitArgs(m[1]).map(v=>v.trim().replace(/\s+As\s+\w+/i,'').replace(/\(.*?\)/,'').trim()).filter(Boolean);
      out.push(`${pad()}let ${vars.join(', ')};`); continue;
    }
    if ((m = code.match(/^Const\s+(\w+)\s*=\s*(.*)/i))) { out.push(`${pad()}const ${m[1]} = ${_vbsXpr(m[2])};`); continue; }

    if (/^Exit\s+(Sub|Function)$/i.test(code)) { out.push(`${pad()}return;`); continue; }
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
  return out.join('\n');
}

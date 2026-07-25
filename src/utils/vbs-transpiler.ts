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
    if ((part === '"' || part === "'") && (i === 0 || parts[i-1] !== '\\')) {
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

function _vbsStmt(s: string, withContext?: string): string {
  const t = s.trim();

  // Handle With context: .Property becomes __with__.Property
  let target = t;
  if (withContext && t.startsWith('.')) {
    target = `__with__${t}`;
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

// ─── VBScript → JS Transpiler ──────────────────────────────────────────────────

export function vbsToJS(src: string): string {
  // Phase 1.1: Preprocess line continuation
  const preprocessed = preprocessLineContinuation(src);
  const lines = preprocessed.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let depth = 0;
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

    let m: RegExpMatchArray | null;

    // eslint-disable-next-line security/detect-unsafe-regex
    if ((m = code.match(/^(?:(?:Private|Public)\s+)?Sub\s+(\w+)\s*\((.*?)\)/i)))     { out.push(`${pad()}function ${m[1]}(${m[2]}) {`); depth++; continue; }
    // eslint-disable-next-line security/detect-unsafe-regex
    if ((m = code.match(/^(?:(?:Private|Public)\s+)?Function\s+(\w+)\s*\((.*?)\)/i))) { out.push(`${pad()}function ${m[1]}(${m[2]}) {`); depth++; continue; }
    if (/^End\s+(Sub|Function)$/i.test(code))  { depth = Math.max(0,depth-1); out.push(`${pad()}}`); continue; }

    if ((m = code.match(/^If\s+(.*?)\s+Then$/i)))         { out.push(`${pad()}if (${_vbsXpr(m[1])}) {`); depth++; continue; }
    if ((m = code.match(/^If\s+(.*?)\s+Then\s+(.+)$/i)))  { out.push(`${pad()}if (${_vbsXpr(m[1])}) { ${_vbsStmt(m[2])}; }`); continue; }
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
    if ((m = code.match(/^Case\s+(.*)/i))) { out.push(pad()+m[1].split(',').map(v=>`case ${_vbsXpr(v.trim())}:`).join(' ')); continue; }
    if (/^End\s+Select$/i.test(code)) { depth=Math.max(0,depth-1); out.push(`${pad()}}`); continue; }

    if ((m = code.match(/^Dim\s+(.*)/i))) {
      const vars = m[1].split(',').map(v=>v.trim().replace(/\s+As\s+\w+/i,'').replace(/\(.*?\)/,'').trim()).filter(Boolean);
      out.push(`${pad()}let ${vars.join(', ')};`); continue;
    }
    if ((m = code.match(/^Const\s+(\w+)\s*=\s*(.*)/i))) { out.push(`${pad()}const ${m[1]} = ${_vbsXpr(m[2])};`); continue; }

    if (/^Exit\s+(Sub|Function)$/i.test(code)) { out.push(`${pad()}return;`); continue; }
    if (/^Exit\s+For$/i.test(code))            { out.push(`${pad()}break;`);  continue; }

    if (/^On\s+Error\s+Resume\s+Next$/i.test(code)) {
      out.push(`${pad()}try {`); depth++; continue;
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
    if ((m = code.match(/^Set\s+([\w.]+)\s*=\s*(.*)/i))) { out.push(`${pad()}${m[1]} = ${_vbsXpr(m[2])};`); continue; }

    out.push(`${pad()}${_vbsStmt(code, withStack[withStack.length-1])};`);
  }
  return out.join('\n');
}

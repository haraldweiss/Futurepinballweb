// SPDX-License-Identifier: AGPL-3.0-or-later
import { logMsg } from './log';

export function extractNullStrings(bytes: Uint8Array, minLen = 4): string[] {
  const out: string[] = []; let cur = '';
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c >= 32 && c < 127) cur += String.fromCharCode(c);
    else { if (cur.length >= minLen) out.push(cur); cur = ''; }
  }
  return out;
}

export function extractPascalStrings(bytes: Uint8Array): string[] {
  const view = new DataView(bytes.buffer);
  const out = new Set<string>();
  for (let i = 0; i < bytes.length - 3; i++) {
    for (const [prefix, len] of [[1, bytes[i]], [2, view.getUint16(i, true)]]) {
      const l = len as number;
      if (l < 3 || l > 80 || i + prefix + l >= bytes.length) continue;
      let s = '', ok = true;
      for (let j = 0; j < l; j++) {
        const c = bytes[i + (prefix as number) + j];
        if (c >= 32 && c < 127) s += String.fromCharCode(c); else { ok = false; break; }
      }
      if (ok && /^[A-Za-z0-9\s\-_'!.,:]+$/.test(s)) out.add(s.trim());
    }
  }
  return [...out];
}

export function tryExtractVBScriptFromData(bytes: Uint8Array): string | null {
  for (const encoding of ['utf-8', 'utf-16le', 'iso-8859-1'] as const) {
    try {
      let text: string;
      if (encoding === 'utf-16le') {
        text = new TextDecoder('utf-16le', { fatal: false }).decode(bytes);
      } else {
        text = new TextDecoder(encoding, { fatal: false }).decode(bytes);
      }

      const subMatches = text.match(/\bSub\s+\w+/gi) || [];
      const funcMatches = text.match(/\bFunction\s+\w+/gi) || [];
      const dimMatches = text.match(/\bDim\s+\w+/gi) || [];

      if (subMatches.length > 0 || funcMatches.length > 0 || dimMatches.length > 5) {
        return text;
      }
    } catch { /* try next encoding */ }
  }

  try {
    let curStr = '';
    let allText = '';
    for (let i = 0; i < bytes.length; i++) {
      const c = bytes[i];
      if (c >= 32 && c < 127) {
        curStr += String.fromCharCode(c);
      } else if (c === 10 || c === 13) {
        if (curStr.length > 0) allText += `${curStr}\n`;
        curStr = '';
      } else {
        if (curStr.length > 3) allText += `${curStr} `;
        curStr = '';
      }
    }

    if ((allText.match(/\bSub\s+\w+/gi) || []).length > 0 ||
        (allText.match(/\bFunction\s+\w+/gi) || []).length > 0 ||
        (allText.match(/\bDim\s+\w+/gi) || []).length > 5) {
      return allText;
    }
  } catch { void 0; }

  try {
    const keywords = ['Sub ', 'End Sub', 'Function ', 'Dim ', 'Private ', 'Public '];
    for (const keyword of keywords) {
      for (let i = 0; i < bytes.length - keyword.length; i++) {
        let match = true;
        for (let j = 0; j < keyword.length; j++) {
          if (bytes[i + j] !== keyword.charCodeAt(j)) { match = false; break; }
        }
        if (match) {
          const start = Math.max(0, i - 200);
          const end = Math.min(bytes.length, i + 10000);
          const chunk = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(start, end));
          const subCount = (chunk.match(/Sub\s+\w+/gi) || []).length;
          const dimCount = (chunk.match(/Dim\s+\w+/gi) || []).length;
          if (subCount > 0 || dimCount > 3) {
            logMsg(`  Script markers found at offset ${start}`, 'info');
            return chunk;
          }
        }
      }
    }
  } catch { void 0; }

  return null;
}

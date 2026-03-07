#!/usr/bin/env node
/**
 * Test script to validate FPT loader enhancements
 * Tests LZO decompression and VBScript extraction
 */
import fs from 'fs';
import CFB from 'cfb';

// LZO decompression (matching fpt-parser.ts)
function lzo1xDecompress(src) {
  try {
    const out = new Uint8Array(Math.min(src.length * 10 + 65536, 48 * 1024 * 1024));
    let ip = 0, op = 0;

    const m1 = (t) => {
      const mp = op - 0x801 - (t >> 2) - (src[ip++] << 2);
      out[op++] = out[mp]; out[op++] = out[mp+1]; out[op++] = out[mp+2];
      return src[ip++];
    };

    let t = src[ip++];
    if (t > 17) {
      t -= 17;
      while (t-- > 0) out[op++] = src[ip++];
      t = src[ip++];
      if (t < 16) t = m1(t);
    }

    outer: for (;;) {
      if (t < 16) {
        let n = t;
        if (n === 0) { n = 15; while (src[ip]===0){n+=255;ip++;} n+=src[ip++]; }
        n += 3;
        while (n-- > 0) out[op++] = src[ip++];
        t = src[ip++];
        if (t < 16) { t = m1(t); continue outer; }
      }
      let ml, mp;
      if (t >= 64) {
        mp = op - 1 - ((t>>2)&7) - (src[ip++]<<3); ml = (t>>5)+1;
      } else if (t >= 32) {
        ml = t & 31;
        if (ml===0){ml=31;while(src[ip]===0){ml+=255;ip++;}ml+=src[ip++];}
        ml+=2;
        const l3=src[ip++],h3=src[ip++]; mp=op-1-(l3>>2)-(h3<<6)-0x4000;
      } else {
        ml = t & 7;
        if (ml===0){ml=7;while(src[ip]===0){ml+=255;ip++;}ml+=src[ip++];}
        ml+=2;
        const hi0=(t&8)<<11, l4=src[ip++], h4=src[ip++], off=(l4>>2)|(h4<<6);
        if (hi0===0 && off===0) break outer;
        mp=op-hi0-off-0x4001;
      }
      let m=mp; for(let i=0;i<ml;i++) out[op++]=out[m++];
      t=src[ip++]; if(t<16) t=m1(t);
    }
    return out.subarray(0, op);
  } catch { return null; }
}

// Test VBScript extraction (matching new helper)
function tryExtractVBScriptFromData(bytes) {
  for (const encoding of ['utf-8', 'utf-16le', 'iso-8859-1']) {
    try {
      let text;
      if (encoding === 'utf-16le') {
        text = new TextDecoder('utf-16le', { fatal: false }).decode(bytes);
      } else {
        text = new TextDecoder(encoding, { fatal: false }).decode(bytes);
      }

      const subMatches = text.match(/\bSub\s+\w+/gi) || [];
      const funcMatches = text.match(/\bFunction\s+\w+/gi) || [];
      const dimMatches = text.match(/\bDim\s+\w+/gi) || [];

      if (subMatches.length > 0 || funcMatches.length > 0 || dimMatches.length > 5) {
        return { text, encoding, subCount: subMatches.length, funcCount: funcMatches.length, dimCount: dimMatches.length };
      }
    } catch { /* try next encoding */ }
  }

  // ASCII extraction fallback
  try {
    let curStr = '';
    let allText = '';
    for (let i = 0; i < bytes.length; i++) {
      const c = bytes[i];
      if (c >= 32 && c < 127) {
        curStr += String.fromCharCode(c);
      } else if (c === 10 || c === 13) {
        if (curStr.length > 0) allText += curStr + '\n';
        curStr = '';
      } else {
        if (curStr.length > 3) allText += curStr + ' ';
        curStr = '';
      }
    }

    const subMatches = (allText.match(/\bSub\s+\w+/gi) || []).length;
    const dimMatches = (allText.match(/\bDim\s+\w+/gi) || []).length;
    if (subMatches > 0 || dimMatches > 5) {
      return { text: allText, encoding: 'ascii-extracted', subCount: subMatches, dimCount: dimMatches };
    }
  } catch { }

  return null;
}

// Main test
console.log('=== FPT Loader Enhancements Test ===\n');

const filePath = '/Volumes/WindowsBackup/Vpin Backup Atgames 4kP/FuturePinball/Tables/RocketShip_FizX3_3_V100.fpt';
if (!fs.existsSync(filePath)) {
  console.log('❌ Test file not found:', filePath);
  process.exit(1);
}

const fileData = fs.readFileSync(filePath);
const cfb = CFB.read(fileData, { type: 'buffer' });
const tableDataEntry = cfb.FileIndex.find(e => e.name === 'Table Data' && e.type === 2);

if (!tableDataEntry) {
  console.log('❌ Table Data stream not found');
  process.exit(1);
}

const bytes = tableDataEntry.content;
console.log(`✓ Found Table Data stream: ${bytes.length} bytes\n`);

// Test 1: Find LZO blocks
console.log('Test 1: Scanning for LZO blocks...');
const lzoOffsets = [];
for (let i = 0; i < bytes.length - 4; i++) {
  if (bytes[i] === 0x7A && bytes[i+1] === 0x4C && bytes[i+2] === 0x5A && bytes[i+3] === 0x4F) {
    lzoOffsets.push(i);
  }
}
console.log(`✓ Found ${lzoOffsets.length} zLZO blocks at offsets:`, lzoOffsets.slice(0, 5).join(', '), lzoOffsets.length > 5 ? '...' : '');

// Test 2: Try decompression
console.log('\nTest 2: Attempting LZO decompression...');
for (const offset of lzoOffsets.slice(0, 3)) {
  const lzoData = bytes.slice(offset + 4);
  const decompressed = lzo1xDecompress(lzoData);
  if (decompressed) {
    console.log(`✓ Decompressed block at offset ${offset}: ${decompressed.length} bytes`);

    // Test 3: Try VBScript extraction
    console.log(`  Testing VBScript extraction...`);
    const result = tryExtractVBScriptFromData(decompressed);
    if (result) {
      console.log(`  ✓ Extracted ${result.encoding}: Sub×${result.subCount}, Function×${result.funcCount}, Dim×${result.dimCount}`);
      console.log(`    Text length: ${result.text.length} chars`);
      if (result.subCount > 0) {
        console.log(`\n  SUCCESS! Found VBScript code.\n`);
      }
    } else {
      console.log(`  ✗ No VBScript patterns found in decompressed data`);
    }
  } else {
    console.log(`✗ Failed to decompress block at offset ${offset}`);
  }
}

console.log('\n=== Test Complete ===');

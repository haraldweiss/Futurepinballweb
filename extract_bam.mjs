import fs from 'fs';
import CFB from 'cfb';

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

function tryExtractVBScript(bytes) {
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
        return text;
      }
    } catch { }
  }

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

  if ((allText.match(/\bSub\s+\w+/gi) || []).length > 0 ||
      (allText.match(/\bFunction\s+\w+/gi) || []).length > 0 ||
      (allText.match(/\bDim\s+\w+/gi) || []).length > 5) {
    return allText;
  }

  return null;
}

console.log('=== Extracting B.A.M. Script from Retroflair ===\n');

const filePath = '/Volumes/WindowsBackup/Vpin Backup Atgames 4kP/FuturePinball/Tables/Retroflair - BAM Edition (PinEvent V2 - FizX - 2.0).fpt';
const fileData = fs.readFileSync(filePath);

const cfb = CFB.read(fileData, { type: 'buffer' });
const entries = cfb.FileIndex.filter(e => e.type === 2 && e.size > 0);

console.log(`Found ${entries.length} streams\n`);

// Look for script streams
const scriptStreams = entries.filter(e => {
  const name = (e.name || '').toLowerCase();
  return /script|code|vbs|table/i.test(name) && e.size < 10*1024*1024;
});

console.log(`Script-related streams: ${scriptStreams.length}\n`);

for (const entry of scriptStreams) {
  console.log(`Trying: ${entry.name} (${entry.size} bytes)`);
  const bytes = entry.content;
  
  // Try direct decode
  let text = tryExtractVBScript(bytes);
  if (text) {
    console.log(`✓ Found VBScript!\n`);
    fs.writeFileSync('retroflair_script.vbs', text);
    console.log(`Extracted to: retroflair_script.vbs (${text.length} chars)\n`);
    console.log('=== First 5000 characters ===\n');
    console.log(text.substring(0, 5000));
    process.exit(0);
  }
  
  // Try LZO decompression
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === 0x7A && bytes[i+1] === 0x4C && bytes[i+2] === 0x5A && bytes[i+3] === 0x4F) {
      console.log(`  Found LZO at offset ${i}`);
      const decompressed = lzo1xDecompress(bytes.slice(i + 4));
      if (decompressed) {
        text = tryExtractVBScript(decompressed);
        if (text) {
          console.log(`✓ Found VBScript in LZO block!\n`);
          fs.writeFileSync('retroflair_script.vbs', text);
          console.log(`Extracted to: retroflair_script.vbs (${text.length} chars)\n`);
          console.log('=== First 5000 characters ===\n');
          console.log(text.substring(0, 5000));
          process.exit(0);
        }
      }
    }
  }
}

console.log('❌ No script found in standard locations, checking all streams...\n');

// Check all streams for VBScript patterns
for (const entry of entries.slice(0, 50)) {
  if (entry.size < 100 || entry.size > 50*1024*1024) continue;
  
  const bytes = entry.content;
  let text = tryExtractVBScript(bytes);
  if (text) {
    console.log(`✓ Found VBScript in: ${entry.name}\n`);
    fs.writeFileSync('retroflair_script.vbs', text);
    console.log(`Extracted to: retroflair_script.vbs (${text.length} chars)\n`);
    console.log('=== First 5000 characters ===\n');
    console.log(text.substring(0, 5000));
    process.exit(0);
  }
}

console.log('Script not found');

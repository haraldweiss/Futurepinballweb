import fs from 'fs';
import CFB from 'cfb';

const filePath = '/Volumes/WindowsBackup/Vpin Backup Atgames 4kP/FuturePinball/Tables/RocketShip_FizX3_3_V100.fpt';
const fileData = fs.readFileSync(filePath);

const cfb = CFB.read(fileData, { type: 'buffer' });
const tableDataEntry = cfb.FileIndex.find(e => e.name === 'Table Data' && e.type === 2);

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
  } catch (e) { console.log('Decompression error:', e.message); return null; }
}

if (tableDataEntry) {
  const bytes = tableDataEntry.content;
  
  // Try both zLZO blocks
  const offsets = [458, 1422];
  
  for (const lzoOffset of offsets) {
    console.log(`\n=== Trying offset ${lzoOffset} ===`);
    
    const lzoData = bytes.slice(lzoOffset + 4);
    const decompressed = lzo1xDecompress(lzoData);
    
    if (decompressed && decompressed.length > 100) {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(decompressed);
      
      // Count script patterns
      const subCount = (text.match(/\bSub\s+\w+/gi) || []).length;
      const functionCount = (text.match(/\bFunction\s+\w+/gi) || []).length;
      const dimCount = (text.match(/\bDim\s+\w+/gi) || []).length;
      
      console.log(`Decompressed: ${decompressed.length} bytes → ${text.length} chars`);
      console.log(`Sub count: ${subCount}, Function count: ${functionCount}, Dim count: ${dimCount}`);
      
      if (subCount > 0 || functionCount > 0 || dimCount > 5) {
        console.log(`\n✓ This looks like VBScript!\n`);
        fs.writeFileSync('rocketship_script.vbs', text);
        console.log('=== First 4000 characters ===\n');
        console.log(text.substring(0, 4000));
        console.log('\n... (truncated)\n');
        console.log(`Saved to: rocketship_script.vbs`);
        process.exit(0);
      } else {
        console.log('First 300 chars:', text.substring(0, 300));
      }
    } else {
      console.log('Failed to decompress');
    }
  }
  
  console.log('\n❌ No VBScript found');
}

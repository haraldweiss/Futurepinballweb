import fs from 'fs';
import CFB from 'cfb';

const filePath = '/Volumes/WindowsBackup/Vpin Backup Atgames 4kP/FuturePinball/Tables/RocketShip_FizX3_3_V100.fpt';
const fileData = fs.readFileSync(filePath);

const cfb = CFB.read(fileData, { type: 'buffer' });
const tableDataEntry = cfb.FileIndex.find(e => e.name === 'Table Data' && e.type === 2);

if (tableDataEntry) {
  const bytes = tableDataEntry.content;
  console.log(`Table Data size: ${bytes.length} bytes\n`);
  
  // Search for "zLZO" magic
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === 0x7A && bytes[i+1] === 0x4C && bytes[i+2] === 0x5A && bytes[i+3] === 0x4F) {
      console.log(`Found zLZO at offset ${i}`);
      
      // Try to decompress from different starting points
      for (const skip of [0, 4, 8]) {
        const lzoData = bytes.slice(i + skip);
        console.log(`  Trying decompression from offset +${skip}...`);
      }
    }
  }
  
  // Try to find any "Sub " pattern
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const subMatches = text.match(/Sub\s+\w+/gi);
  if (subMatches) {
    console.log(`Found ${subMatches.length} "Sub" patterns in Table Data`);
    console.log(`First match at: ${text.indexOf(subMatches[0])}`);
  }
  
  // Look for common VBScript keywords
  const keywords = ['Sub ', 'Function ', 'Dim ', 'Option Explicit', 'End Sub', 'End Function'];
  keywords.forEach(kw => {
    const idx = text.indexOf(kw);
    if (idx >= 0) {
      console.log(`Found "${kw}" at offset ${idx}`);
      console.log(`  Context: ...${text.substring(Math.max(0, idx-50), Math.min(text.length, idx+150))}...`);
    }
  });
}

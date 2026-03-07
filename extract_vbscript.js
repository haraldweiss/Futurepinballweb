import CFB from 'cfb';
import fs from 'fs';
import { decompressLZO1X } from './dist/index.js';

const filePath = '/Volumes/WindowsBackup/Vpin Backup Atgames 4kP/FuturePinball/Tables/RocketShip_FizX3_3_V100.fpt';
const fileData = fs.readFileSync(filePath);
const cfb = CFB.parse(fileData);

console.log('=== FPT File Structure ===');
console.log('Root entries:', cfb.SheetNames.slice(0, 20));

// Find and extract VBScript
const scriptStreams = cfb.SheetNames.filter(name => 
  name.includes('Script') || name.includes('VBScript') || name.toLowerCase().includes('code')
);

console.log('\n=== Script Streams Found ===');
console.log(scriptStreams);

// Try to find and read script data
for (const streamName of cfb.SheetNames) {
  if (streamName.includes('Script') || streamName.includes('Code')) {
    const stream = cfb.Sheets[streamName];
    if (stream && stream.data) {
      console.log(`\nStream: ${streamName}`);
      console.log(`Size: ${stream.data.length} bytes`);
    }
  }
}

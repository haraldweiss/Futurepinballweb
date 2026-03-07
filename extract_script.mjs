import CFB from 'cfb';
import fs from 'fs';

const filePath = '/Volumes/WindowsBackup/Vpin Backup Atgames 4kP/FuturePinball/Tables/RocketShip_FizX3_3_V100.fpt';
const fileData = fs.readFileSync(filePath);
const cfb = CFB.parse(fileData);

// Find the Table Data entry and read it directly
const entries = cfb.FileIndex;
const tableDataIdx = entries.findIndex(e => e.name === 'Table Data');

if (tableDataIdx >= 0) {
  const entry = entries[tableDataIdx];
  console.log('Table Data entry:', entry);
  
  // The entry has a start sector and size, we can use those to read the data
  const start = entry.start * 512; // Assuming 512 byte sectors
  const size = Math.min(entry.size, 5000); // Read first 5000 bytes
  
  const data = fileData.slice(start, start + size);
  const str = Buffer.from(data).toString('utf8', 0, Math.min(2000, data.length));
  
  console.log('\n=== Table Data (first 2000 UTF8 chars) ===');
  console.log(str);
  
  // Also try latin1
  console.log('\n=== Table Data (first 2000 latin1 chars) ===');
  const str2 = Buffer.from(data).toString('latin1', 0, Math.min(2000, data.length));
  console.log(str2);
}

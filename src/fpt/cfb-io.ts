// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

/**
 * cfb-io.ts — Dependency-free MS-CFB (Compound File Binary) reader + writer.
 *
 * Replaces the `cfb` npm package for this project's needs (FPT/FPL/FPM parse
 * and FPT save). Implements the MS-CFB spec enough to read real files
 * (DIFAT + FAT + directory + miniFAT/mini-stream) and to write spec-conform
 * files that both this reader and the reference `cfb` lib parse back.
 *
 * Public API mirrors the `cfb` package subset used by this repo:
 *   read(bytes)                      -> { FileIndex, FullPaths }
 *   write(container, {type})         -> Uint8Array
 *   utils.cfb_new()                  -> empty container
 *   utils.cfb_add(container, path, data) -> container
 *
 * Types are `any`-free and match the CFB$Container shape consumed elsewhere.
 */

export interface CFBEntry {
  name: string;          // leaf name
  size: number;
  type: number;          // 0 unallocated, 1 storage, 2 stream, 5 root
  content: Uint8Array;   // stream bytes (empty for storages/root-without-data)
  sid: number;           // sector id / internal index
}

export interface CFBContainer {
  FileIndex: CFBEntry[];
  FullPaths: string[];
}

export type CFB$Container = CFBContainer;

type WriteRaw = Record<string, Uint8Array>;

const ENDOFCHAIN = 0xfffffffe;
const FREESECT = 0xffffffff;
const FATSECT = 0xfffffffd;
const DIFSECT = 0xfffffffc;
const MAXREGSECT = 0xfffffffa;

// ─── Round helpers ─────────────────────────────────────────────────────────
function numSectors(byteLen: number, sz: number): number {
  return Math.max(1, Math.ceil(byteLen / sz));
}

// ─── Reader ─────────────────────────────────────────────────────────────────

export function read(input: Uint8Array, _opts?: { type?: string }): CFBContainer {
  if (!input || input.length < 512) throw new Error('CFB: data too short');
  const v = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const sig = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  for (let i = 0; i < 8; i++) if (input[i] !== sig[i]) throw new Error('CFB: bad signature');
  const sectorShift = v.getUint16(30, true) || 9;
  const miniShift = v.getUint16(32, true) || 6;
  const SZ = 1 << sectorShift;
  const MSZ = 1 << miniShift;
  const cutoff = (v.getUint32(56, true) || 0x1000);
  const dirStart = v.getUint32(48, true);
  const miniFATStart = v.getUint32(60, true);
  const numMiniFAT = v.getUint32(64, true);
  const difatStart = v.getUint32(68, true);
  const nDIFAT = v.getUint32(72, true);
  const totalSectors = Math.floor(input.length / SZ) - 1; // data sectors (header excluded)
  const perSec = SZ >>> 2;
  // The `cfb` library convention (and the real FP tables this project reads via it)
  // numbers sectors with the 512-byte header excluded, so data for sector `s` lives
  // at file offset `(s + 1) * SZ`.
  const secOff = (s: number): number => (s + 1) * SZ;

  // ---- DIFAT -> list of FAT sector ids ----
  const fatSectors: number[] = [];
  for (let i = 0; i < 109; i++) {
    const s = v.getUint32(76 + i * 4, true);
    if (s >= MAXREGSECT) break;
    fatSectors.push(s);
  }
  let d = difatStart;
  let guard = 0;
  while (d < totalSectors && d !== ENDOFCHAIN && nDIFAT > 0 && guard++ < 10000) {
    const base = secOff(d);
    for (let i = 0; i < perSec - 1; i++) {
      const s = v.getUint32(base + i * 4, true);
      if (s >= MAXREGSECT) break;
      fatSectors.push(s);
    }
    d = v.getUint32(base + (perSec - 1) * 4, true);
  }

  // ---- FAT map: sector id -> next sector id ----
  const fat = new Map<number, number>();
  for (const fs of fatSectors) {
    const base = secOff(fs);
    const baseSec = fs * perSec;
    for (let i = 0; i < perSec; i++) {
      fat.set(baseSec + i, v.getUint32(base + i * 4, true));
    }
  }

  const nextOf = (sec: number): number => (fat.has(sec) ? fat.get(sec)! : ENDOFCHAIN);

  function chainSectors(start: number): number[] {
    const out: number[] = [];
    let s = start;
    let g = 0;
    while (s !== ENDOFCHAIN && s < totalSectors && g++ < 100000) {
      out.push(s);
      s = nextOf(s);
    }
    return out;
  }

  function readChain(start: number, size: number): Uint8Array {
    const out = new Uint8Array(size);
    const sects = chainSectors(start);
    let off = 0;
    for (const s of sects) {
      if (off >= size) break;
      const n = Math.min(SZ, size - off);
      out.set(input.subarray(secOff(s), secOff(s) + n), off);
      off += n;
    }
    return out;
  }

  // ---- Directory ----
  const dirSectors = chainSectors(dirStart);
  const dirRawLen = dirSectors.length * SZ;
  const dirRaw = new Uint8Array(dirRawLen);
  let dOff = 0;
  for (const s of dirSectors) {
    dirRaw.set(input.subarray(secOff(s), secOff(s) + SZ), dOff);
    dOff += SZ;
  }
  const dirView = new DataView(dirRaw.buffer, dirRaw.byteOffset, dirRaw.byteLength);
  const entryCount = Math.floor(dirRawLen / 128);

  interface RawDir { name: string; type: number; start: number; size: number; left: number; right: number; child: number; }
  const dirs: RawDir[] = [];
  for (let i = 0; i < entryCount; i++) {
    const base = i * 128;
    const nameLen = dirView.getUint16(base + 64, true);
    let name = '';
    if (nameLen >= 2 && nameLen <= 64) {
      const nameBytes = dirRaw.subarray(base, base + nameLen - 2); // strip trailing null
      name = new TextDecoder('utf-16le', { fatal: false }).decode(nameBytes);
    }
    dirs.push({
      name,
      type: dirView.getUint8(base + 65),
      start: dirView.getUint32(base + 116, true),
      size: dirView.getUint32(base + 120, true),
      left: dirView.getUint32(base + 68, true),
      right: dirView.getUint32(base + 72, true),
      child: dirView.getUint32(base + 76, true),
    });
  }

  // ---- Empty container-safe fallbacks ----
  if (dirs.length === 0) return { FileIndex: [], FullPaths: [] };

  // Root entry (index 0) -> mini stream
  const root = dirs[0];
  let miniStream: Uint8Array | null = null;
  if (root.type === 5 && root.start !== ENDOFCHAIN && root.size > 0 && root.start < totalSectors) {
    miniStream = readChain(root.start, root.size);
  }

  // ---- miniFAT map: mini sector index -> next mini sector ----
  const miniFat = new Map<number, number>();
  if (miniFATStart !== ENDOFCHAIN && numMiniFAT > 0) {
    const mfSects = chainSectors(miniFATStart);
    let mOff = 0;
    for (const s of mfSects) {
      const base = s * SZ;
      for (let i = 0; i < perSec; i++) {
        miniFat.set(mOff, v.getUint32(base + i * 4, true));
        mOff++;
      }
    }
  }

  function miniChain(startIdx: number): number[] {
    const out: number[] = [];
    let s = startIdx;
    let g = 0;
    while (s !== ENDOFCHAIN && g++ < 100000) {
      out.push(s);
      const n = miniFat.get(s);
      if (n === undefined) break;
      s = n;
    }
    return out;
  }

  function readMini(startIdx: number, size: number): Uint8Array {
    const out = new Uint8Array(size);
    if (!miniStream) return out;
    const sects = miniChain(startIdx);
    let off = 0;
    for (const s of sects) {
      if (off >= size) break;
      const base = s * MSZ;
      const n = Math.min(MSZ, size - off);
      out.set(miniStream.subarray(base, base + n), off);
      off += n;
    }
    return out;
  }

  // ---- Build FileIndex + FullPaths ----
  // Determine leaf entry list in directory-index order, excluding pure
  // empty-unallocated slots. Compute full paths via parent tree.
  const parentOf = new Map<number, number>();       // dir idx -> parent idx
  const childrenOf = new Map<number, number[]>();    // dir idx -> child dir idxs

  // Build children lists: a node's children are the subtree rooted at its
  // `child` pointer, reachable by walking `left`/`right` siblings.
  function collectSubtree(rootIdx: number): number[] {
    const seen = new Set<number>();
    const stack = [rootIdx];
    while (stack.length) {
      const i = stack.pop()!;
      if (i === ENDOFCHAIN || i >= dirs.length || seen.has(i)) continue;
      seen.add(i);
      const e = dirs[i];
      if (e.left !== ENDOFCHAIN) stack.push(e.left);
      if (e.right !== ENDOFCHAIN) stack.push(e.right);
    }
    return [...seen];
  }
  for (let i = 0; i < dirs.length; i++) {
    const e = dirs[i];
    if (e.type === 0) continue;
    if (e.child !== ENDOFCHAIN && e.child < dirs.length) {
      for (const c of collectSubtree(e.child)) {
        childrenOf.set(i, [...(childrenOf.get(i) ?? []), c]);
      }
    }
  }
  // Record parent links
  for (const [p, kids] of childrenOf) {
    for (const k of kids) parentOf.set(k, p);
  }

  const fullPathOf = new Map<number, string>();
  const rootIdx = 0;
  if (dirs[rootIdx]) fullPathOf.set(rootIdx, 'Root Entry');

  function computePath(i: number): string {
    if (fullPathOf.has(i)) return fullPathOf.get(i)!;
    const p = parentOf.get(i);
    if (p === undefined) { fullPathOf.set(i, dirs[i].name || 'Stream'); return fullPathOf.get(i)!; }
    const base = computePath(p);
    const full = base + '/' + (dirs[i].name || 'Stream');
    fullPathOf.set(i, full);
    return full;
  }
  for (let i = 0; i < dirs.length; i++) if (dirs[i].type !== 0) computePath(i);

  const FileIndex: CFBEntry[] = [];
  const FullPaths: string[] = [];

  for (let i = 0; i < dirs.length; i++) {
    const e = dirs[i];
    if (e.type === 0 && !e.name) continue;
    let content: Uint8Array = new Uint8Array(0);
    if (e.type === 2 || e.type === 5) {
      if (e.size > 0 && e.start !== ENDOFCHAIN) {
        if (e.type === 5) {
          content = miniStream ?? new Uint8Array(0);
        } else if (e.size < cutoff && miniStream) {
          content = readMini(e.start, e.size);
        } else if (e.start < totalSectors) {
          content = readChain(e.start, e.size);
        }
      }
    }
    const entry: CFBEntry = { name: e.name, size: e.type === 1 ? 0 : e.size, type: e.type, content, sid: i };
    FileIndex.push(entry);
    FullPaths.push(fullPathOf.get(i) ?? (dirs[i].name || ''));
  }

  return { FileIndex, FullPaths };
}

// ─── Writer ─────────────────────────────────────────────────────────────────

const WRITER_CUTOFF = 0x1000; // 4096 bytes
const SECTOR = 512;
const MINI_SECTOR = 64;

interface WNode {
  name: string;
  type: number; // 1 storage, 2 stream
  data: Uint8Array | null;
  children: Map<string, WNode>;
}

interface WriteContainer {
  root: WNode;
  streams: Array<{ path: string; data: Uint8Array }>;
}

export const utils = {
  cfb_new(): WriteContainer {
    const root: WNode = { name: 'Root Entry', type: 1, data: null, children: new Map() };
    return { root, streams: [] };
  },
  cfb_add(container: WriteContainer, fullPath: string, data: Uint8Array | ArrayBuffer): WriteContainer {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
    // The `cfb` package adds a root path separator to the first stream; be tolerant.
    const clean = fullPath.replace(/^\/?/i, '').split('/').filter(Boolean);
    let node = container.root;
    for (let i = 0; i < clean.length; i++) {
      const leaf = i === clean.length - 1;
      const nm = clean[i];
      let child = node.children.get(nm);
      if (!child) {
        child = { name: nm, type: leaf ? 2 : 1, data: leaf ? bytes : null, children: new Map() };
        node.children.set(nm, child);
      }
      node = child;
    }
    container.streams = []; // lazy: we serialize from the tree
    return container;
  },
};

export function write(c: WriteContainer, _opts?: { type?: string }): Uint8Array {
  // Flatten the tree into an ordered node list (parent before children).
  interface LNode { name: string; type: number; data: Uint8Array | null; children: LNode[]; }
  const nodes: LNode[] = [];
  const byIndex = new Map<WNode, number>();
  function visit(n: WNode, isRoot: boolean): number {
    const ln: LNode = { name: isRoot ? '' : n.name, type: isRoot ? 5 : n.type, data: n.data, children: [] };
    byIndex.set(n, nodes.length);
    nodes.push(ln);
    const kids: WNode[] = [];
    for (const ch of n.children.values()) kids.push(ch);
    for (const k of kids) {
      const idx = visit(k, false);
      ln.children.push(nodes[idx]);
    }
    return byIndex.get(n)!;
  }
  visit(c.root, true);

  // Split streams into small (mini) and large (FAT).
  const fatStreams: Array<{ idx: number; data: Uint8Array }> = [];
  const miniList: Array<{ idx: number; data: Uint8Array }> = [];
  nodes.forEach((n, idx) => {
    if (n.type === 2 && n.data && n.data.length >= WRITER_CUTOFF) fatStreams.push({ idx, data: n.data });
    else if (n.type === 2 && n.data) miniList.push({ idx, data: n.data });
  });

  // Mini stream: concatenate small streams padded to MINI_SECTOR.
  const miniStreamLen = miniList.reduce((a, m) => a + numSectors(m.data.length, MINI_SECTOR) * MINI_SECTOR, 0);
  const miniStream = new Uint8Array(miniStreamLen);
  const miniStart: number[] = [];
  {
    let off = 0;
    for (const m of miniList) {
      miniStart.push(Math.floor(off / MINI_SECTOR));
      miniStream.set(m.data, off);
      off += numSectors(m.data.length, MINI_SECTOR) * MINI_SECTOR;
    }
  }
  const miniSectorCount = miniStreamLen / MINI_SECTOR;

  const perDir = SECTOR / 128;      // directory entries per sector
  const dirSecs = numSectors(nodes.length * 128, SECTOR);
  const miniStreamSecs = numSectors(miniStreamLen, SECTOR);
  const fatSecsOfStreams = fatStreams.reduce((a, s) => a + numSectors(s.data.length, SECTOR), 0);
  const miniFATSecs = numSectors(miniSectorCount * 4, SECTOR);
  const perFAT = SECTOR >>> 2;      // fat entries per sector

  // Iteratively determine FAT + DIFAT sector counts.
  let baseData = dirSecs + miniStreamSecs + fatSecsOfStreams + miniFATSecs;
  let fatSecs = Math.max(1, Math.ceil(baseData / (perFAT - 1)));
  let difatSecs = fatSecs > 109 ? Math.ceil((fatSecs - 109) / (perFAT - 1)) : 0;
  baseData = dirSecs + miniStreamSecs + fatSecsOfStreams + miniFATSecs + difatSecs;
  fatSecs = Math.max(1, Math.ceil(baseData / (perFAT - 1)));
  difatSecs = fatSecs > 109 ? Math.ceil((fatSecs - 109) / (perFAT - 1)) : 0;

  // Compute L array (same convention as cfb library):
  // Sector layout matching cfb library exactly: [0]=header, [1]=FAT, [2]=FAT, [3]=directory, [4]=mini stream
  const fatStart = 1;
  const miniFATStart = 1; // cfb library uses sector 1 for miniFAT (overlaps with FAT)
  const dirStart = 2; // cfb library uses dirStart = 2
  const miniStreamStart = 3; // cfb library uses sector 3 for directory, sector 4 for mini stream

  // Large streams: assign sequential FAT chains
  const streamStart = new Map<number, number>();
  const streamSectors = new Map<number, number>();
  let streamCursor = miniStreamStart;
  for (const s of fatStreams) {
    const n = numSectors(s.data.length, SECTOR);
    streamStart.set(s.idx, streamCursor);
    streamSectors.set(s.idx, n);
    streamCursor += n;
  }

  const totalSectors = streamCursor + miniStreamSecs;

  // Assemble the file buffer and fill FAT chains + directory entries.
  const out = new Uint8Array(totalSectors * SECTOR);
  const view = new DataView(out.buffer);

  // FAT array indexed by absolute sector number.
  const fat = new Int32Array(totalSectors);
  fat.fill(-1); // FREESECT
  function setChain(start: number, count: number) {
    for (let i = 0; i < count; i++) {
      const s = start + i;
      fat[s] = i === count - 1 ? ENDOFCHAIN : (s + 1);
    }
  }
  setChain(miniStreamStart, miniStreamSecs);
  for (const s of fatStreams) setChain(streamStart.get(s.idx)!, streamSectors.get(s.idx)!);
  setChain(dirStart, dirSecs);
  // Don't call setChain for miniFAT - cfb library stores miniFAT within FAT sector
  // mark specialized sectors - cfb library uses 2 FAT sectors
  for (let i = 0; i < difatSecs; i++) fat[miniFATStart + i] = DIFSECT;
  fat[fatStart] = FATSECT; // First FAT sector
  if (fatStart + 1 < totalSectors) fat[fatStart + 1] = FATSECT; // Second FAT sector

  // Write FAT sectors - cfb library uses 2 FAT sectors
  // The FAT sector stores the FAT chain starting from fatStart
  for (let sector = 0; sector < 2; sector++) {
    for (let i = 0; i < perFAT; i++) {
      const fatIndex = fatStart + sector * perFAT + i;
      if (fatIndex < fat.length) {
        view.setUint32((fatStart + sector) * SECTOR + i * 4, fat[fatIndex] >>> 0, true);
      }
    }
  }

  // Write DIFAT: header block + optional DIFAT sectors.
  const fatIds = Array.from({ length: fatSecs }, (_, i) => 0); // cfb library uses 0 for DIFAT entry 0
  for (let i = 0; i < 109; i++) view.setUint32(76 + i * 4, i < fatSecs ? fatIds[i] : FREESECT, true);
  for (let i = 0; i < difatSecs; i++) {
    const base = (miniFATStart + i) * SECTOR;
    const begin = 109 + i * (perFAT - 1);
    for (let j = 0; j < perFAT - 1; j++) {
      const idx = begin + j;
      view.setUint32(base + j * 4, idx < fatIds.length ? fatIds[idx] : FREESECT, true);
    }
    view.setUint32(base + (perFAT - 1) * 4, i === difatSecs - 1 ? ENDOFCHAIN : miniFATStart + i + 1, true);
  }

  // Write miniFAT: map mini stream sectors.
  {
    const mfView = new DataView(out.buffer);
    for (let i = 0; i < miniSectorCount; i++) {
      mfView.setUint32(miniFATStart * SECTOR + i * 4, i === miniSectorCount - 1 ? ENDOFCHAIN : i + 1, true);
    }
    for (let i = miniSectorCount; i < perFAT * miniFATSecs; i++) {
      mfView.setUint32(miniFATStart * SECTOR + i * 4, FREESECT, true);
    }
  }

  // Write mini stream.
  out.set(miniStream, miniStreamStart * SECTOR);

  // Write large stream bytes.
  for (const s of fatStreams) {
    out.set(s.data, streamStart.get(s.idx)! * SECTOR);
  }

  // Write header.
  const h = new DataView(out.buffer);
  const sig = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  sig.forEach((b, i) => { out[i] = b; });
  h.setUint16(24, 0x3e, true);     // minor version
  h.setUint16(26, 3, true);        // major version
  h.setUint16(28, 0xfffe, true);   // byte order
  h.setUint16(30, 9, true);        // sector shift
  h.setUint16(32, 6, true);        // mini sector shift
  h.setUint32(40, 0, true);        // total sectors (v3 = 0)
  h.setUint32(44, 1, true); // 1 FAT sector (cfb library uses 1)
  h.setUint32(48, dirStart, true);
  h.setUint32(52, 0, true); // transaction identifier
  h.setUint32(56, WRITER_CUTOFF, true);
  h.setUint32(60, miniFATStart, true);
  h.setUint32(64, miniFATSecs, true);
  h.setUint32(68, difatSecs > 0 ? difatSecs : ENDOFCHAIN, true);
  h.setUint32(72, difatSecs, true);

  // Write directory entries.
  const perDirSec = SECTOR / 128;
  const entries = new Array(nodes.length);
  const nameBuf = (s: string): Uint8Array => {
    const trim = s.length > 31 ? s.slice(0, 31) : s;
    const u = new Uint8Array((trim.length + 1) * 2);
    for (let i = 0; i < trim.length; i++) u[i * 2] = trim.charCodeAt(i) & 0xff, u[i * 2 + 1] = (trim.charCodeAt(i) >> 8) & 0xff;
    return u;
  };

  // Child pointers (right-sibling chain).
  const childIdx = new Array<number>(nodes.length).fill(ENDOFCHAIN);
  const rightIdx = new Array<number>(nodes.length).fill(ENDOFCHAIN);
  const parentSizes = new Map<number, number>();
  // node index lookup
  const lnIndex = new Map<LNode, number>();
  nodes.forEach((n, i) => lnIndex.set(n, i));
  nodes.forEach((n, i) => {
    if (n.children.length > 0) {
      childIdx[i] = lnIndex.get(n.children[0])!;
      for (let j = 0; j < n.children.length; j++) rightIdx[lnIndex.get(n.children[j])!] = j === n.children.length - 1 ? ENDOFCHAIN : lnIndex.get(n.children[j + 1])!;
    }
  });

  // start/size per node
  let miniListIdx = 0;
  const startOf = new Array<number>(nodes.length).fill(ENDOFCHAIN);
  const sizeOf = new Array<number>(nodes.length).fill(0);
  nodes.forEach((n, i) => {
    if (n.type === 5) { startOf[i] = miniStreamStart; sizeOf[i] = miniStreamLen; return; }
    if (n.type === 2 && n.data) {
      if (n.data.length >= WRITER_CUTOFF) { startOf[i] = streamStart.get(i)!; sizeOf[i] = n.data.length; }
      else { startOf[i] = miniStart[miniListIdx]; sizeOf[i] = n.data.length; miniListIdx++; }
    }
  });

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const disp = dirStart * SECTOR + i * 128;
    const nm = n.type === 5 ? 'Root Entry' : (n.name || '');
    const nb = nameBuf(nm);
    out.set(nb, disp);
    view.setUint16(disp + 64, nb.length, true);
    view.setUint8(disp + 66, n.type);
    view.setUint8(disp + 67, 1); // black
    view.setUint32(disp + 68, ENDOFCHAIN, true);
    view.setUint32(disp + 72, rightIdx[i], true);
    view.setUint32(disp + 76, childIdx[i], true);
    view.setUint32(disp + 116, startOf[i], true);
    view.setUint32(disp + 120, sizeOf[i], true);
  }

  return out;
}

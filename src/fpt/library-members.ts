// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
import type { CFBContainer, CFBEntry } from './cfb-io';
import type { ExternalReference } from './external-references';

export type LibraryMemberKind = 'image' | 'sound' | 'model' | 'font' | 'script' | 'unknown';

/** A native FPL member. `data` is the FDAT payload and is never decoded here. */
export interface LibraryMember {
  name: string;
  kind: LibraryMemberKind;
  type: number;
  sourcePath: string | null;
  data: Uint8Array;
}

export interface LibraryMemberIssue {
  memberPath: string;
  code: 'missing-ftyp' | 'missing-fdat' | 'unsupported-type' | 'malformed-member' | 'duplicate-member';
}

export interface LibraryMemberInventory {
  members: LibraryMember[];
  issues: LibraryMemberIssue[];
  /** Complete for recognized root member storages only; payloads are not decoded. */
  coverage: 'complete-recognized-members' | 'partial';
}

export interface LibraryInventory {
  libraryPath: string;
  inventory: LibraryMemberInventory;
}

export type MemberResolutionStatus =
  | 'resolved-member'
  | 'missing-member'
  | 'ambiguous-member'
  | 'member-type-mismatch';

export interface MemberResolution {
  reference: ExternalReference;
  status: MemberResolutionStatus;
  candidates: LibraryMember[];
}

const ROOT = 'Root Entry';
const KIND_BY_TYPE: Readonly<Record<number, LibraryMemberKind>> = {
  1: 'image',
  2: 'sound',
  4: 'model',
  5: 'font',
  6: 'script',
};

/** Fold ASCII only; non-ASCII names keep their exact spelling. */
function asciiLower(value: string): string {
  return value.replace(/[A-Z]/g, char => char.toLowerCase());
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function decodeSourcePath(bytes: Uint8Array): string | null {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/\0+$/, '');
  return text.length > 0 ? text : null;
}

/**
 * Inventory root-level FPL member storages (FTYP/FLAD/FPAT/FDAT children).
 * Unrelated streams and nested storages are ignored. Payloads stay opaque.
 */
export function readLibraryMembers(container: CFBContainer): LibraryMemberInventory {
  const streamsByParent = new Map<string, Map<string, CFBEntry>>();
  const malformedParents = new Set<string>();
  container.FileIndex.forEach((entry, index) => {
    if (entry.type !== 2) return;
    const path = container.FullPaths[index];
    const slash = path.lastIndexOf('/');
    if (slash < 0) return;
    const parent = path.slice(0, slash);
    const leaf = path.slice(slash + 1);
    const streams = streamsByParent.get(parent) ?? new Map<string, CFBEntry>();
    if (streams.has(leaf)) malformedParents.add(parent);
    else streams.set(leaf, entry);
    streamsByParent.set(parent, streams);
  });

  const members: LibraryMember[] = [];
  const issues: LibraryMemberIssue[] = [];
  container.FileIndex.forEach((entry, index) => {
    if (entry.type !== 1) return;
    const path = container.FullPaths[index];
    if (!path.startsWith(`${ROOT}/`) || path.slice(ROOT.length + 1).includes('/')) return;
    const streams = streamsByParent.get(path);
    if (!streams) return;
    const ftyp = streams.get('FTYP');
    const fdat = streams.get('FDAT');
    if (!ftyp || !fdat || (ftyp.content?.byteLength ?? 0) < 4) {
      issues.push({ memberPath: path, code: !ftyp ? 'missing-ftyp' : !fdat ? 'missing-fdat' : 'malformed-member' });
      return;
    }
    const type = new DataView(ftyp.content.buffer, ftyp.content.byteOffset, ftyp.content.byteLength)
      .getUint32(0, true);
    const kind = KIND_BY_TYPE[type];
    if (!kind) issues.push({ memberPath: path, code: 'unsupported-type' });
    if (malformedParents.has(path)) issues.push({ memberPath: path, code: 'malformed-member' });
    const fpat = streams.get('FPAT');
    members.push({
      name: entry.name,
      kind: kind ?? 'unknown',
      type,
      sourcePath: fpat ? decodeSourcePath(fpat.content) : null,
      data: fdat.content,
    });
  });

  const nameCounts = new Map<string, number>();
  for (const member of members) {
    const key = asciiLower(member.name);
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }
  for (const member of members) {
    if ((nameCounts.get(asciiLower(member.name)) ?? 0) > 1) {
      issues.push({ memberPath: `${ROOT}/${member.name}`, code: 'duplicate-member' });
    }
  }

  members.sort((a, b) => compareText(a.name, b.name));
  issues.sort((a, b) => compareText(a.memberPath, b.memberPath) || compareText(a.code, b.code));
  return {
    members,
    issues,
    coverage: issues.length === 0 ? 'complete-recognized-members' : 'partial',
  };
}

function normalizeLibraryPath(path: string): string {
  return asciiLower(path.replace(/\\/g, '/'));
}

function compareMembers(a: LibraryMember, b: LibraryMember): number {
  return compareText(a.name, b.name)
    || compareText(a.sourcePath ?? '', b.sourcePath ?? '')
    || a.type - b.type;
}

function memberCandidates(reference: ExternalReference, members: readonly LibraryMember[]): LibraryMember[] {
  const components = reference.memberPath.split(/[\\/]/);
  if (components.length !== 1) return [];
  const leaf = components[0];
  if (!leaf || /[\x00-\x1f\x7f-\x9f]/.test(leaf)) return [];
  const dot = leaf.lastIndexOf('.');
  const stem = dot > 0 ? leaf.slice(0, dot) : leaf;
  const exact = asciiLower(leaf);
  const normalizedStem = asciiLower(stem);
  const matches = members.filter(member => {
    const name = asciiLower(member.name);
    return name === exact || name === normalizedStem;
  });
  return matches.sort(compareMembers);
}

/**
 * Match external references against already-read library inventories.
 *
 * Member presence is not payload decoding, hydration or gameplay support.
 * Duplicate normalized library paths are a caller configuration error.
 */
export function resolveLibraryMembers(
  references: readonly ExternalReference[],
  libraries: readonly LibraryInventory[],
): MemberResolution[] {
  const inventories = new Map<string, LibraryMemberInventory>();
  for (const library of libraries) {
    const key = normalizeLibraryPath(library.libraryPath);
    if (!key) throw new Error(`Invalid library inventory path: ${library.libraryPath}`);
    if (inventories.has(key)) throw new Error(`Duplicate library inventory path: ${library.libraryPath}`);
    inventories.set(key, library.inventory);
  }

  return references.map(reference => {
    const inventory = inventories.get(normalizeLibraryPath(reference.libraryPath));
    if (!inventory) return { reference, status: 'missing-member', candidates: [] };
    const candidates = memberCandidates(reference, inventory.members);
    if (candidates.length === 0) return { reference, status: 'missing-member', candidates };
    if (candidates.length > 1) return { reference, status: 'ambiguous-member', candidates };
    return {
      reference,
      status: candidates[0].kind === reference.kind ? 'resolved-member' : 'member-type-mismatch',
      candidates,
    };
  });
}

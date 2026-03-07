/**
 * MS3D (Milkshape 3D) Format Parser
 *
 * Parses MS3D binary files extracted from FPT (Future Pinball Table) files.
 * MS3D is a lightweight 3D model format used by Future Pinball for game geometry.
 *
 * Format: Binary format with vertices, triangles, materials, and bones
 * Used for: Bumpers, targets, flippers, ramps, decorative elements
 */

import * as THREE from 'three';

export interface MS3DVertex {
  position: [number, number, number];
  normal: [number, number, number];
  texCoords: [number, number];
  boneID: number;
}

export interface MS3DTriangle {
  vertexIndices: [number, number, number];
  vertexNormals: [[number, number, number], [number, number, number], [number, number, number]];
  texCoords: [[number, number], [number, number], [number, number]];
  smoothingGroup: number;
  materialID: number;
}

export interface MS3DMaterial {
  name: string;
  ambient: [number, number, number, number];
  diffuse: [number, number, number, number];
  specular: [number, number, number, number];
  emissive: [number, number, number, number];
  shininess: number;
  transparency: number;
  mode: number;
  textureFile: string;
  alphaFile: string;
}

export interface MS3DModel {
  vertices: MS3DVertex[];
  triangles: MS3DTriangle[];
  materials: MS3DMaterial[];
  name: string;
}

/**
 * Parse MS3D binary format
 * Returns null if parsing fails
 */
export function parseMS3D(bytes: Uint8Array): MS3DModel | null {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
    let offset = 0;

    // ─── Read Magic & Version ───
    const magic = readString(bytes, offset, 4);
    offset += 4;

    if (magic !== 'MS3D') {
      console.warn('Invalid MS3D file: missing magic header');
      return null;
    }

    const version = view.getUint32(offset, true);
    offset += 4;

    if (version !== 4) {
      console.warn(`MS3D version ${version} may not be fully supported (tested with v4)`);
    }

    // ─── Read Vertices ───
    const vertexCount = view.getUint16(offset, true);
    offset += 2;

    const vertices: MS3DVertex[] = [];
    for (let i = 0; i < vertexCount; i++) {
      const x = view.getFloat32(offset, true); offset += 4;
      const y = view.getFloat32(offset, true); offset += 4;
      const z = view.getFloat32(offset, true); offset += 4;

      const nx = view.getFloat32(offset, true); offset += 4;
      const ny = view.getFloat32(offset, true); offset += 4;
      const nz = view.getFloat32(offset, true); offset += 4;

      const u = view.getFloat32(offset, true); offset += 4;
      const v = view.getFloat32(offset, true); offset += 4;

      const boneID = view.getUint8(offset);
      offset += 1;

      vertices.push({
        position: [x, y, z],
        normal: [nx, ny, nz],
        texCoords: [u, v],
        boneID,
      });
    }

    // ─── Read Triangles ───
    const triangleCount = view.getUint16(offset, true);
    offset += 2;

    const triangles: MS3DTriangle[] = [];
    for (let i = 0; i < triangleCount; i++) {
      const flags = view.getUint16(offset, true); offset += 2;

      const i1 = view.getUint16(offset, true); offset += 2;
      const i2 = view.getUint16(offset, true); offset += 2;
      const i3 = view.getUint16(offset, true); offset += 2;

      // Read vertex normals
      const n1x = view.getFloat32(offset, true); offset += 4;
      const n1y = view.getFloat32(offset, true); offset += 4;
      const n1z = view.getFloat32(offset, true); offset += 4;

      const n2x = view.getFloat32(offset, true); offset += 4;
      const n2y = view.getFloat32(offset, true); offset += 4;
      const n2z = view.getFloat32(offset, true); offset += 4;

      const n3x = view.getFloat32(offset, true); offset += 4;
      const n3y = view.getFloat32(offset, true); offset += 4;
      const n3z = view.getFloat32(offset, true); offset += 4;

      // Read texture coordinates
      const u1 = view.getFloat32(offset, true); offset += 4;
      const v1 = view.getFloat32(offset, true); offset += 4;

      const u2 = view.getFloat32(offset, true); offset += 4;
      const v2 = view.getFloat32(offset, true); offset += 4;

      const u3 = view.getFloat32(offset, true); offset += 4;
      const v3 = view.getFloat32(offset, true); offset += 4;

      const smoothingGroup = view.getUint8(offset);
      offset += 1;

      const materialID = view.getUint8(offset);
      offset += 1;

      triangles.push({
        vertexIndices: [i1, i2, i3],
        vertexNormals: [[n1x, n1y, n1z], [n2x, n2y, n2z], [n3x, n3y, n3z]],
        texCoords: [[u1, v1], [u2, v2], [u3, v3]],
        smoothingGroup,
        materialID,
      });
    }

    // ─── Read Materials ───
    const materialCount = view.getUint8(offset);
    offset += 1;

    const materials: MS3DMaterial[] = [];
    for (let i = 0; i < materialCount; i++) {
      const name = readString(bytes, offset, 32);
      offset += 32;

      const ar = view.getFloat32(offset, true); offset += 4;
      const ag = view.getFloat32(offset, true); offset += 4;
      const ab = view.getFloat32(offset, true); offset += 4;
      const aa = view.getFloat32(offset, true); offset += 4;

      const dr = view.getFloat32(offset, true); offset += 4;
      const dg = view.getFloat32(offset, true); offset += 4;
      const db = view.getFloat32(offset, true); offset += 4;
      const da = view.getFloat32(offset, true); offset += 4;

      const sr = view.getFloat32(offset, true); offset += 4;
      const sg = view.getFloat32(offset, true); offset += 4;
      const sb = view.getFloat32(offset, true); offset += 4;
      const sa = view.getFloat32(offset, true); offset += 4;

      const er = view.getFloat32(offset, true); offset += 4;
      const eg = view.getFloat32(offset, true); offset += 4;
      const eb = view.getFloat32(offset, true); offset += 4;
      const ea = view.getFloat32(offset, true); offset += 4;

      const shininess = view.getFloat32(offset, true); offset += 4;
      const transparency = view.getFloat32(offset, true); offset += 4;
      const mode = view.getUint8(offset); offset += 1;

      const textureFile = readString(bytes, offset, 128);
      offset += 128;

      const alphaFile = readString(bytes, offset, 128);
      offset += 128;

      materials.push({
        name,
        ambient: [ar, ag, ab, aa],
        diffuse: [dr, dg, db, da],
        specular: [sr, sg, sb, sa],
        emissive: [er, eg, eb, ea],
        shininess,
        transparency,
        mode,
        textureFile,
        alphaFile,
      });
    }

    return {
      vertices,
      triangles,
      materials,
      name: 'MS3DModel',
    };
  } catch (error) {
    console.warn('Failed to parse MS3D:', error);
    return null;
  }
}

/**
 * Convert MS3D model to Three.js Mesh
 */
export function ms3dToThreeJS(model: MS3DModel): THREE.Mesh | null {
  try {
    const geometry = new THREE.BufferGeometry();

    // ─── Build Vertex Data ───
    const positions: number[] = [];
    const normals: number[] = [];
    const texCoords: number[] = [];

    // Simple approach: one vertex per triangle vertex (no index sharing for now)
    for (const triangle of model.triangles) {
      const [i1, i2, i3] = triangle.vertexIndices;
      const v1 = model.vertices[i1];
      const v2 = model.vertices[i2];
      const v3 = model.vertices[i3];

      // Add positions
      positions.push(...v1.position, ...v2.position, ...v3.position);

      // Add normals (use vertex normals from triangle)
      normals.push(...triangle.vertexNormals[0], ...triangle.vertexNormals[1], ...triangle.vertexNormals[2]);

      // Add texture coordinates
      texCoords.push(...triangle.texCoords[0], ...triangle.texCoords[1], ...triangle.texCoords[2]);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(texCoords), 2));

    // ─── Create Material ───
    const material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.3,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });

    // ─── Create Mesh ───
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  } catch (error) {
    console.warn('Failed to convert MS3D to Three.js:', error);
    return null;
  }
}

/**
 * Helper: Read null-terminated string from bytes
 */
function readString(bytes: Uint8Array, offset: number, maxLength: number): string {
  let length = 0;
  while (length < maxLength && bytes[offset + length] !== 0) {
    length++;
  }
  return new TextDecoder().decode(bytes.slice(offset, offset + length));
}

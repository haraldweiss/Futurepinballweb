import * as THREE from 'three';

/**
 * PlayfieldMeshBuilder - Builds detailed playfield geometry with subtle surface details
 * Replaces simple BoxGeometry with subdivided mesh and procedural details
 */

export interface BumperPosition {
  x: number;
  y: number;
  radius: number;
}

export interface TargetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class PlayfieldMeshBuilder {
  private width: number = 6;
  private length: number = 12;
  private height: number = 0.25;
  private subdivisions: number = 16;  // 16×32 grid
  private detailScale: number = 0.005; // Height variation ±0.005 units

  /**
   * Build a detailed playfield mesh
   */
  buildDetailedPlayfield(
    bumperPositions: BumperPosition[] = [],
    targetPositions: TargetPosition[] = []
  ): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    // Create subdivided grid
    const { positions, normals, uvs } = this.createSubdividedPlane(
      this.width,
      this.length,
      this.subdivisions,
      bumperPositions,
      targetPositions
    );

    // Set geometry attributes
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    // Compute tangents for normal mapping
    this.computeTangents(geometry);

    return geometry;
  }

  /**
   * Create a subdivided plane with procedural surface details
   */
  private createSubdividedPlane(
    w: number,
    l: number,
    subdiv: number,
    bumpers: BumperPosition[],
    targets: TargetPosition[]
  ): { positions: Float32Array; normals: Float32Array; uvs: Float32Array } {
    const vertices: number[] = [];
    const normalList: number[] = [];
    const uvList: number[] = [];

    // Create grid
    const vertexCount = (subdiv + 1) * (subdiv * 2 + 1);
    const posArray = new Float32Array(vertexCount * 3);
    const normArray = new Float32Array(vertexCount * 3);
    const uvArray = new Float32Array(vertexCount * 2);

    let vertexIdx = 0;

    // Generate vertices
    for (let i = 0; i <= subdiv; i++) {
      for (let j = 0; j <= subdiv * 2; j++) {
        // Normalized position
        const u = i / subdiv;  // 0 to 1 (width)
        const v = j / (subdiv * 2);  // 0 to 1 (length)

        // World position
        const x = (u - 0.5) * w;
        const y = (v - 0.5) * l;
        let z = 0;

        // Add procedural height variations
        z += this.getProceduralHeight(x, y, bumpers, targets);

        // Store position
        posArray[vertexIdx * 3] = x;
        posArray[vertexIdx * 3 + 1] = y;
        posArray[vertexIdx * 3 + 2] = z;

        // Store UV (will be updated with normal map scaling)
        uvArray[vertexIdx * 2] = u;
        uvArray[vertexIdx * 2 + 1] = v;

        vertexIdx++;
      }
    }

    // Calculate normals using Sobel-like filter
    this.calculateNormals(posArray, normArray, subdiv);

    return {
      positions: posArray,
      normals: normArray,
      uvs: uvArray,
    };
  }

  /**
   * Get procedural height for a position
   * Combines bumper depressions, target indentations, and noise detail
   */
  private getProceduralHeight(
    x: number,
    y: number,
    bumpers: BumperPosition[],
    targets: TargetPosition[]
  ): number {
    let height = 0;

    // Bumper depressions (circular indentations)
    for (const bumper of bumpers) {
      const dx = x - bumper.x;
      const dy = y - bumper.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = bumper.radius * 1.2; // Slightly larger than bumper

      if (dist < radius) {
        // Smooth depression using cosine falloff
        const falloff = Math.cos((dist / radius) * Math.PI * 0.5);
        height -= falloff * this.detailScale;
      }
    }

    // Target indentations (rectangular depressions)
    for (const target of targets) {
      const dx = Math.abs(x - target.x);
      const dy = Math.abs(y - target.y);
      const w = target.width * 0.6;
      const h = target.height * 0.6;

      if (dx < w && dy < h) {
        // Smooth corners
        const fx = (1 - dx / w) * 0.5 + 0.5;
        const fy = (1 - dy / h) * 0.5 + 0.5;
        const falloff = Math.min(fx, fy);
        height -= falloff * this.detailScale * 0.5;
      }
    }

    // Add procedural noise detail
    height += this.getNoiseDetail(x, y) * this.detailScale * 0.3;

    return height;
  }

  /**
   * Get Perlin-like noise value for position
   */
  private getNoiseDetail(x: number, y: number): number {
    let noise = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    // Multi-octave noise
    for (let octave = 0; octave < 3; octave++) {
      const sx = x * frequency * 2;
      const sy = y * frequency * 2;

      // Simple sine-based pseudo-noise
      const n = Math.sin(sx * 12.9898 + sy * 78.233) * 43758.5453;
      const value = (n - Math.floor(n)) * 2 - 1; // -1 to 1

      noise += value * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return maxValue > 0 ? noise / maxValue : 0;
  }

  /**
   * Calculate normals from positions using central difference
   */
  private calculateNormals(positions: Float32Array, normals: Float32Array, subdiv: number): void {
    const stride = (subdiv * 2 + 1);

    // Initialize normals to zero
    for (let i = 0; i < normals.length; i++) {
      normals[i] = 0;
    }

    // Face normals contribution
    for (let i = 0; i < subdiv; i++) {
      for (let j = 0; j < subdiv * 2; j++) {
        const i0 = i * stride + j;
        const i1 = i * stride + j + 1;
        const i2 = (i + 1) * stride + j;
        const i3 = (i + 1) * stride + j + 1;

        // First triangle: i0, i1, i2
        this.addFaceNormal(positions, normals, i0, i1, i2);

        // Second triangle: i1, i3, i2
        this.addFaceNormal(positions, normals, i1, i3, i2);
      }
    }

    // Normalize all normals
    for (let i = 0; i < normals.length; i += 3) {
      const nx = normals[i];
      const ny = normals[i + 1];
      const nz = normals[i + 2];
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);

      if (length > 0) {
        normals[i] /= length;
        normals[i + 1] /= length;
        normals[i + 2] /= length;
      } else {
        // Default up normal
        normals[i] = 0;
        normals[i + 1] = 0;
        normals[i + 2] = 1;
      }
    }
  }

  /**
   * Add face normal contribution to vertices
   */
  private addFaceNormal(positions: Float32Array, normals: Float32Array, i0: number, i1: number, i2: number): void {
    // Get positions
    const p0 = new THREE.Vector3(positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]);
    const p1 = new THREE.Vector3(positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]);
    const p2 = new THREE.Vector3(positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]);

    // Calculate face normal
    const v1 = new THREE.Vector3().subVectors(p1, p0);
    const v2 = new THREE.Vector3().subVectors(p2, p0);
    const faceNormal = new THREE.Vector3().crossVectors(v1, v2);

    // Add to vertex normals
    normals[i0 * 3] += faceNormal.x;
    normals[i0 * 3 + 1] += faceNormal.y;
    normals[i0 * 3 + 2] += faceNormal.z;

    normals[i1 * 3] += faceNormal.x;
    normals[i1 * 3 + 1] += faceNormal.y;
    normals[i1 * 3 + 2] += faceNormal.z;

    normals[i2 * 3] += faceNormal.x;
    normals[i2 * 3 + 1] += faceNormal.y;
    normals[i2 * 3 + 2] += faceNormal.z;
  }

  /**
   * Compute tangents for normal mapping
   * Uses Mikktspace-like approach
   */
  private computeTangents(geometry: THREE.BufferGeometry): void {
    const positions = geometry.getAttribute('position').array as Float32Array;
    const normals = geometry.getAttribute('normal').array as Float32Array;
    const uvs = geometry.getAttribute('uv').array as Float32Array;

    const tangents = new Float32Array(positions.length);

    // Simple tangent calculation
    // For a flat plane, tangent is typically along X axis
    const count = positions.length / 3;
    for (let i = 0; i < count; i++) {
      tangents[i * 3] = 1;      // X direction
      tangents[i * 3 + 1] = 0;
      tangents[i * 3 + 2] = 0;
      // w component would be at tangents[i * 4 + 3] = 1 (for handedness)
    }

    geometry.setAttribute('tangent', new THREE.BufferAttribute(tangents, 3));
  }

  /**
   * Extract bumper positions from game state
   */
  static extractBumperPositions(bumpers: any[]): BumperPosition[] {
    return bumpers.map(b => ({
      x: b.pos?.x || 0,
      y: b.pos?.y || 0,
      radius: b.size || 0.45,
    })).filter(b => b.x !== 0 || b.y !== 0);
  }

  /**
   * Extract target positions from game state
   */
  static extractTargetPositions(targets: any[]): TargetPosition[] {
    return targets.map(t => ({
      x: t.pos?.x || 0,
      y: t.pos?.y || 0,
      width: t.size?.x || 0.55,
      height: t.size?.y || 0.42,
    })).filter(t => t.x !== 0 || t.y !== 0);
  }
}

// Singleton instance
let builderInstance: PlayfieldMeshBuilder | null = null;

export function getPlayfieldMeshBuilder(): PlayfieldMeshBuilder {
  if (!builderInstance) {
    builderInstance = new PlayfieldMeshBuilder();
  }
  return builderInstance;
}

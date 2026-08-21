import * as THREE from 'three';
import type { BumperMesh, TargetMesh, RampData, ExtraBall, ParticleData } from '../types';

/** Named table element descriptor (mesh + playfield position). */
export interface ElementMesh {
  x: number;
  y: number;
  mesh: THREE.Mesh;
}

export const bumpers:    BumperMesh[] = [];
export const targets:    TargetMesh[] = [];
export const slingshots: Array<{ x: number; y: number; side: string }> = [];
export const ramps:      RampData[]   = [];
export const extraBalls: ExtraBall[]  = [];
export const partData:   ParticleData[] = [];
// Phase 6 physical elements — exposed to the VBScript engine via GetElement()
export const gates:      ElementMesh[] = [];
export const kickers:    ElementMesh[] = [];
export const spinners:   ElementMesh[] = [];
export const triggers:   ElementMesh[] = [];

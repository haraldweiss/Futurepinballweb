import * as THREE from 'three';
import type { PhysicsContext, TableConfig, FPLLibrary } from '../types';
import type { BAMEngine } from '../bam-engine';
import { AssetCatalog } from '../assets/asset-catalog';

export let physics:             PhysicsContext | null = null;
export let currentTableConfig:  TableConfig    | null = null;
export let tableGroup:          THREE.Group    | null = null;
export let plungerKnob:         THREE.Mesh     | null = null;
export let fpScriptHandlers:    Record<string, (...args: any[]) => any> = {};
export let loadedLibrary:       FPLLibrary     | null = null;
export let bamEngine:           BAMEngine      | null = null;

let _globalAssetCatalog: AssetCatalog | null = null;

export function setPhysics(p: PhysicsContext | null)       { physics            = p; }
export function setCurrentTableConfig(c: TableConfig|null) { currentTableConfig = c; }
export function setTableGroup(g: THREE.Group | null)       { tableGroup         = g; }
export function setPlungerKnob(m: THREE.Mesh | null)       { plungerKnob        = m; }
export function setFpScriptHandlers(h: Record<string, (...args: any[]) => any>) { fpScriptHandlers = h; }
export function setLoadedLibrary(lib: FPLLibrary | null)    { loadedLibrary      = lib; }
export function setBAMEngine(e: BAMEngine | null)           { bamEngine          = e; }
export function globalAssetCatalog(): AssetCatalog | null { return _globalAssetCatalog; }
export function setGlobalAssetCatalog(c: AssetCatalog | null): void { _globalAssetCatalog = c; }

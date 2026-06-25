/**
 * bam-init.ts — Factory to initialize B.A.M. Engine, bridge, animations,
 * binding system, animation debugger, quality preset, and animate loop.
 *
 * Extracted from main.ts async IIFE startup block (Phase 13 + Phase 5).
 */
import * as THREE from 'three';
import { BAMEngine } from '../bam-engine';
import { initializeBamBridge } from '../bam-bridge';
import { devLog } from '../utils/dev-log';
import { setDevFlag } from '../window-api';
import {
  currentTableConfig, fptResources, bamEngine, setBAMEngine,
} from '../game';
import { initializeAnimationBinding } from '../mechanics/animation-binding';
import { initializeAnimationScheduler } from '../mechanics/animation-scheduler';
import { initializeAnimationDebugger } from '../animation/animation-debugger';

export interface BAMInitDeps {
  mainSpot: THREE.SpotLight;
  applyQualityPreset: () => void;
  animate: () => void;
  inlineBackglass: { init: () => void };
}

/**
 * Initialize B.A.M. Engine and all related systems after a table is loaded.
 * Must be called after currentTableConfig and scene are fully set up.
 */
export function initializeBAMEngine(deps: BAMInitDeps): void {
  const { mainSpot, applyQualityPreset, animate, inlineBackglass } = deps;

  // ─── B.A.M. Engine ───
  if (import.meta.env.DEV) {
    setDevFlag('INIT_BAM_ENGINE_START', true);
    console.log('🔄 About to initialize B.A.M. Engine...');
  }
  const bam = new BAMEngine(currentTableConfig?.name || 'classic', mainSpot);
  setBAMEngine(bam);
  if (import.meta.env.DEV) {
    console.log('✅ B.A.M. Engine initialized');
    setDevFlag('INIT_BAM_ENGINE_OK', true);
  }

  // ─── BAM Bridge (connects VBScript to BAMEngine) ───
  setDevFlag('INIT_BAM_BRIDGE_START', true);
  initializeBamBridge(bam);
  if (import.meta.env.DEV) {
    console.log('✅ B.A.M. Bridge initialized');
    setDevFlag('INIT_BAM_BRIDGE_OK', true);
  }

  // ─── Load animations from FPT resources ───
  setDevFlag('INIT_ANIM_LOAD_START', true);
  if (fptResources.animations && fptResources.animations.size > 0) {
    const bamSequencer = bam.getAnimationSequencer();
    let loadedCount = 0;
    for (const [name, sequence] of fptResources.animations) {
      try {
        const seqId = loadedCount + 1;
        bamSequencer.loadSequence(seqId, JSON.stringify(sequence));
        loadedCount++;
        devLog(`📽️ Animation loaded: "${name}" (ID: ${seqId})`);
      } catch (e: any) {
        console.warn(`⚠️ Failed to load animation "${name}": ${e.message}`);
      }
    }
    if (loadedCount > 0) {
      devLog(`✅ ${loadedCount} animation(s) loaded into BAM engine`);
    }
  }
  setDevFlag('INIT_ANIM_LOAD_OK', true);

  // ─── Animation binding system ───
  if (import.meta.env.DEV) {
    setDevFlag('INIT_ANIM_BINDING_START', true);
    console.log('🔄 About to initialize animation binding...');
  }
  initializeAnimationBinding();
  initializeAnimationScheduler();
  if (import.meta.env.DEV) {
    console.log('✅ Animation binding system initialized');
    setDevFlag('INIT_ANIM_BINDING_OK', true);
  }

  // ─── Animation debugger (Ctrl+D to toggle) ───
  setDevFlag('INIT_ANIM_DEBUGGER_START', true);
  const animationDebugger = initializeAnimationDebugger();
  if (bamEngine) {
    animationDebugger.setBamEngine(bamEngine);
  }
  if (import.meta.env.DEV) {
    console.log('✅ Animation debugger initialized (Ctrl+D to toggle)');
    setDevFlag('INIT_ANIM_DEBUGGER_OK', true);
  }

  // ─── Apply initial quality preset ───
  setDevFlag('INIT_BEFORE_QUALITY_PRESET', true);
  try {
    applyQualityPreset();
    if (import.meta.env.DEV) {
      console.log('✅ Quality preset applied successfully');
      setDevFlag('INIT_QUALITY_PRESET_OK', true);
    }
  } catch (err) {
    console.error('❌ Error in applyQualityPreset:', err);
    setDevFlag('INIT_QUALITY_PRESET_ERROR', (err as Error).message);
  }

  // ─── Start animate loop ───
  setDevFlag('INIT_BEFORE_ANIMATE_CALL', true);
  try {
    if (import.meta.env.DEV) { console.log('🎬 Starting animate loop...'); }
    animate();
    if (import.meta.env.DEV) {
      setDevFlag('INIT_ANIMATE_CALLED', true);
      console.log('✅ Animate loop started');
    }
  } catch (err) {
    console.error('❌ Error starting animate:', err);
    setDevFlag('INIT_ANIMATE_ERROR', (err as Error).message);
  }
  inlineBackglass.init();
}

/**
 * graphics/pass-initializer.ts — Graphics Pass Initialization Utility
 * Provides a unified pattern for initializing graphics passes with error handling
 */

import { logMsg } from '../fpt-parser';

/**
 * Initialize a graphics pass with unified error handling and logging
 * @param name - Descriptive name for logging (e.g., "SSRPass", "MotionBlurPass")
 * @param enabled - Whether this pass is enabled in the quality preset
 * @param factory - Function that creates and returns the pass instance
 * @param setupFn - Optional function to configure the pass after creation
 * @returns The initialized pass, or null if disabled or initialization failed
 */
export function initializeGraphicsPass<T>(
  name: string,
  enabled: boolean,
  factory: () => T,
  setupFn?: (pass: T) => void
): T | null {
  if (!enabled) return null;

  try {
    const pass = factory();
    setupFn?.(pass);
    return pass;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logMsg(`❌ Failed to initialize ${name}: ${errorMessage}`, 'error');
    return null;
  }
}

/**
 * Batch initialize multiple graphics passes
 * Useful for initializing all Polish Suite passes at once
 */
export function initializeGraphicsPassBatch(
  passes: Array<{
    name: string;
    enabled: boolean;
    factory: () => any;
    setupFn?: (pass: any) => void;
  }>
): Map<string, any | null> {
  const results = new Map<string, any | null>();

  for (const pass of passes) {
    results.set(
      pass.name,
      initializeGraphicsPass(
        pass.name,
        pass.enabled,
        pass.factory,
        pass.setupFn
      )
    );
  }

  return results;
}

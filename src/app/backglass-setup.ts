/**
 * backglass-setup.ts — Backglass artwork/mode setup for table loading.
 *
 * Extracted from main.ts.
 */
import { state } from '../game';
import { getBackglassArtwork } from '../fpt-parser';
import type { BackglassRenderer } from '../backglass';

/**
 * Update backglass artwork and mode indicator for the current table.
 * @param getBackglassRenderer - Getter for the main-thread backglass renderer ref.
 */
export function setupBackglassForTable(
  getBackglassRenderer: () => BackglassRenderer | null
): void {
  const renderer = getBackglassRenderer();
  if (renderer) {
    const artwork = getBackglassArtwork();
    renderer.setArtwork(artwork);
    renderer.setModeIndicator(`BALL ${state.ballNum}/3`);
  }
}

/**
 * hud.ts — HUD (Heads-Up Display) update functions.
 *
 * Updates DOM elements with current game state (score, ball number, multiplier),
 * editor button visibility, and DMD mode transitions.
 * Pure module import extraction — no DI needed.
 *
 * Extracted from main.ts.
 */
import { state, currentTableConfig } from '../game';
import { dmdState } from '../dmd';

/**
 * Update the HUD display elements with current game state.
 */
export function updateHUD(): void {
  (document.getElementById('score') as HTMLElement).textContent   = state.score.toLocaleString();
  (document.getElementById('ballnum') as HTMLElement).textContent = String(state.ballNum);
  (document.getElementById('multi') as HTMLElement).textContent   = String(state.multiplier);

  // Update sequence display
  const seqDisplay = document.getElementById('sequence-display') as HTMLElement;
  if (state.targetSequence && state.targetSequence.length > 0) {
    seqDisplay.style.display = 'block';
    const seqProgress = document.getElementById('seq-progress') as HTMLElement;
    seqProgress.textContent = `${state.targetsHitSequence.length}/${state.targetSequence.length}`;
  } else {
    seqDisplay.style.display = 'none';
  }

  // Show/hide editor button based on whether a table is loaded
  const editorBtn = document.getElementById('editor-btn');
  if (editorBtn) {
    editorBtn.style.display = currentTableConfig ? 'inline-block' : 'none';
  }

  // Default DMD to 'playing' on HUD updates while a game is in progress.
  if (dmdState.mode === 'playing' || dmdState.mode === 'event' || dmdState.mode === 'gameover') {
    if (dmdState.mode !== 'event' && dmdState.mode !== 'gameover') dmdState.mode = 'playing';
  }
}

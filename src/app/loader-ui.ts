/**
 * loader-ui.ts — Loading overlay with phase-based progress tracking.
 *
 * Supports:
 * - Named phases with weighted progress (0-100%)
 * - Worker progress messages via updateWorkerProgress()
 * - Resource-level loading (textures, audio) via updateLoadingProgress()
 *
 * Phase weights determine how much each phase contributes to the bar:
 *   parsing-table    10%  (CFB, LZO, model extraction)
 *   loading-textures 25%  (texture decoding)
 *   loading-audio    15%  (audio decoding)
 *   building-scene   25%  (three.js geometry assembly)
 *   visuals          5%   (post-processing effects)
 *   building-physics 15%  (worker init + body creation)
 *   ready            5%   (final sync)
 */

export type LoadPhase =
  | 'parsing-table'
  | 'loading-textures'
  | 'loading-audio'
  | 'loading-scripts'
  | 'building-scene'
  | 'visuals'
  | 'building-physics'
  | 'ready'
  | 'unknown';

interface PhaseDef {
  label: string;
  icon: string;
  color: string;
  /** Weight 0-100, total of all phases should sum to 100 */
  weight: number;
}

const PHASES: Record<LoadPhase, PhaseDef> = {
  'parsing-table':    { label: 'Parsing table...',      icon: '📦', color: '#00aaff', weight: 10 },
  'loading-textures': { label: 'Loading textures...',   icon: '🖼️', color: '#00ff88', weight: 25 },
  'loading-audio':    { label: 'Loading audio...',      icon: '🎵', color: '#ffaa00', weight: 15 },
  'loading-scripts':  { label: 'Loading scripts...',    icon: '📜', color: '#0088ff', weight: 0 },
  'building-scene':   { label: 'Building scene...',     icon: '🏗️', color: '#ff66aa', weight: 25 },
  'visuals':          { label: 'Applying effects...',   icon: '✨', color: '#cc66ff', weight: 5 },
  'building-physics': { label: 'Building physics...',   icon: '⚙️', color: '#ff8800', weight: 15 },
  'ready':            { label: 'Ready!',                icon: '✅', color: '#00ff88', weight: 5 },
  'unknown':          { label: 'Processing...',         icon: '⏳', color: '#00aaff', weight: 0 },
};

interface LoaderState {
  isLoading: boolean;
  /** Current named phase */
  phase: LoadPhase;
  /** Progress within the current phase (0-1) */
  phaseProgress: number;
  /** Resource-level tracking */
  resourcesLoaded: number;
  totalResources: number;
  /** Worker detail message */
  workerDetail: string;
}

const state: LoaderState = {
  isLoading: false,
  phase: 'unknown',
  phaseProgress: 0,
  resourcesLoaded: 0,
  totalResources: 0,
  workerDetail: '',
};

/** Cumulative weight of all phases completed before a given phase */
function cumulativeWeightBefore(phase: LoadPhase): number {
  const ordered: LoadPhase[] = [
    'parsing-table', 'loading-textures', 'loading-audio', 'loading-scripts',
    'building-scene', 'visuals', 'building-physics', 'ready',
  ];
  let sum = 0;
  for (const p of ordered) {
    if (p === phase) break;
    sum += PHASES[p].weight;
  }
  return sum;
}

/** Calculate overall progress 0-100 based on current phase + progress within it */
function calcOverallProgress(): number {
  const def = PHASES[state.phase];
  const before = cumulativeWeightBefore(state.phase);
  const within = def.weight * state.phaseProgress;
  return Math.min(before + within, 100);
}

function render(): void {
  if (!state.isLoading) return;

  const def = PHASES[state.phase];
  const overall = calcOverallProgress();

  const phaseNameEl = document.getElementById('phase-name');
  if (phaseNameEl) {
    phaseNameEl.textContent = `${def.icon}  ${def.label}`;
    phaseNameEl.style.color = def.color;
  }

  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    progressBar.style.width = `${overall}%`;
    progressBar.style.background =
      state.phase === 'ready'
        ? 'linear-gradient(90deg,#00cc66,#00ff88)'
        : 'linear-gradient(90deg,#0088ff,#00ff88)';
  }

  const progressText = document.getElementById('progress-text');
  if (progressText) {
    progressText.textContent = `${Math.floor(overall)}%`;
  }

  const detailsEl = document.getElementById('loading-details');
  if (detailsEl) {
    const resourceInfo =
      state.totalResources > 0
        ? `<div style="color:#556;font-size:10px;margin-top:6px;">Resources: ${state.resourcesLoaded}/${state.totalResources}</div>`
        : '';
    const workerInfo = state.workerDetail
      ? `<div style="color:#ff8800;font-size:10px;margin-top:6px;">⚙️ ${state.workerDetail}</div>`
      : '';
    detailsEl.innerHTML = `
      <div style="color:${def.color};">Phase: ${def.label}</div>
      ${resourceInfo}
      ${workerInfo}
    `;
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

export function showLoadingOverlay(): void {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  state.isLoading = true;
  state.phase = 'parsing-table';
  state.phaseProgress = 0;
  state.resourcesLoaded = 0;
  state.totalResources = 0;
  state.workerDetail = '';
  render();

  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideLoadingOverlay();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}

export function hideLoadingOverlay(): void {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'none';
  state.isLoading = false;
  state.phase = 'unknown';
  state.phaseProgress = 0;
  state.resourcesLoaded = 0;
  state.totalResources = 0;
  state.workerDetail = '';
}

/** Switch to a named phase (resets phaseProgress to 0). */
export function setLoadPhase(phase: LoadPhase): void {
  if (!state.isLoading) return;
  state.phase = phase;
  state.phaseProgress = 0;
  state.resourcesLoaded = 0;
  state.totalResources = 0;
  state.workerDetail = '';
  render();
}

/** Set progress within the current phase (0-1). */
export function setPhaseProgress(progress: number): void {
  if (!state.isLoading) return;
  state.phaseProgress = Math.max(0, Math.min(1, progress));
  render();
}

/** Resource-level progress (legacy, for FPT texture/audio loading). */
export function updateLoadingProgress(phase: string, current: number, total: number): void {
  if (!state.isLoading) return;

  state.resourcesLoaded = current;
  state.totalResources = total;

  // Map legacy phase names to new LoadPhase
  if (phase === 'images') state.phase = 'loading-textures';
  else if (phase === 'audio') state.phase = 'loading-audio';
  else if (phase === 'scripts') state.phase = 'loading-scripts';

  // Convert resource progress to phase progress (0-1)
  if (total > 0) state.phaseProgress = current / total;
  render();
}

/** Show a detail message from the physics worker. */
export function setWorkerDetail(detail: string): void {
  if (!state.isLoading) return;
  state.workerDetail = detail;
  render();
}

/** Convenience: quickly step through phases (for sequential pipeline). */
export function advancePhase(phase: LoadPhase): void {
  setLoadPhase(phase);
  setPhaseProgress(0);
}

/** Mark the current phase as complete (sets progress to 1 within it). */
export function completePhase(): void {
  setPhaseProgress(1);
}

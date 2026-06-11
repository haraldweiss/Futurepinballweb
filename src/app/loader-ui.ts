const currentLoadingState = {
  isLoading: false,
  resourcesLoaded: 0,
  totalResources: 0,
  currentPhase: '',
};

export function showLoadingOverlay(): void {
  const overlay = document.getElementById('loading-overlay')!;
  overlay.style.display = 'flex';
  currentLoadingState.isLoading = true;

  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideLoadingOverlay();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}

export function hideLoadingOverlay(): void {
  const overlay = document.getElementById('loading-overlay')!;
  overlay.style.display = 'none';
  currentLoadingState.isLoading = false;
  currentLoadingState.resourcesLoaded = 0;
  currentLoadingState.totalResources = 0;
}

export function updateLoadingProgress(phase: string, current: number, total: number): void {
  if (!currentLoadingState.isLoading) return;

  currentLoadingState.resourcesLoaded = current;
  currentLoadingState.totalResources = total;
  currentLoadingState.currentPhase = phase;

  const phaseNameEl = document.getElementById('phase-name')!;
  const phaseText = phase === 'images' ? '🖼️ Loading Textures'
                   : phase === 'audio' ? '🎵 Loading Audio'
                   : phase === 'scripts' ? '📜 Loading Scripts'
                   : 'Processing...';
  phaseNameEl.textContent = phaseText;
  phaseNameEl.style.color = phase === 'images' ? '#00ff88'
                           : phase === 'audio' ? '#ffaa00'
                           : '#0088ff';

  const imageWeight = 0.4;
  const audioWeight = 0.4;

  let totalProgress = 0;
  if (currentLoadingState.currentPhase === 'images' && total > 0) {
    totalProgress = (current / total) * imageWeight * 100;
  } else if (currentLoadingState.currentPhase === 'audio' && total > 0) {
    totalProgress = imageWeight * 100 + (current / total) * audioWeight * 100;
  } else if (currentLoadingState.currentPhase === 'scripts') {
    totalProgress = (imageWeight + audioWeight) * 100;
  }

  const progressBar = document.getElementById('progress-bar')!;
  progressBar.style.width = `${Math.min(totalProgress, 100)}%`;

  const progressText = document.getElementById('progress-text')!;
  progressText.textContent = `${Math.floor(Math.min(totalProgress, 100))}%`;

  const detailsEl = document.getElementById('loading-details')!;
  detailsEl.innerHTML = `
    <div style="color:#00ff88;">🖼️ Textures:</div>
    <div style="margin-left:10px;color:#556;margin-bottom:8px;">${currentLoadingState.currentPhase === 'images' ? currentLoadingState.resourcesLoaded : currentLoadingState.totalResources} / ${currentLoadingState.totalResources} loaded</div>
    <div style="color:#ffaa00;">🎵 Audio:</div>
    <div style="margin-left:10px;color:#556;margin-bottom:8px;">${currentLoadingState.currentPhase === 'audio' ? currentLoadingState.resourcesLoaded : currentLoadingState.totalResources} / ${currentLoadingState.totalResources} loaded</div>
    <div style="color:#0088ff;">⏱️ Phase: ${currentLoadingState.currentPhase}</div>
  `;
}

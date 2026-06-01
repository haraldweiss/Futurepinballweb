// SPDX-License-Identifier: AGPL-3.0-or-later

export function logMsg(msg: string, type = 'info'): void {
  const parseLog = document.getElementById('parse-log');
  if (!parseLog) return;
  const span = document.createElement('span');
  span.className = `log-${type}`;
  span.textContent = `> ${msg}`;
  parseLog.appendChild(span);
  parseLog.appendChild(document.createElement('br'));
  parseLog.scrollTop = parseLog.scrollHeight;
}

export interface ResourceLoadingCallbacks {
  onPhaseStart?: (phase: 'images' | 'audio' | 'scripts') => void;
  onResourceLoaded?: (type: string, name: string, progress: { current: number; total: number }) => void;
  onPhaseComplete?: (phase: string, duration: number) => void;
}

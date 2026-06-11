const ROTATION_KEY = 'fpw_playfield_rotation';

export function saveRotation(deg: number): void {
  try { localStorage.setItem(ROTATION_KEY, String(deg)); } catch { /* localStorage may throw */ }
}

export function loadSavedRotation(): 0 | 90 | 180 | 270 | null {
  try {
    const v = localStorage.getItem(ROTATION_KEY);
    if (v === '90' || v === '180' || v === '270' || v === '0') return Number(v) as 0 | 90 | 180 | 270;
  } catch { /* ignore */ }
  return null;
}

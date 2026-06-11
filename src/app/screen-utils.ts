export interface ScreenLike {
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
  isPrimary?: boolean;
  label?: string;
}

export function sortScreensByPosition(arr: ScreenLike[]): ScreenLike[] {
  const primaryIdx = arr.findIndex(s => s.isPrimary);
  const primary = primaryIdx >= 0 ? arr[primaryIdx] : null;
  const rest = arr.filter((_, i) => i !== primaryIdx);
  rest.sort((a, b) => (a.availLeft - b.availLeft) || (a.availTop - b.availTop));
  return primary ? [primary, ...rest] : rest;
}

export async function getAllScreensForLayout(): Promise<ScreenLike[]> {
  const api = window.electronAPI;
  if (api?.getAllDisplays) {
    try {
      const displays = await api.getAllDisplays();
      if (Array.isArray(displays) && displays.length > 0) {
        const mapped: ScreenLike[] = displays.map((d: any) => ({
          availLeft: d.workArea?.x ?? d.bounds?.x ?? 0,
          availTop: d.workArea?.y ?? d.bounds?.y ?? 0,
          availWidth: d.workArea?.width ?? d.bounds?.width ?? 1920,
          availHeight: d.workArea?.height ?? d.bounds?.height ?? 1080,
          isPrimary: !!d.isPrimary,
          label: d.label,
        }));
        return sortScreensByPosition(mapped);
      }
    } catch (e) {
      console.warn('[multiscreen] electronAPI.getAllDisplays failed:', e);
    }
  }
  if ('getScreenDetails' in window) {
    try {
      const details = await window.getScreenDetails!();
      const mapped: ScreenLike[] = (details.screens || []).map((s: any) => ({
        availLeft: s.availLeft,
        availTop: s.availTop,
        availWidth: s.availWidth,
        availHeight: s.availHeight,
        isPrimary: s.isPrimary,
        label: s.label,
      }));
      return sortScreensByPosition(mapped);
    } catch { /* fall through */ }
  }
  return [{
    availLeft: 0,
    availTop: 0,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    isPrimary: true,
  }];
}

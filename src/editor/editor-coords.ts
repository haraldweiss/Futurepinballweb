export function gToC(
  gx: number, gy: number,
  canvas: HTMLCanvasElement | null,
  GW: number, GH: number,
): { x: number; y: number } {
  if (!canvas) return { x: 0, y: 0 };
  return {
    x: (gx + GW / 2) * (canvas.width / GW),
    y: (GH / 2 - gy) * (canvas.height / GH),
  };
}

export function cToG(
  cx: number, cy: number,
  canvas: HTMLCanvasElement | null,
  GW: number, GH: number,
): { x: number; y: number } {
  if (!canvas) return { x: 0, y: 0 };
  return {
    x: cx * (GW / canvas.width) - GW / 2,
    y: GH / 2 - cy * (GH / canvas.height),
  };
}

export function snap(v: number, snapEnabled: boolean): number {
  return snapEnabled ? Math.round(v * 5) / 5 : v;
}

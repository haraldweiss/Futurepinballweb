export function calculateFlipperPowerCurve(chargeTimeFraction: number): number {
  const t = Math.min(Math.max(chargeTimeFraction, 0), 1);

  const sCurve = t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;

  return 0.5 + (sCurve * 0.5);
}

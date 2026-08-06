// ─── Lamp/Flasher state (inlined for testability) ───
const _lampStates = new Map<string, number>();
const _lampBlinkIntervals = new Map<string, ReturnType<typeof setInterval>>();
const _flasherStates = new Map<string, { intensity: number; r: number; g: number; b: number }>();
const _flasherBlinkIntervals = new Map<string, ReturnType<typeof setInterval>>();

export const cb = {
  updateHUD:        (): void => {},
  showNotification: (_msg: string): void => {},
  spawnParticles:   (_x: number, _y: number, _color: number, _count: number): void => {},
  dmdEvent:         (_text: string): void => {},
  playSound:        (_type: string): void => {},
  launchMultiBall:  (): void => {},
  resetBall:        (): void => {},

  triggerBumperFlash:     (): void => {},
  triggerRampCompletion:  (): void => {},
  triggerDrainWarning:    (): void => {},
  triggerMultiballFlash:  (): void => {},

  animateBackglassScore:  (_points: number): void => {},
  updateBackglassModeInfo: (_text: string): void => {},

  tableShake: (_magnitude: number, _duration: number): void => {},

  showFloatingScore: (_position: any, _points: number): void => {},
  updateCombo: (_combo: number): void => {},
  showScoreMilestone: (_text: string): void => {},
  showBonusAnnouncement: (_text: string): void => {},

  playTargetSound: (_intensity?: number): void => {},
  playFlipperSound: (_intensity?: number): void => {},
  playRampCompleteSound: (): void => {},
  playBallDrainSound: (): void => {},
  playMultiballSound: (): void => {},
  playMilestoneSound: (): void => {},

  triggerImpactEffect: (_position: any, _intensity: number = 1.0): void => {},
  triggerDrainVisual: (): void => {},
  triggerRampVisual: (): void => {},
  triggerMultiballVisual: (): void => {},

  notifyBumperHit: (_data?: any): void => {},
  notifyTargetHit: (_data?: any): void => {},

  // ─── Phase 1: Flipper + Nudge Control ───
  disableFlippers:    (): void => {},
  enableFlippers:     (): void => {},
  applyNudgeForce:    (_x: number, _y: number): void => {},

  // ─── Phase 2: Light & Flasher Control (shared store) ───
  setLampState: (name: string, intensity: number): void => {
    _lampBlinkIntervals.get(name) && (clearInterval(_lampBlinkIntervals.get(name)!), _lampBlinkIntervals.delete(name));
    _lampStates.set(name, intensity);
  },
  setLampBlinkPattern: (name: string, pattern: string, intervalMs: number): void => {
    let step = 0;
    const interval = setInterval(() => {
      const state = pattern[step % pattern.length];
      _lampStates.set(name, state === '1' ? 1 : 0);
      step++;
    }, intervalMs);
    _lampBlinkIntervals.set(name, interval);
  },
  getLampState: (name: string): number => _lampStates.get(name) ?? 0,
  setGIState: (index: number, intensity: number): void => {
    _lampStates.set(`GI${index}`, intensity);
  },
  setFlasherState: (name: string, intensity: number, r: number = 255, g: number = 255, b: number = 255): void => {
    _flasherStates.set(name, { intensity, r, g, b });
  },
  setFlasherBlinkPattern: (name: string, pattern: string, intervalMs: number): void => {
    let step = 0;
    const interval = setInterval(() => {
      const state = pattern[step % pattern.length];
      const current = _flasherStates.get(name) ?? { intensity: 0, r: 255, g: 255, b: 255 };
      _flasherStates.set(name, { intensity: state === '1' ? 1 : 0, r: current.r, g: current.g, b: current.b });
      step++;
    }, intervalMs);
    _flasherBlinkIntervals.set(name, interval);
  },
};

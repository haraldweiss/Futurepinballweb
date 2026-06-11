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
};

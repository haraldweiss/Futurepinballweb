// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
export class UIEffects {
  private scoreElements: Array<{
    element: HTMLElement;
    startTime: number;
    duration: number;
  }> = [];

  private multiplierElement: HTMLElement | null = null;
  private multiplierGlowIntensity = 0;

  animateScoreUpdate(scoreElement: HTMLElement, duration: number = 300): void {
    const originalScale = 1.0;
    const targetScale = 1.1;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      const scale = originalScale + (targetScale - originalScale) * Math.sin(progress * Math.PI);
      scoreElement.style.transform = `scale(${scale})`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        scoreElement.style.transform = `scale(${originalScale})`;
      }
    };

    animate();
  }

  updateMultiplierGlow(multiplier: number, element: HTMLElement): void {
    this.multiplierElement = element;

    const intensity = Math.min(multiplier / 5, 1.0);
    this.multiplierGlowIntensity = intensity;

    const glowColor = `rgba(255, ${150 + intensity * 100}, 0, ${0.3 + intensity * 0.4})`;
    element.style.boxShadow = `0 0 ${10 + intensity * 20}px ${glowColor}`;
    element.style.borderColor = glowColor;
  }

  updateMultiplierPulse(): void {
    if (!this.multiplierElement || this.multiplierGlowIntensity <= 0) return;

    const now = Date.now();
    const pulsePhase = (now / 500) % 1.0;
    const pulseFactor = 0.8 + 0.2 * Math.sin(pulsePhase * Math.PI * 2);

    const intensity = this.multiplierGlowIntensity * pulseFactor;
    const glowColor = `rgba(255, ${150 + intensity * 100}, 0, ${0.3 + intensity * 0.4})`;
    this.multiplierElement.style.boxShadow = `0 0 ${10 + intensity * 20}px ${glowColor}`;
  }

  animateBallCounter(ballCountElement: HTMLElement): void {
    ballCountElement.style.transform = 'scale(1.2)';
    ballCountElement.style.color = '#ffaa00';

    setTimeout(() => {
      ballCountElement.style.transform = 'scale(1.0)';
      ballCountElement.style.color = '';
    }, 200);
  }
}

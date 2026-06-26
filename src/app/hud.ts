/**
 * hud.ts — Enhanced HUD (Heads-Up Display) update functions.
 *
 * Updates DOM elements with current game state (score, ball number, multiplier),
 * editor button visibility, and DMD mode transitions with smooth animations
 * and visual effects for professional user experience.
 * Pure module import extraction — no DI needed.
 *
 * Enhanced version with:
 * - Smooth numeric animations for score/ball/multiplier
 * - Visual effects for score milestones and achievements
 * - Enhanced DMD mode management with transitions
 * - Mobile-optimized HUD layout
 * - Touch integration indicators
 * Extracted from main.ts.
 */
import { state, currentTableConfig } from '../game';
import { dmdState } from '../dmd';
import { devLog } from '../utils/dev-log';

// Animation utilities for smooth HUD updates
const animationUtils = {
  // Smooth numeric counter animation
  animateNumber: (element: HTMLElement, newValue: number, oldValue?: number) => {
    if (oldValue === undefined) oldValue = parseInt(element.textContent || '0', 10);
    if (oldValue === newValue) return;
    
    const duration = 400; // 0.4s smooth transition
    const steps = 20;
    const increment = (newValue - oldValue) / steps;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentValue = Math.round(oldValue + (newValue - oldValue) * progress);
      element.textContent = currentValue.toLocaleString();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  },
  
  // Score milestone effect
  triggerScoreMilestone: (score: number, oldScore?: number) => {
    if (oldScore === undefined) oldScore = score - 1;
    const milestone = Math.floor(score / 1000) * 1000;
    
    if (score >= milestone && score > oldScore) {
      // Flash effect for milestone scores
      const scoreElement = document.getElementById('score');
      if (scoreElement) {
        scoreElement.style.transition = 'all 0.3s ease';
        scoreElement.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
        scoreElement.style.borderRadius = '4px';
        
        setTimeout(() => {
          scoreElement.style.backgroundColor = '';
          scoreElement.style.borderRadius = '';
          scoreElement.style.transition = '';
        }, 300);
        
        // Create milestone particle effect
        createMilestoneParticles(scoreElement.getBoundingClientRect());
      }
    }
  },
  
  // Smooth mode transition
  transitionDMDMode: (fromMode: string, toMode: string) => {
    if (fromMode === toMode) return;
    
    const dmdElement = document.getElementById('dmd-frame');
    if (dmdElement) {
      dmdElement.style.transition = 'opacity 0.2s ease';
      dmdElement.style.opacity = '0';
      
      setTimeout(() => {
        dmdElement.style.opacity = '1';
        setTimeout(() => {
          dmdElement.style.transition = '';
        }, 200);
      }, 10);
    }
  }
};

/**
 * Create milestone particle effect for score achievements
 */
function createMilestoneParticles(rect: DOMRect): void {
  const particles: HTMLDivElement[] = [];
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63'];
  
  for (let i = 0; i < 8; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = '4px';
    particle.style.height = '4px';
    particle.style.backgroundColor = colors[i % colors.length];
    particle.style.borderRadius = '50%';
    particle.style.pointerEvents = 'none';
    particle.style.animation = `milestoneFloat ${1}s ease-out`;
    
    const angle = (i * Math.PI * 2) / 8;
    const distance = 30 + Math.random() * 20;
    particle.style.left = rect.left + rect.width / 2 + Math.cos(angle) * distance + 'px';
    particle.style.top = rect.top + rect.height / 2 + Math.sin(angle) * distance + 'px';
    
    document.body.appendChild(particle);
    particles.push(particle);
    
    // Remove particle after animation
    setTimeout(() => particle.remove(), 1000);
  }
}

/**
 * Update the HUD display elements with smooth animations and visual effects.
 */
export function updateHUD(): void {
  const oldScore = state.score;
  const oldBallNum = state.ballNum;
  const oldMultiplier = state.multiplier;
  
  // Smooth score update
  const scoreElement = document.getElementById('score') as HTMLElement;
  if (scoreElement) {
    animationUtils.animateNumber(scoreElement, state.score, oldScore);
    animationUtils.triggerScoreMilestone(state.score, oldScore);
  }
  
  // Smooth ball number update
  const ballnumElement = document.getElementById('ballnum') as HTMLElement;
  if (ballnumElement) {
    animationUtils.animateNumber(ballnumElement, state.ballNum, oldBallNum);
  }
  
  // Smooth multiplier update
  const multiElement = document.getElementById('multi') as HTMLElement;
  if (multiElement) {
    animationUtils.animateNumber(multiElement, state.multiplier, oldMultiplier);
  }
  
  // Update sequence display
  const seqDisplay = document.getElementById('sequence-display') as HTMLElement;
  if (state.targetSequence && state.targetSequence.length > 0) {
    if (seqDisplay.style.display === 'none') {
      seqDisplay.style.transition = 'opacity 0.3s ease';
      seqDisplay.style.opacity = '0';
      seqDisplay.style.display = 'block';
      
      setTimeout(() => {
        seqDisplay.style.opacity = '1';
      }, 10);
    }
    
    const seqProgress = document.getElementById('seq-progress') as HTMLElement;
    if (seqProgress) {
      seqProgress.textContent = `${state.targetsHitSequence.length}/${state.targetSequence.length}`;
      
      // Highlight progress if changed
      if (seqProgress.textContent !== seqProgress.getAttribute('data-previous')) {
        seqProgress.style.transition = 'color 0.2s ease';
        seqProgress.style.color = '#4CAF50';
        setTimeout(() => {
          seqProgress.style.color = '';
          seqProgress.setAttribute('data-previous', seqProgress.textContent || '');
        }, 200);
      }
    }
  } else {
    if (seqDisplay.style.display !== 'none') {
      seqDisplay.style.transition = 'opacity 0.3s ease';
      seqDisplay.style.opacity = '0';
      
      setTimeout(() => {
        seqDisplay.style.display = 'none';
        seqDisplay.style.opacity = '1';
        setTimeout(() => {
          seqDisplay.style.transition = '';
          seqDisplay.style.opacity = '';
        }, 300);
      }, 200);
    }
  }

  // Show/hide editor button with smooth transition
  const editorBtn = document.getElementById('editor-btn');
  if (editorBtn) {
    const shouldShow = currentTableConfig ? 'inline-block' : 'none';
    if (editorBtn.style.display !== shouldShow) {
      editorBtn.style.transition = 'all 0.2s ease';
      editorBtn.style.opacity = '0';
      editorBtn.style.transform = 'translateY(-5px)';
      
      editorBtn.style.display = shouldShow;
      
      requestAnimationFrame(() => {
        editorBtn.style.opacity = '1';
        editorBtn.style.transform = 'translateY(0)';
        
        setTimeout(() => {
          editorBtn.style.transition = '';
          editorBtn.style.opacity = '';
          editorBtn.style.transform = '';
        }, 200);
      });
    }
  }

  // Enhanced DMD mode management with transitions
  if (dmdState.mode === 'playing' || dmdState.mode === 'event' || dmdState.mode === 'gameover') {
    if (dmdState.mode !== 'event' && dmdState.mode !== 'gameover') {
      animationUtils.transitionDMDMode(dmdState.mode || 'attract', 'playing');
      dmdState.mode = 'playing';
    }
  }
  
  // Add touch mode indicator if applicable
  const touchModeIndicator = document.getElementById('touch-mode-indicator');
  if (touchModeIndicator) {
    if (navigator.maxTouchPoints >= 1) {
      touchModeIndicator.style.display = 'block';
      touchModeIndicator.classList.add('touch-active');
      
      // Pulse animation for touch mode
      touchModeIndicator.style.animation = 'touchModePulse 2s infinite';
    } else {
      touchModeIndicator.style.display = 'none';
      touchModeIndicator.classList.remove('touch-active');
      touchModeIndicator.style.animation = '';
    }
  }
  
  // Update charge level display if plunger is charging
  const chargeDisplay = document.getElementById('charge-level');
  if (chargeDisplay) {
    if (state.inLane && state.plungerCharging) {
      const chargePercent = Math.floor((state.plungerCharge || 0) * 100);
      chargeDisplay.textContent = `${chargePercent}%`;
      chargeDisplay.style.display = 'block';
      
      // Add charging animation
      chargeDisplay.classList.add('charging');
      chargeDisplay.style.width = `${chargePercent}%`;
    } else {
      chargeDisplay.style.display = 'none';
      chargeDisplay.classList.remove('charging');
      chargeDisplay.style.width = '0%';
    }
  }
}

/**
 * Initialize enhanced HUD with CSS animations
 */
export function initializeEnhancedHUD(): void {
  // Add CSS for milestone particles
  const styleId = 'milestone-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes milestoneFloat {
        0% { transform: translate(0, 0) scale(0); opacity: 1; }
        50% { transform: translate(var(--x), var(--y)) scale(1.5) opacity: 0.8; }
        100% { transform: translate(calc(var(--x) * 1.5), calc(var(--y) * 1.5)) scale(0) opacity: 0; }
      }
      
      @keyframes touchModePulse {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.05); }
      }
      
      .touch-mode-indicator {
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(76, 175, 80, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        z-index: 1000;
        pointer-events: none;
        transition: all 0.3s ease;
      }
      
      .touch-mode-indicator.touch-active {
        background: linear-gradient(135deg, #4CAF50, #45a049);
        animation: touchModePulse 1.5s infinite;
      }
      
      .charge-level {
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: linear-gradient(135deg, #2196F3, #1976D2);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        z-index: 1000;
        transition: all 0.3s ease;
        width: 0%;n        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      
      .charge-level.charging {
        animation: chargePulse 0.5s ease-in-out infinite;
      }
      
      @keyframes chargePulse {
        0%, 100% { box-shadow: 0 0 8px rgba(33, 150, 243, 0.6); }
        50% { box-shadow: 0 0 16px rgba(33, 150, 243, 0.9); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add touch mode indicator if needed
  if (navigator.maxTouchPoints >= 1) {
    // Create touch mode indicator
    const touchIndicator = document.createElement('div');
    touchIndicator.id = 'touch-mode-indicator';
    touchIndicator.className = 'touch-mode-indicator';
    touchIndicator.textContent = 'TOUCH MODE';
    document.body.appendChild(touchIndicator);
    
    // Create charge level display
    const chargeDisplay = document.createElement('div');
    chargeDisplay.id = 'charge-level';
    chargeDisplay.className = 'charge-level';
    chargeDisplay.textContent = '0%';
    document.body.appendChild(chargeDisplay);
  }
}

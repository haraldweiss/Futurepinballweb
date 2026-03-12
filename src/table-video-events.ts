/**
 * table-video-events.ts — Extended Video Event Types for Pinball Tables
 *
 * Provides additional event triggers beyond core game events:
 * - Combo milestones (5-hit, 10-hit, 20-hit combos)
 * - Level/stage progression
 * - Achievement unlocks
 * - Bonus scoring moments
 * - Special sequences
 */

import { getVideoManager, getVideoBindingManager } from './video-manager';

/**
 * Extended Event Types
 */
export type ExtendedVideoEventType =
  // Core events (already supported)
  | 'bumper_hit'
  | 'target_hit'
  | 'ramp_complete'
  | 'multiball_start'
  | 'ball_drain'
  | 'flipper_hit'
  | 'slingshot'
  | 'spinner'
  | 'tilt'
  | 'game_over'
  // New extended events
  | 'combo_5'           // 5-hit combo reached
  | 'combo_10'          // 10-hit combo reached
  | 'combo_20'          // 20-hit combo reached
  | 'combo_50'          // 50-hit combo reached (extreme!)
  | 'level_complete'    // Level/stage finished
  | 'achievement_unlock' // Achievement earned
  | 'bonus_round'       // Bonus round started
  | 'skill_shot'        // Skill shot hit
  | 'jackpot_hit'       // Jackpot activated
  | 'ball_save'         // Ball save triggered
  | 'extra_ball'        // Extra ball earned
  | 'score_milestone'   // 100K, 500K, 1M, 5M+ score
  | 'combo_breaker'     // Combo chain broken
  | 'danger_drain'      // Ball near drain (warning)
  | 'victory_lap'       // Victory sequence
  | 'perfect_game'      // Perfect score/completion
  | 'easter_egg'        // Hidden Easter egg found
  | 'special_event';    // Custom table event

/**
 * Extended event configuration
 */
export interface ExtendedVideoEventConfig {
  eventType: ExtendedVideoEventType;
  videoId: string;
  priority: number;
  delay: number;
  allowInterrupt: boolean;
  condition?: (gameState: any) => boolean;
  metadata?: {
    comboThreshold?: number;  // For combo events (5, 10, 20, etc.)
    scoreThreshold?: number;  // For score milestone events
    levelNumber?: number;     // For level events
    achievementId?: string;   // For achievement events
  };
}

/**
 * Trigger extended video events
 */
export async function triggerExtendedVideoEvent(
  eventType: ExtendedVideoEventType,
  gameState: any
): Promise<void> {
  const videoMgr = getVideoManager();
  const bindMgr = getVideoBindingManager();

  if (!videoMgr || !bindMgr) return;

  // Find best binding for this event type
  const binding = bindMgr.findBestBinding(eventType, gameState);

  if (binding) {
    videoMgr.triggerVideoForEvent(eventType);
  }
}

/**
 * Combo Event Handlers
 */
export async function onComboMilestone(comboCount: number, gameState: any): Promise<void> {
  let eventType: ExtendedVideoEventType | null = null;

  if (comboCount === 5) {
    eventType = 'combo_5';
  } else if (comboCount === 10) {
    eventType = 'combo_10';
  } else if (comboCount === 20) {
    eventType = 'combo_20';
  } else if (comboCount >= 50) {
    eventType = 'combo_50';
  }

  if (eventType) {
    await triggerExtendedVideoEvent(eventType, gameState);
  }
}

/**
 * Score Milestone Event Handler
 */
export async function onScoreMilestone(score: number, gameState: any): Promise<void> {
  let milestone: ExtendedVideoEventType | null = null;

  if (score >= 5000000 && score < 5000100) {
    milestone = 'score_milestone'; // 5M
  } else if (score >= 1000000 && score < 1000100) {
    milestone = 'score_milestone'; // 1M
  } else if (score >= 500000 && score < 500100) {
    milestone = 'score_milestone'; // 500K
  } else if (score >= 100000 && score < 100100) {
    milestone = 'score_milestone'; // 100K
  }

  if (milestone) {
    await triggerExtendedVideoEvent(milestone, gameState);
  }
}

/**
 * Level Completion Handler
 */
export async function onLevelComplete(levelNumber: number, gameState: any): Promise<void> {
  gameState.currentLevel = levelNumber;
  await triggerExtendedVideoEvent('level_complete', gameState);
}

/**
 * Achievement Unlock Handler
 */
export async function onAchievementUnlock(achievementId: string, gameState: any): Promise<void> {
  gameState.unlockedAchievement = achievementId;
  await triggerExtendedVideoEvent('achievement_unlock', gameState);
}

/**
 * Skill Shot Handler
 */
export async function onSkillShot(gameState: any): Promise<void> {
  await triggerExtendedVideoEvent('skill_shot', gameState);
}

/**
 * Jackpot Handler
 */
export async function onJackpotHit(amount: number, gameState: any): Promise<void> {
  gameState.lastJackpot = amount;
  await triggerExtendedVideoEvent('jackpot_hit', gameState);
}

/**
 * Ball Save Handler
 */
export async function onBallSave(gameState: any): Promise<void> {
  await triggerExtendedVideoEvent('ball_save', gameState);
}

/**
 * Extra Ball Handler
 */
export async function onExtraBall(totalBalls: number, gameState: any): Promise<void> {
  gameState.totalBalls = totalBalls;
  await triggerExtendedVideoEvent('extra_ball', gameState);
}

/**
 * Danger Drain Warning Handler
 */
export async function onDangerDrain(gameState: any): Promise<void> {
  await triggerExtendedVideoEvent('danger_drain', gameState);
}

/**
 * Victory Lap Handler
 */
export async function onVictoryLap(gameState: any): Promise<void> {
  await triggerExtendedVideoEvent('victory_lap', gameState);
}

/**
 * Perfect Game Handler
 */
export async function onPerfectGame(gameState: any): Promise<void> {
  await triggerExtendedVideoEvent('perfect_game', gameState);
}

/**
 * Easter Egg Handler
 */
export async function onEasterEgg(eggId: string, gameState: any): Promise<void> {
  gameState.lastEasterEgg = eggId;
  await triggerExtendedVideoEvent('easter_egg', gameState);
}

/**
 * Setup extended video events for a table
 */
export async function setupExtendedVideoEvents(
  tableKey: string,
  eventConfigs: ExtendedVideoEventConfig[]
): Promise<void> {
  const bindMgr = getVideoBindingManager();

  if (!bindMgr) {
    console.warn('VideoBindingManager not initialized');
    return;
  }

  for (const config of eventConfigs) {
    bindMgr.createBinding(config.videoId, config.eventType, {
      priority: config.priority,
      autoPlay: true,
      delay: config.delay,
      allowInterrupt: config.allowInterrupt,
      condition: config.condition,
      metadata: config.metadata,
    });
  }

  console.log(`✓ Setup ${eventConfigs.length} extended video events for ${tableKey}`);
}

/**
 * Example: Complete extended event setup for a table
 */
export function createExampleEventConfigs(tableKey: string): ExtendedVideoEventConfig[] {
  return [
    // Combo events
    {
      eventType: 'combo_5',
      videoId: `${tableKey}_combo_5`,
      priority: 5,
      delay: 200,
      allowInterrupt: true,
      metadata: { comboThreshold: 5 },
    },
    {
      eventType: 'combo_10',
      videoId: `${tableKey}_combo_10`,
      priority: 6,
      delay: 200,
      allowInterrupt: true,
      metadata: { comboThreshold: 10 },
    },
    {
      eventType: 'combo_20',
      videoId: `${tableKey}_combo_20`,
      priority: 7,
      delay: 200,
      allowInterrupt: false,
      metadata: { comboThreshold: 20 },
    },
    {
      eventType: 'combo_50',
      videoId: `${tableKey}_combo_50`,
      priority: 10,
      delay: 300,
      allowInterrupt: false,
      metadata: { comboThreshold: 50 },
    },

    // Level events
    {
      eventType: 'level_complete',
      videoId: `${tableKey}_level_complete`,
      priority: 9,
      delay: 500,
      allowInterrupt: false,
    },

    // Achievement events
    {
      eventType: 'achievement_unlock',
      videoId: `${tableKey}_achievement`,
      priority: 8,
      delay: 100,
      allowInterrupt: false,
    },

    // Skill shot
    {
      eventType: 'skill_shot',
      videoId: `${tableKey}_skill_shot`,
      priority: 7,
      delay: 0,
      allowInterrupt: true,
    },

    // Jackpot
    {
      eventType: 'jackpot_hit',
      videoId: `${tableKey}_jackpot`,
      priority: 9,
      delay: 200,
      allowInterrupt: false,
    },

    // Ball save
    {
      eventType: 'ball_save',
      videoId: `${tableKey}_ball_save`,
      priority: 8,
      delay: 0,
      allowInterrupt: false,
    },

    // Extra ball
    {
      eventType: 'extra_ball',
      videoId: `${tableKey}_extra_ball`,
      priority: 8,
      delay: 100,
      allowInterrupt: false,
    },

    // Score milestones
    {
      eventType: 'score_milestone',
      videoId: `${tableKey}_score_milestone`,
      priority: 5,
      delay: 200,
      allowInterrupt: true,
      condition: (state) => state.score % 100000 < 100, // Within 100 points of milestone
    },

    // Victory lap
    {
      eventType: 'victory_lap',
      videoId: `${tableKey}_victory_lap`,
      priority: 10,
      delay: 1000,
      allowInterrupt: false,
    },

    // Perfect game
    {
      eventType: 'perfect_game',
      videoId: `${tableKey}_perfect_game`,
      priority: 10,
      delay: 2000,
      allowInterrupt: false,
    },
  ];
}

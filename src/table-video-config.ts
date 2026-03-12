/**
 * table-video-config.ts — Video Configuration Templates for Demo Tables
 *
 * Provides pre-configured video setups for all 6 demo tables with examples of:
 * - Bumper hit effects
 * - Ramp completion celebrations
 * - Multiball introductions
 * - Ball drain warnings
 * - Tilt animations
 * - Game over sequences
 *
 * Table creators can use these as templates for their own table videos.
 */

import type { VideoConfig, VideoEvent } from './video-manager';

// ─── Video Configuration for PHARAOH'S GOLD ───────────────────────────────
export const PHARAOH_VIDEOS: VideoConfig[] = [
  {
    id: 'pharaoh_intro',
    name: 'Pharaoh Intro',
    url: '/videos/pharaoh/intro.mp4',
    type: 'backglass',
    duration: 4.0,
    autoPlay: true,
    volume: 0.9,
  },
  {
    id: 'pharaoh_bumper_hit',
    name: 'Pharaoh Bumper Hit',
    url: '/videos/pharaoh/bumper-hit.mp4',
    type: 'backglass',
    duration: 1.5,
    autoPlay: true,
    volume: 0.7,
  },
  {
    id: 'pharaoh_ramp_complete',
    name: 'Pharaoh Ramp Complete',
    url: '/videos/pharaoh/ramp-complete.mp4',
    type: 'backglass',
    duration: 3.0,
    autoPlay: true,
    volume: 1.0,
  },
  {
    id: 'pharaoh_multiball',
    name: 'Pharaoh Multiball',
    url: '/videos/pharaoh/multiball.mp4',
    type: 'dmd',
    duration: 5.0,
    autoPlay: true,
    volume: 1.0,
  },
  {
    id: 'pharaoh_tilt',
    name: 'Pharaoh Tilt Warning',
    url: '/videos/pharaoh/tilt.mp4',
    type: 'backglass',
    duration: 2.0,
    autoPlay: true,
    volume: 0.8,
  },
  {
    id: 'pharaoh_gameover',
    name: 'Pharaoh Game Over',
    url: '/videos/pharaoh/gameover.mp4',
    type: 'dmd',
    duration: 4.0,
    autoPlay: true,
    volume: 1.0,
  },
];

// ─── Video Configuration for DRAGON'S CASTLE ───────────────────────────────
export const DRAGON_VIDEOS: VideoConfig[] = [
  {
    id: 'dragon_intro',
    name: 'Dragon Intro',
    url: '/videos/dragon/intro.mp4',
    type: 'backglass',
    duration: 5.0,
    autoPlay: true,
    volume: 0.9,
  },
  {
    id: 'dragon_bumper_hit',
    name: 'Dragon Bumper Hit',
    url: '/videos/dragon/bumper-hit.mp4',
    type: 'backglass',
    duration: 1.5,
    autoPlay: true,
    volume: 0.7,
  },
  {
    id: 'dragon_ramp_complete',
    name: 'Dragon Ramp Complete',
    url: '/videos/dragon/ramp-complete.mp4',
    type: 'backglass',
    duration: 3.5,
    autoPlay: true,
    volume: 1.0,
  },
  {
    id: 'dragon_multiball',
    name: 'Dragon Multiball',
    url: '/videos/dragon/multiball.mp4',
    type: 'dmd',
    duration: 6.0,
    autoPlay: true,
    volume: 1.0,
  },
  {
    id: 'dragon_tilt',
    name: 'Dragon Tilt Warning',
    url: '/videos/dragon/tilt.mp4',
    type: 'backglass',
    duration: 2.5,
    autoPlay: true,
    volume: 0.8,
  },
  {
    id: 'dragon_gameover',
    name: 'Dragon Game Over',
    url: '/videos/dragon/gameover.mp4',
    type: 'dmd',
    duration: 5.0,
    autoPlay: true,
    volume: 1.0,
  },
];

// ─── Video Configuration for KNIGHT'S QUEST ───────────────────────────────
export const KNIGHT_VIDEOS: VideoConfig[] = [
  {
    id: 'knight_intro',
    name: 'Knight Intro',
    url: '/videos/knight/intro.mp4',
    type: 'backglass',
    duration: 4.5,
    autoPlay: true,
    volume: 0.9,
  },
  {
    id: 'knight_bumper_hit',
    name: 'Knight Bumper Hit',
    url: '/videos/knight/bumper-hit.mp4',
    type: 'backglass',
    duration: 1.5,
    autoPlay: true,
    volume: 0.7,
  },
  {
    id: 'knight_ramp_complete',
    name: 'Knight Ramp Complete',
    url: '/videos/knight/ramp-complete.mp4',
    type: 'backglass',
    duration: 3.0,
    autoPlay: true,
    volume: 1.0,
  },
  {
    id: 'knight_multiball',
    name: 'Knight Multiball',
    url: '/videos/knight/multiball.mp4',
    type: 'dmd',
    duration: 5.5,
    autoPlay: true,
    volume: 1.0,
  },
  {
    id: 'knight_tilt',
    name: 'Knight Tilt Warning',
    url: '/videos/knight/tilt.mp4',
    type: 'backglass',
    duration: 2.0,
    autoPlay: true,
    volume: 0.8,
  },
  {
    id: 'knight_gameover',
    name: 'Knight Game Over',
    url: '/videos/knight/gameover.mp4',
    type: 'dmd',
    duration: 4.5,
    autoPlay: true,
    volume: 1.0,
  },
];

// ─── Video Configuration for CYBER NEXUS ───────────────────────────────────
export const CYBER_VIDEOS: VideoConfig[] = [
  {
    id: 'cyber_intro',
    name: 'Cyber Intro',
    url: '/videos/cyber/intro.mp4',
    type: 'backglass',
    duration: 5.5,
    autoPlay: true,
    volume: 0.9,
  },
  {
    id: 'cyber_bumper_hit',
    name: 'Cyber Bumper Hit',
    url: '/videos/cyber/bumper-hit.mp4',
    type: 'backglass',
    duration: 1.5,
    autoPlay: true,
    volume: 0.7,
  },
  {
    id: 'cyber_ramp_complete',
    name: 'Cyber Ramp Complete',
    url: '/videos/cyber/ramp-complete.mp4',
    type: 'backglass',
    duration: 3.0,
    autoPlay: true,
    volume: 1.0,
  },
  {
    id: 'cyber_multiball',
    name: 'Cyber Multiball',
    url: '/videos/cyber/multiball.mp4',
    type: 'dmd',
    duration: 6.0,
    autoPlay: true,
    volume: 1.0,
  },
  {
    id: 'cyber_tilt',
    name: 'Cyber Tilt Warning',
    url: '/videos/cyber/tilt.mp4',
    type: 'backglass',
    duration: 2.5,
    autoPlay: true,
    volume: 0.8,
  },
  {
    id: 'cyber_gameover',
    name: 'Cyber Game Over',
    url: '/videos/cyber/gameover.mp4',
    type: 'dmd',
    duration: 5.0,
    autoPlay: true,
    volume: 1.0,
  },
];

// ─── Video Configuration for NEON CITY ─────────────────────────────────────
export const NEON_VIDEOS: VideoConfig[] = [
  {
    id: 'neon_intro',
    name: 'Neon Intro',
    url: '/videos/neon/intro.mp4',
    type: 'backglass',
    duration: 4.0,
    autoPlay: true,
    volume: 0.9,
  },
  {
    id: 'neon_bumper_hit',
    name: 'Neon Bumper Hit',
    url: '/videos/neon/bumper-hit.mp4',
    type: 'backglass',
    duration: 1.5,
    autoPlay: true,
    volume: 0.7,
  },
  {
    id: 'neon_ramp_complete',
    name: 'Neon Ramp Complete',
    url: '/videos/neon/ramp-complete.mp4',
    type: 'backglass',
    duration: 2.5,
    autoPlay: true,
    volume: 1.0,
  },
  {
    id: 'neon_multiball',
    name: 'Neon Multiball',
    url: '/videos/neon/multiball.mp4',
    type: 'dmd',
    duration: 5.0,
    autoPlay: true,
    volume: 1.0,
  },
  {
    id: 'neon_tilt',
    name: 'Neon Tilt Warning',
    url: '/videos/neon/tilt.mp4',
    type: 'backglass',
    duration: 2.0,
    autoPlay: true,
    volume: 0.8,
  },
  {
    id: 'neon_gameover',
    name: 'Neon Game Over',
    url: '/videos/neon/gameover.mp4',
    type: 'dmd',
    duration: 4.0,
    autoPlay: true,
    volume: 1.0,
  },
];

// ─── Video Configuration for JUNGLE EXPEDITION ────────────────────────────
export const JUNGLE_VIDEOS: VideoConfig[] = [
  {
    id: 'jungle_intro',
    name: 'Jungle Intro',
    url: '/videos/jungle/intro.mp4',
    type: 'backglass',
    duration: 4.5,
    autoPlay: true,
    volume: 0.9,
  },
  {
    id: 'jungle_bumper_hit',
    name: 'Jungle Bumper Hit',
    url: '/videos/jungle/bumper-hit.mp4',
    type: 'backglass',
    duration: 1.5,
    autoPlay: true,
    volume: 0.7,
  },
  {
    id: 'jungle_ramp_complete',
    name: 'Jungle Ramp Complete',
    url: '/videos/jungle/ramp-complete.mp4',
    type: 'backglass',
    duration: 3.0,
    autoPlay: true,
    volume: 1.0,
  },
  {
    id: 'jungle_multiball',
    name: 'Jungle Multiball',
    url: '/videos/jungle/multiball.mp4',
    type: 'dmd',
    duration: 5.5,
    autoPlay: true,
    volume: 1.0,
  },
  {
    id: 'jungle_tilt',
    name: 'Jungle Tilt Warning',
    url: '/videos/jungle/tilt.mp4',
    type: 'backglass',
    duration: 2.0,
    autoPlay: true,
    volume: 0.8,
  },
  {
    id: 'jungle_gameover',
    name: 'Jungle Game Over',
    url: '/videos/jungle/gameover.mp4',
    type: 'dmd',
    duration: 4.5,
    autoPlay: true,
    volume: 1.0,
  },
];

// ─── Video Event Bindings for All Tables ────────────────────────────────
export const COMMON_VIDEO_BINDINGS: VideoEvent[] = [
  // Bumper hit - Low priority, always interruptible
  {
    trigger: 'bumper_hit',
    videoId: '', // Set by table-specific function
    delay: 0,
    allowInterrupt: true,
  },
  // Ramp complete - Medium priority
  {
    trigger: 'ramp_complete',
    videoId: '', // Set by table-specific function
    delay: 100,
    allowInterrupt: false,
  },
  // Multiball start - High priority, don't interrupt
  {
    trigger: 'multiball_start',
    videoId: '', // Set by table-specific function
    delay: 500,
    allowInterrupt: false,
  },
  // Tilt - High priority, uninterruptible
  {
    trigger: 'tilt',
    videoId: '', // Set by table-specific function
    delay: 0,
    allowInterrupt: false,
  },
  // Ball drain - Low priority
  {
    trigger: 'ball_drain',
    videoId: '', // Set by table-specific function
    delay: 200,
    allowInterrupt: true,
  },
  // Game over - Highest priority
  {
    trigger: 'game_over',
    videoId: '', // Set by table-specific function
    delay: 1000,
    allowInterrupt: false,
  },
];

/**
 * Get all video configurations for a specific table
 */
export function getVideoConfigForTable(tableKey: string): VideoConfig[] {
  switch (tableKey.toLowerCase()) {
    case 'pharaoh':
      return PHARAOH_VIDEOS;
    case 'dragon':
      return DRAGON_VIDEOS;
    case 'knight':
      return KNIGHT_VIDEOS;
    case 'cyber':
      return CYBER_VIDEOS;
    case 'neon':
      return NEON_VIDEOS;
    case 'jungle':
      return JUNGLE_VIDEOS;
    default:
      return [];
  }
}

/**
 * Get video event bindings for a specific table
 */
export function getVideoBindingsForTable(tableKey: string) {
  const prefix = tableKey.toLowerCase();

  return [
    {
      trigger: 'bumper_hit',
      videoId: `${prefix}_bumper_hit`,
      delay: 0,
      allowInterrupt: true,
    },
    {
      trigger: 'ramp_complete',
      videoId: `${prefix}_ramp_complete`,
      delay: 100,
      allowInterrupt: false,
    },
    {
      trigger: 'multiball_start',
      videoId: `${prefix}_multiball`,
      delay: 500,
      allowInterrupt: false,
    },
    {
      trigger: 'tilt',
      videoId: `${prefix}_tilt`,
      delay: 0,
      allowInterrupt: false,
    },
    {
      trigger: 'ball_drain',
      videoId: '', // Optional: only if you have a drain video
      delay: 200,
      allowInterrupt: true,
    },
    {
      trigger: 'game_over',
      videoId: `${prefix}_gameover`,
      delay: 1000,
      allowInterrupt: false,
    },
  ];
}

/**
 * Setup videos for a table (call this when table loads)
 */
export async function setupTableVideos(tableKey: string): Promise<void> {
  try {
    const videoManager = (await import('./video-manager')).getVideoManager();
    const videoBinding = (await import('./mechanics/video-binding')).getVideoBindingManager();

    if (!videoManager || !videoBinding) {
      console.warn('Video system not initialized');
      return;
    }

    // Register all videos for this table
    const videos = getVideoConfigForTable(tableKey);
    videoManager.registerVideos(videos);

    // Create bindings for all events
    const bindings = getVideoBindingsForTable(tableKey);
    for (const binding of bindings) {
      if (binding.videoId) {
        videoBinding.createBinding(binding.videoId, binding.trigger, {
          priority: 10,
          autoPlay: true,
          delay: binding.delay || 0,
          allowInterrupt: binding.allowInterrupt ?? true,
        });
      }
    }

    console.log(`✓ Videos configured for table: ${tableKey}`);
  } catch (error) {
    console.error('Failed to setup table videos:', error);
  }
}

/**
 * Example usage in table load handler:
 *
 * async function loadDemoTable(tableKey: string) {
 *   // ... existing table load code ...
 *
 *   // Setup videos for this table
 *   await setupTableVideos(tableKey);
 *
 *   // ... rest of initialization ...
 * }
 */

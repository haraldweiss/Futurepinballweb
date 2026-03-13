/**
 * animation-keyframe-extractor.ts — Extract detailed animation keyframes
 * Support position, rotation, scale, opacity, color animations
 */

import { KeyframeData, AnimationSequence, EventBinding } from './enhanced-fpt-types';

// ─── Constants ─────────────────────────────────────────────────────────────
const DEFAULT_INTERPOLATION = 'linear';
const EASING_TYPES = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'cubic'];

// ─── Core Extraction ───────────────────────────────────────────────────────

/**
 * Extract detailed keyframes from animation data
 */
export function extractDetailedKeyframes(animationData: any): KeyframeData[] {
  const keyframes: KeyframeData[] = [];

  if (!animationData) return keyframes;

  // Handle different animation data formats
  if (Array.isArray(animationData)) {
    // Array of keyframe objects
    for (const frame of animationData) {
      const keyframe = parseKeyframeObject(frame);
      if (keyframe) keyframes.push(keyframe);
    }
  } else if (animationData.frames) {
    // Object with frames property
    for (const frame of animationData.frames) {
      const keyframe = parseKeyframeObject(frame);
      if (keyframe) keyframes.push(keyframe);
    }
  } else if (animationData.keyframes) {
    // Object with keyframes property
    for (const frame of animationData.keyframes) {
      const keyframe = parseKeyframeObject(frame);
      if (keyframe) keyframes.push(keyframe);
    }
  }

  // Sort by time
  keyframes.sort((a, b) => a.time - b.time);

  // Infer missing interpolation types
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (!keyframes[i].interpolation) {
      keyframes[i].interpolation = inferInterpolationType(keyframes[i], keyframes[i + 1]);
    }
  }

  return keyframes;
}

/**
 * Parse single keyframe object
 */
function parseKeyframeObject(frame: any): KeyframeData | null {
  if (!frame) return null;

  const time = parseFloat(frame.time || frame.t || 0);
  if (isNaN(time)) return null;

  const keyframe: KeyframeData = {
    time: Math.max(0, time),
    interpolation: frame.interpolation || frame.easing || DEFAULT_INTERPOLATION,
  };

  // Parse position
  if (frame.position || frame.pos || (frame.x !== undefined && frame.y !== undefined)) {
    const pos = frame.position || frame.pos || { x: frame.x, y: frame.y, z: frame.z };
    if (pos.x !== undefined && pos.y !== undefined) {
      keyframe.position = {
        x: parseFloat(pos.x),
        y: parseFloat(pos.y),
        z: parseFloat(pos.z || 0),
      };
    }
  }

  // Parse rotation
  if (frame.rotation !== undefined || frame.rot !== undefined) {
    const rot = parseFloat(frame.rotation || frame.rot);
    if (!isNaN(rot)) keyframe.rotation = rot;
  }

  // Parse scale
  if (frame.scale !== undefined) {
    const scale = parseFloat(frame.scale);
    if (!isNaN(scale)) keyframe.scale = scale;
  }

  // Parse opacity
  if (frame.opacity !== undefined || frame.alpha !== undefined) {
    const opacity = parseFloat(frame.opacity || frame.alpha);
    if (!isNaN(opacity)) keyframe.opacity = Math.max(0, Math.min(1, opacity));
  }

  // Parse color
  if (frame.color !== undefined || frame.c !== undefined) {
    const color = frame.color || frame.c;
    if (typeof color === 'number') {
      keyframe.color = color;
    }
  }

  // Parse velocity
  if ((frame.velocity || frame.vel) && (frame.velocity.x || frame.vel.x)) {
    const vel = frame.velocity || frame.vel;
    keyframe.velocity = {
      x: parseFloat(vel.x || 0),
      y: parseFloat(vel.y || 0),
    };
  }

  // Parse angular velocity
  if (frame.angularVelocity !== undefined) {
    keyframe.angularVelocity = parseFloat(frame.angularVelocity);
  }

  return keyframe;
}

/**
 * Infer interpolation type from keyframe data
 */
function inferInterpolationType(
  current: KeyframeData,
  next: KeyframeData
): 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic' | 'step' {
  // If significant position change, use ease-out
  if (current.position && next.position) {
    const dist = Math.sqrt(
      Math.pow((next.position.x - current.position.x), 2) +
      Math.pow((next.position.y - current.position.y), 2)
    );

    if (dist > 1.0) return 'ease-out';
  }

  // If opacity change, use ease-in-out
  if (current.opacity !== undefined && next.opacity !== undefined) {
    if (Math.abs(next.opacity - current.opacity) > 0.3) return 'ease-in-out';
  }

  // Default to linear
  return 'linear';
}

/**
 * Build animation sequence from keyframes
 */
export function buildAnimationSequence(
  id: string,
  name: string,
  keyframes: KeyframeData[],
  options?: {
    loop?: boolean;
    loopCount?: number;
    startDelay?: number;
    endDelay?: number;
    triggeredBy?: string;
    triggerEvent?: string;
  }
): AnimationSequence {
  if (keyframes.length === 0) {
    return {
      id,
      name,
      duration: 0,
      loop: false,
      keyframes: [],
    };
  }

  // Calculate total duration
  const lastKeyframe = keyframes[keyframes.length - 1];
  const duration = lastKeyframe.time + (options?.endDelay || 0);

  return {
    id,
    name,
    duration,
    loop: options?.loop || false,
    loopCount: options?.loopCount,
    keyframes,
    startDelay: options?.startDelay,
    endDelay: options?.endDelay,
    triggeredBy: options?.triggeredBy,
    triggerEvent: options?.triggerEvent,
    canInterrupt: true,
  };
}

/**
 * Synchronize animations with game events
 */
export function synchronizeAnimationsWithEvents(
  animations: Map<string, AnimationSequence>,
  events: EventBinding[]
): Map<string, AnimationSequence> {
  const synchronized = new Map(animations);

  // Link animations to events based on naming
  for (const event of events) {
    for (const [animName, anim] of synchronized) {
      // Check if animation name matches event element
      if (animName.includes(event.elementId) || event.scriptFunction.includes(animName)) {
        anim.triggeredBy = event.elementId;
        anim.triggerEvent = event.eventType;

        // Adjust animation timing based on event type
        if (event.eventType === 'hit') {
          anim.startDelay = 0; // Immediate response to hit
        } else if (event.eventType === 'active') {
          anim.startDelay = 100; // Slight delay for state changes
        }
      }
    }
  }

  return synchronized;
}

/**
 * Extract animation timing information
 */
export function extractAnimationTiming(animationData: any): {
  duration: number;
  frameRate: number;
  frameCount: number;
} {
  const duration = parseFloat(animationData.duration || animationData.length || 1000);
  const frameCount = animationData.frameCount || animationData.frames?.length || 1;
  const frameRate = frameCount > 0 ? (frameCount / duration) * 1000 : 30;

  return {
    duration: Math.max(100, duration), // Minimum 100ms
    frameRate: Math.max(1, Math.min(120, frameRate)), // Clamp to 1-120 fps
    frameCount,
  };
}

/**
 * Validate keyframes
 */
export function validateKeyframes(keyframes: KeyframeData[]): {
  valid: number;
  invalid: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  let valid = 0;
  let invalid = 0;

  for (let i = 0; i < keyframes.length; i++) {
    const keyframe = keyframes[i];
    const errors: string[] = [];

    // Time validation
    if (!Number.isFinite(keyframe.time) || keyframe.time < 0) {
      errors.push(`Invalid time: ${keyframe.time}`);
    }

    // Position validation
    if (keyframe.position) {
      if (!Number.isFinite(keyframe.position.x) || !Number.isFinite(keyframe.position.y)) {
        errors.push('Invalid position');
      }
    }

    // Opacity validation
    if (keyframe.opacity !== undefined) {
      if (keyframe.opacity < 0 || keyframe.opacity > 1) {
        errors.push(`Opacity ${keyframe.opacity} outside [0, 1]`);
      }
    }

    // Interpolation validation
    if (!EASING_TYPES.includes(keyframe.interpolation)) {
      warnings.push(`Keyframe ${i}: Unknown interpolation type ${keyframe.interpolation}`);
    }

    if (errors.length > 0) {
      invalid++;
      warnings.push(`Keyframe ${i}: ${errors.join('; ')}`);
    } else {
      valid++;
    }
  }

  // Check for increasing time values
  for (let i = 1; i < keyframes.length; i++) {
    if (keyframes[i].time < keyframes[i - 1].time) {
      warnings.push(`Keyframe ${i}: Time not in order`);
    }
  }

  return { valid, invalid, warnings };
}

/**
 * Generate animation summary
 */
export function summarizeAnimations(animations: Map<string, AnimationSequence>): string {
  const totalFrames = Array.from(animations.values()).reduce((sum, a) => sum + a.keyframes.length, 0);
  const totalDuration = Array.from(animations.values()).reduce((sum, a) => sum + a.duration, 0);

  return `
Animations Extracted:
  Total Sequences: ${animations.size}
  Total Keyframes: ${totalFrames}
  Total Duration: ${(totalDuration / 1000).toFixed(1)}s

Loop Status:
  Looping: ${Array.from(animations.values()).filter(a => a.loop).length}
  One-shot: ${Array.from(animations.values()).filter(a => !a.loop).length}
`.trim();
}

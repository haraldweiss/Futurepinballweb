/**
 * physics-frame-handler.ts — Handle physics frame updates and game events.
 *
 * Processes collision events, syncs ball position to the main thread,
 * and triggers game sounds via module-level imports.
 *
 * Extracted from main.ts.
 */
import { state, physics } from '../game';
import { scoreBumperHit, scoreTargetHit, scoreSlingshotHit } from '../table';
import { getSoundManager } from '../audio-system';
import { getVideoManager } from '../video-manager';
import { getVideoBindingManager } from '../mechanics/video-binding';
import type { PhysicsFrameData } from '../physics-worker-bridge';

/**
 * Process a physics frame: sync ball position, handle collisions,
 * trigger sounds and video events.
 */
export function handlePhysicsFrame(frame: PhysicsFrameData): void {
  // Update ball position and velocity from physics worker
  state.ballPos.set(frame.ballPos.x, frame.ballPos.y, frame.ballPos.z);
  state.ballVel.x = frame.ballVel.x;
  state.ballVel.y = frame.ballVel.y;

  // Sync main thread ball body (the animate() loop reads from physics.ballBody)
  if (physics) {
    try {
      physics.ballBody.setTranslation({ x: frame.ballPos.x, y: frame.ballPos.y, z: 0 }, true);
      physics.ballBody.setLinvel({ x: frame.ballVel.x, y: frame.ballVel.y, z: 0 }, true);
    } catch {
      /* main thread ball body may not be ready */
    }
  }

  // Handle collisions
  for (const collision of frame.collisions) {
    switch (collision.type) {
      case 'bumper': {
        const bumperData = physics?.bumperMap.get(collision.data.index);
        if (bumperData) {
          scoreBumperHit(bumperData);
          getSoundManager().then((sm) => sm.playBumperHit()).catch(() => {});
        }
        break;
      }
      case 'target': {
        const targetData = physics?.targetMap.get(collision.data.index);
        if (targetData) {
          scoreTargetHit(targetData);
          getSoundManager().then((sm) => sm.playTargetHit()).catch(() => {});
        }
        break;
      }
      case 'slingshot': {
        scoreSlingshotHit(collision.data.side);
        getSoundManager().then((sm) => sm.playSlingshot()).catch(() => {});
        break;
      }
      case 'flipper_left':
      case 'flipper_right': {
        // Flipper collision handled in physics engine
        break;
      }
    }
  }
}

/**
 * Trigger a video event by type.
 */
export function triggerVideoEvent(eventType: string): void {
  const videoManager = getVideoManager();
  const bindingManager = getVideoBindingManager();

  if (!videoManager || !bindingManager) return;

  const binding = bindingManager.findBestBinding(eventType, state);

  if (binding) {
    videoManager.triggerVideoForEvent(eventType);
  }
}

export function onMultiballStartVideo(): void {
  triggerVideoEvent('multiball_start');
}

export function onTiltVideo(): void {
  triggerVideoEvent('tilt');
}

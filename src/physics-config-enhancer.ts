/**
 * physics-config-enhancer.ts — Enhanced physics configuration
 * Phase 24: Better ball/flipper parameters from FPT parsing
 * 
 * Improves gameplay by tuning physics to match original Future Pinball
 */

/**
 * Enhanced physics configuration
 */
export interface EnhancedPhysicsConfig {
  // Ball physics
  ball: {
    radius: number;
    restitution: number;
    friction: number;
    linearDamping: number;
    angularDamping: number;
    maxVelocity: number;
    gravityScale: number;
  };
  
  // Flipper physics
  flipper: {
    length: number;
    width: number;
    restitution: number;
    friction: number;
    maxAngularVelocity: number;
    returnSpeed: number;
  };
  
  // World physics
  world: {
    gravity: number;
    substeps: number;
    ccdEnabled: boolean;
  };
}

/**
 * Default physics configuration tuned for web pinball
 */
export function getDefaultPhysicsConfig(): EnhancedPhysicsConfig {
  return {
    ball: {
      radius: 0.22,              // Standard pinball radius (7/16 inch = 0.22 units)
      restitution: 0.85,         // Bounce: slightly higher for lively feel
      friction: 0.25,            // Slide easily across playfield
      linearDamping: 0.002,      // Minimal air resistance
      angularDamping: 0.1,       // Moderate spin damping
      maxVelocity: 30.0,         // Prevent unrealistic speeds
      gravityScale: 1.0,         // Standard gravity
    },
    
    flipper: {
      length: 2.1,               // Standard flipper length
      width: 0.08,               // Width (capsule diameter)
      restitution: 0.95,         // Bouncy - good for response
      friction: 0.6,             // Good grip on ball
      maxAngularVelocity: 8.0,   // Fast response
      returnSpeed: 5.0,          // Spring return speed
    },
    
    world: {
      gravity: -9.8,
      substeps: 6,               // From Phase 24 enhancement
      ccdEnabled: true,          // Continuous collision detection
    },
  };
}

/**
 * Enhance config from FPT-parsed parameters
 */
export function enhancePhysicsFromFPT(
  baseConfig: EnhancedPhysicsConfig,
  fptData: {
    ballRestitution?: number;
    ballFriction?: number;
    flipperRestitution?: number;
    flipperFriction?: number;
    tableSlope?: number;
    flippers?: Array<{ length?: number }>;
  }
): EnhancedPhysicsConfig {
  const enhanced = JSON.parse(JSON.stringify(baseConfig)) as EnhancedPhysicsConfig;
  
  // Apply FPT values if present
  if (fptData.ballRestitution !== undefined) {
    // Clamp to valid range [0.5, 1.2]
    enhanced.ball.restitution = Math.max(0.5, Math.min(1.2, fptData.ballRestitution));
  }
  
  if (fptData.ballFriction !== undefined) {
    // Clamp to valid range [0.1, 0.6]
    enhanced.ball.friction = Math.max(0.1, Math.min(0.6, fptData.ballFriction));
  }
  
  if (fptData.flipperRestitution !== undefined) {
    enhanced.flipper.restitution = Math.max(0.8, Math.min(1.0, fptData.flipperRestitution));
  }
  
  if (fptData.flipperFriction !== undefined) {
    enhanced.flipper.friction = Math.max(0.4, Math.min(0.8, fptData.flipperFriction));
  }
  
  // Adjust gravity for table slope
  if (fptData.tableSlope !== undefined) {
    // Slope affects effective gravity
    const slopeAngleDegrees = Math.atan(fptData.tableSlope) * (180 / Math.PI);
    const gravityAdjustment = Math.cos(slopeAngleDegrees * Math.PI / 180);
    enhanced.world.gravity = -9.8 * gravityAdjustment;
  }
  
  // Use FPT flipper lengths if available
  if (fptData.flippers?.length && fptData.flippers[0]?.length) {
    enhanced.flipper.length = fptData.flippers[0].length;
  }
  
  return enhanced;
}

/**
 * Create physics worker config from enhanced config
 */
export function createWorkerConfig(config: EnhancedPhysicsConfig): any {
  return {
    ballInitialPos: { x: 2.65, y: -4.5 },  // Plunger lane position
    ballRestitution: config.ball.restitution,
    ballFriction: config.ball.friction,
    leftFlipperPos: { x: -0.7, y: -5.2 },
    rightFlipperPos: { x: 0.7, y: -5.2 },
    flipperLength: config.flipper.length,
    flipperRestitution: config.flipper.restitution,
    flipperFriction: config.flipper.friction,
    tableBodies: [], // Populated by scene setup
    bumperMap: new Map(),
    targetMap: new Map(),
    slingshotMap: new Map(),
  };
}

/**
 * Log physics configuration for debugging
 */
export function logPhysicsConfig(config: EnhancedPhysicsConfig, label: string = ''): void {
  const tag = label ? `[Physics Config: ${label}]` : '[Physics Config]';
  console.log(`${tag}
  Ball:
    ├─ Restitution: ${config.ball.restitution} (bounce)
    ├─ Friction: ${config.ball.friction}
    ├─ Damping: ${config.ball.linearDamping}
    └─ Max Velocity: ${config.ball.maxVelocity}
  Flipper:
    ├─ Restitution: ${config.flipper.restitution}
    ├─ Friction: ${config.flipper.friction}
    ├─ Length: ${config.flipper.length}
    └─ Max Angular Velocity: ${config.flipper.maxAngularVelocity}
  World:
    ├─ Gravity: ${config.world.gravity}
    ├─ Substeps: ${config.world.substeps}
    └─ CCD: ${config.world.ccdEnabled ? '✓ Enabled' : '✗ Disabled'}
  `);
}

/**
 * Validate physics configuration
 */
export function validatePhysicsConfig(config: EnhancedPhysicsConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Ball validations
  if (config.ball.restitution < 0.3 || config.ball.restitution > 1.5) {
    warnings.push(`Ball restitution ${config.ball.restitution} outside typical range [0.3-1.5]`);
  }
  if (config.ball.friction < 0 || config.ball.friction > 1.0) {
    errors.push(`Ball friction ${config.ball.friction} out of range [0-1]`);
  }
  
  // Flipper validations
  if (config.flipper.length < 1.5 || config.flipper.length > 3.0) {
    warnings.push(`Flipper length ${config.flipper.length} unusual (typical: 2.0-2.5)`);
  }
  if (config.flipper.restitution < 0.7 || config.flipper.restitution > 1.1) {
    warnings.push(`Flipper restitution ${config.flipper.restitution} unusual`);
  }
  
  // World validations
  if (config.world.substeps < 1 || config.world.substeps > 8) {
    errors.push(`Substeps ${config.world.substeps} out of range [1-8]`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}


import { afterEach, describe, expect, it, vi } from 'vitest';
const bridge = vi.hoisted(() => ({
  initializePhysicsWorld: vi.fn((config: any) => {}),
  setProgressCallback: vi.fn(), setFrameCallback: vi.fn(),
}));
vi.mock('../game', () => ({ physics: { slingshotMap: new Map() }, currentTableConfig: null }));
vi.mock('../physics-worker-bridge', () => ({ initializePhysicsWorker: async () => bridge }));
vi.mock('../app/physics-frame-handler', () => ({ handlePhysicsFrame: vi.fn() }));
vi.mock('../app/loader-ui', () => ({ setLoadPhase: vi.fn(), setWorkerDetail: vi.fn() }));
import { setupPhysicsWorker } from '../app/physics-worker-setup';
import { initializePhysics } from '../physics-worker/physics-init';
import { state } from '../physics-worker/worker-state';
import { calcSafeFlipperLength, getResponsiveFlipperX } from '../app/responsive-helpers';

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('resting flippers leave a real drain gap', () => {
  it.each([0.6, 1, 16 / 9, 3])('lets a center ball drain at aspect ratio %s', async (ratio) => {
    vi.stubGlobal('innerWidth', ratio * 900);
    vi.stubGlobal('innerHeight', 900);
    await setupPhysicsWorker();
    const config = bridge.initializePhysicsWorld.mock.calls[0][0];
    expect(config.flipperLength).toBeCloseTo(calcSafeFlipperLength(getResponsiveFlipperX(ratio)));
    // Exercise the actual worker geometry and engine, without surrounding
    // table walls, visual effects or a mocked collision implementation.
    initializePhysics({ ...config, ballInitialPos: { x: 0, y: -3.7 }, tableBodies: [] });
    state.lFlipperBody!.setRotation(-28 * Math.PI / 180);
    state.rFlipperBody!.setRotation(28 * Math.PI / 180);
    for (let i = 0; i < 180; i++) state.world!.step(state.eventQueue!);
    expect(state.ballBody!.translation().y).toBeLessThan(-5.4);
  });
});

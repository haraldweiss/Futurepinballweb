import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../game', async () => ({ ...(await import('../game/state')), currentTableConfig: null }));
vi.mock('../dmd', () => ({ dmdState: { mode: 'playing' } }));
import { state } from '../game/state';
import { updateHUD } from '../app/hud';

let nextFrame = 0;
const frames = new Map<number, FrameRequestCallback>();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback); return nextFrame;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  document.body.innerHTML = '<span id="score">0</span><span id="ballnum">1</span><span id="multi">1</span><div id="sequence-display" style="display:none"></div>';
  state.score = 0; state.ballNum = 1; state.multiplier = 1; state.targetSequence = [];
});
afterEach(() => { frames.clear(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });
function finishAnimations() {
  const pending = [...frames.values()]; frames.clear();
  pending.forEach(callback => callback(500));
}

describe('HUD reflects gameplay changes', () => {
  it('updates score, ball number and multiplier from their displayed values', () => {
    state.score = 250; state.ballNum = 2; state.multiplier = 3;
    updateHUD(); finishAnimations();
    expect(document.getElementById('score')?.textContent).toBe('250');
    expect(document.getElementById('ballnum')?.textContent).toBe('2');
    expect(document.getElementById('multi')?.textContent).toBe('3');
  });
  it('does not let an older score animation overwrite a reset', () => {
    state.score = 500; updateHUD();
    state.score = 0; updateHUD(); finishAnimations();
    expect(document.getElementById('score')?.textContent).toBe('0');
  });
  it('celebrates a milestone once when rapid updates overtake the animation', () => {
    document.getElementById('score')!.textContent = '900';
    const before = document.body.childElementCount;
    state.score = 1000; updateHUD();
    const afterFirst = document.body.childElementCount;
    expect(afterFirst).toBeGreaterThan(before);
    state.score = 1100; updateHUD();
    expect(document.body.childElementCount).toBe(afterFirst);
  });
  it('reads formatted scores before animating the next update', () => {
    document.getElementById('score')!.textContent = '1,000';
    state.score = 1500; updateHUD(); finishAnimations();
    expect(document.getElementById('score')?.textContent).toBe((1500).toLocaleString());
  });
});

import { expect, it, vi } from 'vitest';
vi.mock('../dmd', () => ({ dmdEvent: vi.fn() }));
import { buildFPScriptAPI } from '../script-engine';

it('gives reels, lights, flashers and flippers stateful behavior', () => {
  const api = buildFPScriptAPI();
  const reel = api.__element('Player1Reel');
  reel.SetValue(42);
  expect(reel.Value).toBe(42);

  const light = api.__element('Light1');
  light.State = 1;
  expect(light.Intensity).toBe(1);
  light.TurnOff();
  expect(light.State).toBe(0);

  const flasher = api.__element('Flasher1');
  flasher.Flash(0.5);
  expect(flasher.Intensity).toBe(0.5);
  flasher.Off();
  expect(flasher.Intensity).toBe(0);

  const flipper = api.__element('LeftFlipper');
  flipper.SolenoidOn();
  expect(flipper.Enabled).toBe(true);
  flipper.SolenoidOff();
  expect(flipper.Enabled).toBe(false);
});

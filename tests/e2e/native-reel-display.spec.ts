import { expect, test } from '@playwright/test';
import * as CFB from '../../src/fpt/cfb-io';

const join = (...parts: Uint8Array[]) => new Uint8Array(parts.flatMap(p => [...p]));
const u32 = (value: number) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, value, true); return b; };
const block = (tag: number, data: Uint8Array) => join(u32(4 + data.length), u32(tag), data);

function reelTable(): Buffer {
  const container = CFB.utils.cfb_new();
  const name = new Uint8Array([...('Player1Reel')].flatMap(char => [char.charCodeAt(0), 0]));
  const coords = new Uint8Array(8); const view = new DataView(coords.buffer);
  view.setFloat32(0, 258, true); view.setFloat32(4, 550, true);
  CFB.utils.cfb_add(container, 'Table Element 1', join(u32(25), block(0xbab2beb2, join(u32(name.length), name)), block(0xb1babcaa, coords)));
  CFB.utils.cfb_add(container, 'Script', new TextEncoder().encode([
    'Sub FuturePinball_BeginPlay()',
    ' nvScore1 = 125',
    ' Player1Reel.Count = 5',
    ' Player1Reel.SetValue nvScore1',
    ' Player1Reel.State = BulbOff',
    'End Sub',
    'Sub FuturePinball_KeyPressed(ByVal key)',
    ' If key = GetKeyCode(InsertCoinKey) Then',
    '  nvScore1 = nvScore1 + 25',
    '  Player1Reel.AddValue 25',
    ' End If',
    ' If key = GetKeyCode(LeftFlipperKey) Then Player1Reel.AddValue 10',
    ' If key = GetKeyCode(RightFlipperKey) Then Player1Reel.AddValue 100',
    'End Sub',
    'Sub LeftFlipper_Disabled()',
    ' Player1Reel.AddValue 1000',
    'End Sub',
    'Sub FuturePinball_KeyReleased(ByVal key)',
    ' If key = GetKeyCode(LeftFlipperKey) Then Player1Reel.AddValue 1',
    'End Sub',
  ].join('\n')));
  return Buffer.from(CFB.write(container, { type: 'array' }));
}

test('imported script scores update visible reels and reset when changing tables', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: '📂 Importieren', exact: true }).click();
  await page.locator('#file-input').setInputFiles({ name: 'Reel-Example.fpt', mimeType: 'application/octet-stream', buffer: reelTable() });
  await expect(page.locator('#loader-modal')).toBeHidden();
  const panel = page.getByRole('region', { name: 'Table displays' });
  const output = panel.locator('output[aria-label="Player1Reel"]');
  await expect(output).toHaveText('00125');
  await page.keyboard.press('5');
  await expect(output).toHaveText('00150');
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('ShiftRight');
  await expect(output).toHaveText('00260');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(output).toHaveText('01261');
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('ShiftRight');
  await expect(output).toHaveText('01261');
  await expect(page.locator('#script-log')).not.toContainText(/Fehler:|Script binding error|Script blocked/);
  await page.screenshot({ path: test.info().outputPath('reels-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel).toBeInViewport();
  const bounds = await panel.boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await expect.poll(() => panel.evaluate(element => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    // The host notification retains its hit box while fully transparent.
    return element.contains(hit) || (hit?.id === 'notification' && getComputedStyle(hit).opacity === '0');
  })).toBe(true);
  await page.screenshot({ path: test.info().outputPath('reels-mobile.png') });
  await page.locator('#open-loader').click();
  await page.getByRole('button', { name: '🎮 DEMO TISCHE', exact: true }).click();
  await page.getByRole('heading', { name: "Pharaoh's Gold", exact: true }).click();
  await expect(panel).toHaveCount(0);
  expect(errors).toEqual([]);
});

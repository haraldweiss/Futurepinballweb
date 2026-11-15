import { expect, test } from '@playwright/test';
import * as CFB from '../../src/fpt/cfb-io';

function rulesTable(): Buffer {
  const cfb = CFB.utils.cfb_new();
  const u32 = (value: number) => { const out = new Uint8Array(4); new DataView(out.buffer).setUint32(0, value, true); return out; };
  const join = (...parts: Uint8Array[]) => new Uint8Array(parts.flatMap(part => [...part]));
  const block = (tag: number, value: Uint8Array) => join(u32(4 + value.length), u32(tag), value);
  ['CreditReel', 'ScoreReel', 'ActiveReel'].forEach((name, index) => {
    const encoded = new Uint8Array([...name].flatMap(char => [char.charCodeAt(0), 0]));
    const coords = new Uint8Array(8); const view = new DataView(coords.buffer);
    view.setFloat32(0, 250 + index * 100, true); view.setFloat32(4, 550, true);
    CFB.utils.cfb_add(cfb, `Table Element ${index + 1}`, join(u32(25), block(0xbab2beb2, join(u32(encoded.length), encoded)), block(0xb1babcaa, coords)));
  });
  CFB.utils.cfb_add(cfb, 'Script', new TextEncoder().encode([
    'Sub RefreshDisplays()',
    ' CreditReel.SetValue nvCredits', ' ScoreReel.SetValue nvScore1', ' ActiveReel.SetValue fpGameInPlay',
    'End Sub',
    'Sub FuturePinball_BeginPlay()',
    ' nvCredits = 0', ' nvScore1 = 900', ' EndGame', ' RefreshDisplays',
    'End Sub',
    'Sub FuturePinball_KeyPressed(ByVal code)',
    ' If code = GetKeyCode(InsertCoinKey) Then nvCredits = nvCredits + 1',
    ' If code = GetKeyCode(StartGameKey) And nvCredits > 0 Then',
    '  nvCredits = nvCredits - 1', '  BeginGame', '  nvScore1 = 777', ' End If',
    ' If code = 36 Then EndGame', ' RefreshDisplays',
    'End Sub',
  ].join('\n')));
  return Buffer.from(CFB.write(cfb, { type: 'array' }));
}

test('native rules own credits and game start, then switching restores demo controls', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: '📂 Importieren', exact: true }).click();
  await page.locator('#file-input').setInputFiles({ name: 'Coin-Rules.fpt', mimeType: 'application/octet-stream', buffer: rulesTable() });
  await expect(page.locator('#loader-modal')).toBeHidden();
  const panel = page.getByRole('region', { name: 'Table displays' });
  const credits = panel.locator('output[aria-label="CreditReel"]');
  const score = panel.locator('output[aria-label="ScoreReel"]');
  const active = panel.locator('output[aria-label="ActiveReel"]');
  await expect(score).toHaveText('0000900'); await expect(active).toHaveText('0000000');
  await page.keyboard.press('5'); await expect(credits).toHaveText('0000001');
  await page.keyboard.press('c'); await expect(credits).toHaveText('0000001');
  await page.keyboard.press('Enter'); await expect(active).toHaveText('0000000'); await expect(score).toHaveText('0000900');
  await page.keyboard.press('1'); await expect(credits).toHaveText('0000000');
  await expect(score).toHaveText('0000777'); await expect(active).toHaveText('0000001');
  await expect(page.locator('#score')).toHaveText('777');
  await page.keyboard.press('1'); await expect(score).toHaveText('0000777');
  await page.keyboard.press('5'); await page.keyboard.press('5'); await expect(credits).toHaveText('0000002');
  await page.keyboard.press('2'); await expect(credits).toHaveText('0000002'); await expect(score).toHaveText('0000777');
  await page.keyboard.press('j'); await expect(active).toHaveText('0000000');
  await page.keyboard.press('Enter'); await expect(active).toHaveText('0000000'); await expect(credits).toHaveText('0000002');
  await expect(page.locator('#script-log')).not.toContainText(/Fehler:|Script blocked|Script binding error/);
  await page.screenshot({ path: test.info().outputPath('native-credit-start.png') });
  await page.locator('#open-loader').click();
  await page.getByRole('button', { name: '🎮 DEMO TISCHE', exact: true }).click();
  await page.getByRole('heading', { name: "Pharaoh's Gold", exact: true }).click();
  await expect(panel).toHaveCount(0);
  await page.keyboard.press('5'); await expect(page.locator('#notification')).toContainText('Credits: 1');
  await page.keyboard.press('1'); await expect(page.locator('#notification')).toContainText('Credits: 0');
  expect(errors).toEqual([]);
});

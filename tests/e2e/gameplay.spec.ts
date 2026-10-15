import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';

// These tests target the built production output, never the dev server.
// Use the normal low graphics preference for software-rendered CI. Physics
// pacing is unchanged; these are lifecycle checks, not a graphics benchmark.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fpw_quality_preset', 'low');
    localStorage.setItem('fpw_quality_auto', 'false');
  });
});
test('production demo boots and reloads without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('heading', { name: "Pharaoh's Gold", exact: true }).click();
  await expect(page.locator('#loader-modal')).toBeHidden();
  await expect(page.locator('#quick-menu')).toBeHidden();
  await expect(page.locator('#score')).toHaveText('0');
  await expect(page.locator('#ballnum')).toHaveText('1');
  await page.keyboard.press('5'); // Insert a coin before launching.
  await page.keyboard.down('Enter');
  await page.waitForTimeout(800); // Hold the plunger rather than tapping it.
  await page.keyboard.up('Enter');
  await page.keyboard.press('ShiftLeft');
  await page.keyboard.press('ShiftRight');
  await page.waitForTimeout(3000);
  await page.keyboard.press('r');
  await page.locator('#open-loader').click();
  await page.getByRole('heading', { name: "Pharaoh's Gold", exact: true }).click();
  await expect(page.locator('#score')).toHaveText('0');
  await expect(page.locator('#ballnum')).toHaveText('1');
  expect(errors).toEqual([]);
});

// Keep copyrighted table files outside the repository. A supplied path must
// pass; absence is an explicit skip, not a claim of real-table coverage in CI.
const files: string[] = JSON.parse(process.env.FPT_TEST_FILES || '[]');
test('real FPT corpus imports through the production UI', async ({ page }) => {
  test.skip(files.length === 0, 'Set FPT_TEST_FILES to a JSON array of local trusted FPT paths.');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const file of files) {
    await page.goto('/');
    await page.getByRole('button', { name: '📂 Importieren', exact: true }).click();
    await expect(page.locator('#loader-modal')).toBeVisible();
    await page.locator('#file-input').setInputFiles(file);
    await expect(page.locator('#parse-log')).toContainText(path.basename(file));
    await expect(page.locator('#loader-modal')).toBeHidden();
    await expect(page.locator('#quick-menu')).toBeHidden();
    await expect(page.locator('#score')).toHaveText('0');
    await expect(page.locator('#ballnum')).toHaveText('1');
    await page.screenshot({ path: test.info().outputPath(`${path.basename(file)}.png`) });
  }
  expect(errors).toEqual([]);
});

// Unlike the boot smoke, this must observe a gameplay transition. A removed
// keyboard handler or stopped simulation cannot pass merely by rendering HUD 1.
test('demo plays through three balls and game over', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('heading', { name: "Pharaoh's Gold", exact: true }).click();
  await expect(page.locator('#loader-modal')).toBeHidden();
  await expect(page.locator('#quick-menu')).toBeHidden();
  await playThroughGame(page);
  await page.locator('#open-loader').click();
  await page.getByRole('heading', { name: "Pharaoh's Gold", exact: true }).click();
  await expect(page.locator('#ballnum')).toHaveText('1');
  await expect(page.locator('#score')).toHaveText('0');
  expect(errors).toEqual([]);
});


async function playThroughGame(page: Page): Promise<void> {
  await page.keyboard.press('5');
  let sawScore = false;
  for (const nextBall of ['2', '3', '1']) {
    await expect.poll(async () => {
      // Observe completed transitions before sending another launch input.
      const displayedBall = await page.locator('#ballnum').innerText();
      if (displayedBall === nextBall) return displayedBall;
      // Saves return the ball to the lane; Enter during play cannot force a drain.
      await page.keyboard.down('Enter');
      await page.waitForTimeout(250);
      await page.keyboard.up('Enter');
      const score = await page.locator('#score').textContent();
      sawScore ||= Number((score || '0').replace(/[^0-9]/g, '')) > 0;
      return page.locator('#ballnum').innerText();
    }, { timeout: 80_000, intervals: [1500] }).toBe(nextBall);
  }
  expect(sawScore, 'At least one gameplay event should score during the reference run').toBe(true);
  // A held/repeated plunger input can start the following game as it ends.
  // Verify game-over persistence rather than demanding an idle zero score.
  await expect.poll(() => page.evaluate(() => {
    const scores: number[] = JSON.parse(localStorage.getItem('fpw_highscores_v1') || '[]');
    return scores.some(score => score > 0);
  })).toBe(true);
}

test('imported reference plays through scoring, three balls and game over', async ({ page }) => {
  test.setTimeout(300_000);
  test.skip(files.length === 0, 'Set FPT_TEST_FILES to trusted local FPT references.');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: '📂 Importieren', exact: true }).click();
  await page.locator('#file-input').setInputFiles(files[0]);
  await expect(page.locator('#loader-modal')).toBeHidden();
  await expect(page.locator('#quick-menu')).toBeHidden();
  await playThroughGame(page);
  expect(errors).toEqual([]);
});

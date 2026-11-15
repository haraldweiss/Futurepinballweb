import { expect, test } from '@playwright/test';

const baseFiles: string[] = JSON.parse(process.env.FPT_SCRIPT_TEST_FILES || '[]');
for (const [index, file] of baseFiles.entries()) {
  test(`private base script imports without caught script failures (${index + 1})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.getByRole('button', { name: '📂 Importieren', exact: true }).click();
    await page.locator('#file-input').setInputFiles(file);
    await expect(page.locator('#loader-modal')).toBeHidden();
    await expect(page.locator('#script-log')).toContainText('Handler:');
    await expect(page.locator('#script-log')).not.toContainText('Script-Fehler');
    await expect(page.locator('#script-log')).not.toContainText('Script blocked');
    await expect(page.locator('#script-log')).not.toContainText(/\bFehler:/);
    expect(errors).toEqual([]);
  });
}

test('private BAM table reports unsupported coordinate lookup instead of an undefined-object crash', async ({ page }) => {
  const file = process.env.FPT_BAM_TEST_FILE;
  test.skip(!file, 'Set FPT_BAM_TEST_FILE to the trusted local All In One reference.');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: '📂 Importieren', exact: true }).click();
  await page.locator('#file-input').setInputFiles(file!);
  await expect(page.locator('#loader-modal')).toBeHidden();
  await expect(page.locator('#script-log')).toContainText('coordinate lookup is unsupported');
  await expect(page.locator('#script-log')).not.toContainText("Cannot read properties of undefined");
  expect(errors).toEqual([]);
});

// Trusted private input stays outside Git. Reaching this request verifies script
// control flow only: the kicker adapter is still a placeholder, not native physics.
test('private native game start reaches its delayed ball-creation request', async ({ page }) => {
  const file = process.env.FPT_NATIVE_START_FILE;
  test.skip(!file, 'Set FPT_NATIVE_START_FILE to the trusted local NewTable reference.');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: '📂 Importieren', exact: true }).click();
  await page.locator('#file-input').setInputFiles(file!);
  await expect(page.locator('#loader-modal')).toBeHidden();
  await page.keyboard.press('5'); await page.keyboard.press('1');
  await expect(page.locator('#script-log')).toContainText('StartGame: New game started');
  await expect(page.locator('#script-log')).toContainText('PlungerKicker.CreateBall');
  await expect(page.locator('#script-log')).not.toContainText(/Fehler:|Script blocked|Script binding error/);
  await expect(page.locator('#score')).toHaveText('0');
  expect(errors).toEqual([]);
});

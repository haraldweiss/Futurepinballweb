import { test, expect } from '@playwright/test';

// Private libraries stay outside the repository. A supplied path list is a real
// regression check; absence is an explicit skip, not a claim of coverage.
// FPL_TEST_FILES must include at least one sound and one script library.
const libraries: string[] = JSON.parse(process.env.FPL_TEST_FILES || '[]');

test('real FPL libraries hydrate native member types', async ({ page }) => {
  test.skip(libraries.length === 0, 'FPL_TEST_FILES is not set');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.waitForTimeout(2000);
  for (const library of libraries) {
    await page.setInputFiles('#file-input', library);
    await page.waitForTimeout(3000);
  }
  const log = await page.locator('#parse-log').innerText();
  expect(log).toContain('Sound-Member');
  expect(log).toContain('Script-Member');
  expect(log).not.toContain('FPL Parse Error');
  expect(errors).toEqual([]);
});

// FPL_MODEL_TEST_FILES must include at least one model library.
const modelLibraries: string[] = JSON.parse(process.env.FPL_MODEL_TEST_FILES || '[]');

test('real FPL model libraries retain and decode members', async ({ page }) => {
  test.skip(modelLibraries.length === 0, 'FPL_MODEL_TEST_FILES is not set');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.waitForTimeout(2000);
  for (const library of modelLibraries) {
    await page.setInputFiles('#file-input', library);
    await page.waitForTimeout(5000);
  }
  const log = await page.locator('#parse-log').innerText();
  expect(log).toContain('Model-Member');
  expect(log).not.toContain('FPL Parse Error');
  expect(errors).toEqual([]);
});

const imageLibraries: string[] = JSON.parse(process.env.FPL_IMAGE_TEST_FILES || '[]');

test('real FPL image libraries hydrate native textures', async ({ page }) => {
  test.skip(imageLibraries.length === 0, 'FPL_IMAGE_TEST_FILES is not set');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.getElementById('quick-menu')?.classList.remove('open'));
  for (const library of imageLibraries) {
    await page.locator('#open-loader').click();
    await page.setInputFiles('#file-input', library);
    await page.waitForFunction(() => document.getElementById('parse-log')?.innerText.includes('Library loaded'), undefined, { timeout: 90000 });
  }
  const log = await page.locator('#parse-log').innerText();
  expect(log).toContain('Textur-Member');
  expect(log).toContain('Library loaded');
  expect(log).not.toContain('FPL Parse Error');
  expect(errors).toEqual([]);
});

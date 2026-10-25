// SPDX-License-Identifier: AGPL-3.0-or-later
// Packaged-app compatibility check; never publishes or installs an update.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron, expect } = require('@playwright/test');
const pkg = require('../package.json');

function packagedExecutable() {
  const product = pkg.build.productName;
  const output = path.resolve(__dirname, '..', pkg.build.directories.output);
  const archSuffix = process.arch === 'x64' ? '' : `-${process.arch}`;
  if (process.platform === 'win32') return path.join(output, `win${archSuffix}-unpacked`, `${product}.exe`);
  if (process.platform === 'linux') return path.join(output, `linux${archSuffix}-unpacked`, pkg.name);
  if (process.platform === 'darwin') {
    const suffix = process.arch === 'x64' ? 'mac' : `mac-${process.arch}`;
    return path.join(output, suffix, `${product}.app`, 'Contents', 'MacOS', product);
  }
  throw new Error(`Unsupported smoke platform: ${process.platform}`);
}

async function main() {
  const executablePath = packagedExecutable();
  assert.ok(fs.existsSync(executablePath), `Package first: ${executablePath}`);
  assert.ok(['x64', 'arm64'].includes(process.arch), 'Alpha testing requires a 64-bit host');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fpw-electron-smoke-'));
  let app;
  let page;
  const errors = [];
  try {
    const args = [`--user-data-dir=${profile}`];
    if (process.env.CI) args.push('--force-device-scale-factor=1');
    // Linux hosted graphics are a compatibility check, not a performance test.
    // Keep the native Metal/D3D backend on macOS/Windows.
    if (process.env.CI && process.platform === 'linux') {
      args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader');
    }
    // Ubuntu hosted runners restrict unprivileged Chromium sandbox namespaces.
    // Only this trusted-demo CI process disables the Chromium OS sandbox;
    // production BrowserWindow sandbox/contextIsolation settings stay enabled.
    if (process.env.CI && process.platform === 'linux') args.push('--no-sandbox');
    app = await _electron.launch({ executablePath, args, timeout: 45_000 });
    const watch = page => page.on('pageerror', error => errors.push(error.message));
    app.on('window', watch);
    page = await app.firstWindow();
    watch(page);
    if (process.env.CI) await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setBounds({ width: 800, height: 600 });
    });
    const versions = await app.evaluate(() => ({
      electron: process.versions.electron, node: process.versions.node,
      chrome: process.versions.chrome, arch: process.arch,
    }));
    assert.equal(versions.electron, pkg.devDependencies.electron);
    assert.equal(versions.node, '24.22.1');
    assert.equal(versions.arch, process.arch);
    await page.waitForFunction(() => !!window.electronAPI);
    await page.evaluate(() => {
      localStorage.setItem('fpw_quality_preset', 'low');
      localStorage.setItem('fpw_quality_auto', 'false');
    });
    await page.reload();
    assert.match(page.url(), /^file:.*app\.asar\/dist\/index\.html/);
    const bridge = await page.evaluate(async () => ({
      version: await window.electronAPI.getVersion(),
      displays: await window.electronAPI.getAllDisplays(),
      nodeRequire: typeof window.require, nodeProcess: typeof window.process,
    }));
    assert.equal(bridge.version, pkg.version);
    assert.ok(bridge.displays.length > 0);
    assert.equal(bridge.nodeRequire, 'undefined');
    assert.equal(bridge.nodeProcess, 'undefined');
    await page.getByRole('heading', { name: "Pharaoh's Gold", exact: true }).click();
    await expect(page.locator('#loader-modal')).toBeHidden();
    await expect(page.locator('#ballnum')).toHaveText('1');
    await expect(page.locator('#score')).toHaveText('0');
    assert.equal(await page.locator('canvas').count(), 3);
    await page.keyboard.press('5');
    // A launch save can return the ball to the lane; relaunch through the same
    // keyboard path as the production browser lifecycle test until it scores.
    await expect.poll(async () => {
      await page.keyboard.down('Enter');
      await page.waitForTimeout(250);
      await page.keyboard.up('Enter');
      return Number((await page.locator('#score').innerText()).replace(/[^0-9]/g, ''));
    }, { timeout: 80_000, intervals: [1500] }).toBeGreaterThan(0);
    await page.keyboard.press('ShiftLeft');
    await page.keyboard.press('ShiftRight');

    const childPromise = app.waitForEvent('window');
    const childId = await page.evaluate(() => window.electronAPI.openWindow({
      url: location.href, x: 40, y: 40, width: 800, height: 600, role: 'smoke',
    }));
    const child = await childPromise;
    await child.waitForFunction(() => !!window.electronAPI);
    assert.equal(await child.evaluate(() => window.electronAPI.getVersion()), pkg.version);
    await child.evaluate(() => {
      window.electronAPI.onStateBroadcast(data => { window.smokeState = data; });
    });
    await page.evaluate(() => window.electronAPI.broadcastState({ smoke: 'outbound' }));
    await child.waitForFunction(() => window.smokeState?.smoke === 'outbound');
    await page.evaluate(() => {
      window.electronAPI.onStateBroadcast(data => { window.smokeState = data; });
    });
    await child.evaluate(() => window.electronAPI.broadcastState({ smoke: 'return' }));
    await page.waitForFunction(() => window.smokeState?.smoke === 'return');
    const closed = child.waitForEvent('close');
    await page.evaluate(id => window.electronAPI.closeWindow(id), childId);
    await closed;
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', platform: process.platform, ...versions,
      asar: true, preload: true, scoring: true, childStateRelay: true, pageErrors: errors }));
  } catch (error) {
    console.error(JSON.stringify({ result: 'FAIL', platform: process.platform, pageErrors: errors }));
    if (page && !page.isClosed()) {
      const output = path.resolve(__dirname, '..', 'test-results');
      fs.mkdirSync(output, { recursive: true });
      await page.screenshot({ path: path.join(output, 'electron-smoke-failure.png'), timeout: 5000 })
        .catch(screenshotError => console.error('Failure screenshot:', screenshotError.message));
    }
    throw error;
  } finally {
    try { if (app) await app.close(); }
    finally { fs.rmSync(profile, { recursive: true, force: true }); }
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

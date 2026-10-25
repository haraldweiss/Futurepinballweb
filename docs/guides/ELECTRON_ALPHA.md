# Electron 46 alpha platform evaluation

This branch prepares a separate 64-bit alpha PR for testing. It does not approve
a release, update the stable branch, or deploy to a cabinet. Electron is pinned
to `46.0.0-alpha.1`, whose bundled Node is `24.22.1`.
See the [official alpha notes](https://releases.electronjs.org/release/v46.0.0-alpha.1).

## Compatibility change

Windows NSIS packaging changes from x64/ia32 to x64; portable remains x64.
Electron 44+ no longer publishes Windows ia32 or Linux armv7l binaries and
requires macOS 13+. This branch therefore cannot replace an installation that
requires those older platforms. [Upstream platform changes](https://www.electronjs.org/blog/electron-44-0).
Builder, updater, application version, preload security settings and game logic
are unchanged. The current preload does not use the removed sandbox globals or
modules, and the main process does not use synchronous safeStorage APIs.

## Evidence already collected locally

An unsigned macOS arm64 app was packaged and launched from its actual
`app.asar`. Main-process runtime inspection confirmed Electron 46.0.0-alpha.1,
Node 24.22.1 and Chromium 158.0.8114.0. Typecheck, production build, 972 unit
tests (one existing private-corpus skip) and full/production npm audits pass.

The local full-game check used a new temporary profile with no highscores. It
observed positive scoring, natural ball transitions 1→2→3→1, persisted a new
game-over highscore and reloaded the table, with no renderer page errors. A
separate check passed preload version/display IPC, child-window creation,
bidirectional state relay and closure on one physical display. This does not
establish physical multi-monitor or cabinet behavior.

## Automated platform checks

The PR's existing typecheck/unit/security/browser checks remain required.
An additional CI matrix packages a native 64-bit directory app on Linux,
Windows and macOS, then runs `npm run test:electron` against that packaged
binary. It checks the embedded Node/Electron versions and native architecture,
ASAR loading, renderer Node isolation, preload/display IPC, three canvases,
positive gameplay scoring and bidirectional child-window state relay.

CI packaging uses `--publish never`, disables signing/notarization and omits the
updater feed. It uses no release secrets or write token. Seven-day Actions
artifacts contain unsigned test apps in tar archives, not GitHub Releases.
The Linux smoke uses Xvfb and disables the Chromium OS sandbox only for the
trusted-demo test process because hosted Ubuntu restricts sandbox namespaces.
Linux CI uses SwiftShader software rendering; macOS/Windows keep their native
graphics backend. These are compatibility checks, not GPU performance measurements.
Production BrowserWindow sandbox/context-isolation settings are unchanged.

To reproduce on a native 64-bit host:

```sh
npm ci
npm run build
npx electron-builder --dir --publish never --config.publish=null --config.mac.identity=null --config.mac.notarize=false
npm run test:electron
```

On headless Linux use `CI=1 xvfb-run --auto-servernum npm run test:electron`.
The smoke creates and removes a temporary profile. CI results establish only
the checks exercised on hosted runners; native gameplay/hardware acceptance
below remains separate.

## Before considering adoption

- Confirm all PR platform and existing security/build checks are green.
- Test Windows installer/portable behavior, hardware inputs, sustained gameplay
  and physical cabinet multi-display output using trusted tables.
- Test Linux distribution packaging and target display-server behavior.
- Test macOS x64/arm64 targets and the minimum supported macOS version.
- Verify signing, notarization, first-launch behavior and signed auto-updates.
- Run private-table import/gameplay checks where permitted; public demo tests
  do not establish original table-rule fidelity.
- Make an explicit decision about prerelease Electron and the removed platforms
  before merging this PR or publishing any desktop release.

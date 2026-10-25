# Electron runtime review — 25 October 2026

Electron is pinned to **43.8.3**, replacing the locked 41.10.6 runtime.
Electron supports its latest three stable major versions; these are currently
43, 44 and 45. Version 43 is the smallest supported upgrade and retains the
Windows ia32 target configured in this project (Electron 44 removes ia32).
`electron-updater` and the IPC/preload implementation are unchanged.

This update **does not close the Node.js 21 October security-release finding**.
The packaged macOS arm64 executable reports Electron 43.8.3, Node **24.22.0**,
Chromium 150.0.7871.250 and bundled undici 7.29.1. Updating the build machine's
Node installation does not replace these embedded components.

Node's security release requires 24.22.1 (or 22.23.4 / 26.12.1). The official
stable Electron releases 43.8.3, 44.9.3 and 45.0.0 all still pin Node 24.22.0.
Their published Node patch sets provide no evidence of the October fixes.
Keep this finding open until a stable Electron release includes the fixed Node
version or its specific fixes are independently verified as backports. A clean
`npm audit` for Electron does not certify the bundled Node runtime. Do not use
a nightly build as the production fix.

Sources checked on 25 October 2026:

- [Electron support policy](https://www.electronjs.org/docs/latest/tutorial/electron-timelines#version-support-policy)
- [Official stable release index](https://releases.electronjs.org/release)
- [Electron 43.8.3 DEPS](https://github.com/electron/electron/blob/v43.8.3/DEPS)
- [Electron 43.8.3 Node patches](https://github.com/electron/electron/tree/v43.8.3/patches/node)
- [Electron 44.9.3 DEPS](https://github.com/electron/electron/blob/v44.9.3/DEPS)
- [Electron 45.0.0 DEPS](https://github.com/electron/electron/blob/v45.0.0/DEPS)
- [Node 24.22.1 security release](https://nodejs.org/en/blog/release/v24.22.1)
- [Electron 44 platform changes](https://www.electronjs.org/blog/electron-44-0)

## Local verification

The isolated checkout was installed with `npm ci`. TypeScript and the production
Vite build pass. The unit suite passes 972 tests across 54 files; one private
corpus test is explicitly skipped because no private table paths were supplied.
Security lint probes pass 5/5; security lint completes with zero errors and 672
existing warnings; the standalone security tests pass.

The existing production-browser suite passes both public demo checks, including
a complete three-ball game with scoring and persisted game-over results; its
two private-table checks are explicitly skipped. The packaged macOS app also
starts from its bundled `file://` ASAR page, creates three canvases, and returns
the app version and display list through the existing preload IPC bridge
without renderer exceptions. Loading Pharaoh's Gold and sending coin, plunger
and both flipper inputs in the packaged app produces a score of 50 with no
renderer exceptions.

`npm audit --omit=dev --audit-level=moderate` reports zero vulnerabilities.
The complete dependency audit remains above the project's high-severity gate:
upstream baseline has 3 high / 4 moderate affected package entries, and this
update has 2 high / 4 moderate. The Electron advisory entry is removed; existing
happy-dom/undici highs and Vitest/fast-uri moderates remain outside this runtime
update. These counts concern npm dependencies, separately from Electron's
embedded Node and undici versions.

The macOS arm64 app is built locally with:

```sh
npx electron-builder --mac dir --arm64 --publish never \
  --config.mac.identity=null --config.mac.hardenedRuntime=false \
  --config.mac.notarize=false
ELECTRON_RUN_AS_NODE=1 \
  'release/mac-arm64/Future Pinball Web.app/Contents/MacOS/Future Pinball Web' \
  -p 'JSON.stringify(process.versions)'
```

This is an unsigned, unnotarized local validation app. No release was published
and no cabinet deployment was performed. Windows/Linux packaging, physical
cabinet input/multiscreen behavior, signing and update installation still need
their own validation before release.

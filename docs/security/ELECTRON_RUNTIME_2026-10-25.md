# Electron runtime security review — updated 4 November 2026

The source/build runtime now pins **Electron 43.8.7**, replacing 43.8.3. The
actual packaged macOS arm64 app reports **Node 24.22.1**, closing the October
Node security-release version gap previously documented here. Chromium is
150.0.7871.250; bundled undici is 7.30.1. The earlier 43.8.3 build embedded
Node 24.22.0. Updating the build machine's Node alone would not fix that gap.

This is a same-series patch. Windows ia32 remains configured and present in
the official 43.8.7 release feed. No Electron major/platform policy change,
preload/IPC change, or electron-updater change is included.

Sources verified on 4 November:

- [Official Electron release feed](https://releases.electronjs.org/releases.json):
  43.8.7 was released 3 November 2026 at 17:01 UTC with Node 24.22.1.
- [Electron 43.8.7 release](https://github.com/electron/electron/releases/tag/v43.8.7)
- [Node 24.22.1 security release](https://nodejs.org/en/blog/release/v24.22.1)
- [Electron support policy](https://www.electronjs.org/docs/latest/tutorial/electron-timelines#version-support-policy)

## Verification

- Clean npm install, npm 10.9.4 lockfile compatibility, strict TypeScript,
  production build and 972 unit tests pass. One existing private-corpus test
  remains explicitly skipped because no trusted private paths were supplied.
- The canonical security lint/probe/audit gate passes. Production npm audit has
  zero findings. The full audit retains twelve propagated moderate findings
  from minimatch 3 in legacy Electron packaging tools. No audit suppressions.
- Transitive FileList 2.0.2 uses the existing modern minimatch override and
  preserves the CommonJS/Jake API; expansion and exclusion probes pass.
- Built an unsigned macOS arm64 app using the normal packaging configuration:

```sh
npx electron-builder --dir --mac --arm64 --publish never --config.mac.identity=null
```

The packaged app loads its bundled page and creates three canvases. Its actual
runtime reports Electron 43.8.7 / Node 24.22.1. BrowserWindow preferences retain
`nodeIntegration=false`, `contextIsolation=true`, `sandbox=true` and
`webSecurity=true`. Renderer `require` and `process` are unavailable.

A real demo smoke scores 50 after repeated normal coin/plunger/flipper inputs,
with zero renderer errors. A first single-launch probe timed out at zero score;
one launch is not a deterministic scoring check. No production code or physics
behavior was changed to make the smoke pass.

## Distribution boundary

This is an unsigned, unnotarized local validation package. No release was
published and no cabinet deployment was performed. Existing installations keep
their previous embedded runtime until rebuilt packages are distributed.
Windows/Linux packaging, physical cabinet input/multiscreen behavior, signing,
notarization and update installation still need their release validation.

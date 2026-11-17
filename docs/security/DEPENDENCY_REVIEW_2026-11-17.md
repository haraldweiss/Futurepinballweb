# Dependency migration candidate — 17 November 2026

This branch is a review candidate for Dependabot Three.js #52 and TypeScript
#50. It must remain unmerged until the existing full dependency audit gate
passes. No release, installation, cabinet deployment, or site deployment is
authorized by this candidate.

## Current upstream blockers

- [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)
  affects picomatch through 4.0.7. The advisory currently lists no patched
  version; npm's latest version is 4.0.7 and its 4.0.8 tarball returns 404.
  The full audit reports 17 propagated high development findings, while the
  production audit is clean. No thresholds, exceptions, or suppressions were
  changed. Wait for a supported upstream fix, refresh the lock, and repeat the
  complete gate before merging.
- Electron #49 requests 45.3.2, but the configured Windows NSIS target includes
  ia32. [Electron 44 and later remove Windows 32-bit binaries](https://www.electronjs.org/blog/electron-44-0).
  Electron 43 is the last supported series for that target, until January 2027.
  Keep 43.8.7 and the existing targets; a platform-policy change requires a
  separate decision. The ordinary web CI does not build Windows installers,
  so a green web job does not establish Electron 45 packaging compatibility.

## Supported TypeScript 7 integration

The original TypeScript #50 head fails `npm ci` with ERESOLVE:
typescript-eslint 8.72.x requires TypeScript `>=4.8.4 <6.1.0`, while the PR
replaces that compiler API with TypeScript 7. This was reproduced locally and
matched GitHub's failed Ubuntu job 133454359242.

The candidate uses a normal npm alias, `typescript-native`, for TypeScript
7.0.2. `npm run typecheck` explicitly invokes that native compiler, and
`npm run build` runs it before Vite. Canonical TypeScript 6.0.3 supplies the
[supported compiler API for typescript-eslint](https://typescript-eslint.io/users/dependency-versions/).
Clean lockfile installation uses no `--force`, `--legacy-peer-deps`, peer
overrides, lint-rule removals, or strictness changes. The unused `baseUrl`
option is removed and Node ambient types are explicit, as required by the
native compiler. Both TypeScript 7 and the canonical compiler check cleanly.

## Three.js and runtime evidence

Three.js changes from 0.162.0 to 0.187.0. The upstream
[migration guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)
includes removal of WebGL 1 since r163 and environment-map/PMREM changes.
Validation here covers modern Chrome with WebGL 2 and the existing Electron
43 runtime. It does not establish compatibility on WebGL 1 hardware.

On the original #52 head, strict TypeScript, 972 unit tests, production build,
five security-lint probes, and 20 security checks pass. The existing private
corpus test is skipped because no trusted table paths were supplied. The
production browser tests pass boot/reload and a complete three-ball demo with
positive scoring and saved highscore; two private-corpus browser cases skip.
Security lint has zero errors and 672 existing warnings.

Baseline/candidate screenshots at low, high, and ultra presets show the same
overall output and no new JavaScript or Three.js shader errors in Chrome's
SwiftShader renderer. High/ultra retain the baseline's noisy postprocessing
output in that software renderer; this is not a GPU-quality acceptance test.
Existing local CSP/optional NAS errors occur equally in baseline and candidate.

An unsigned macOS arm64 validation app builds with the normal configuration
and `--publish never`. The running candidate reports Electron 43.8.7 and Node
24.22.1, has three canvases, and preserves `contextIsolation`, `sandbox`, and
`webSecurity`; renderer `require` and `process` are unavailable. It is a local
validation artifact, not a distributed release. Windows/Linux packaging,
hardware input, multiscreen behavior, signing, notarization, and update
installation still require release validation.

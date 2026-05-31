# Task Completion

## Before declaring done, run:
1. `npx tsc --noEmit` — TypeScript type check (strict mode)
2. `npm test` — Vitest (33 files, 691 tests)
3. `npm run build` — Vite production build
4. For Electron: `npm run electron:build` — verify packaging
5. `npm run lint:security` — security scan

## Notes
- Tests cover parser, renderer, physics, script engine
- Build outputs to dist/ for web, release/ for Electron
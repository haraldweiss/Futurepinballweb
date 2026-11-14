# Native script object lookup implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan inline with test-first changes.

**Goal:** Connect named BAM lookups and direct script bindings to the same imported table elements, and diagnose unsupported BAM operations accurately.

**Architecture:** A per-script object registry owns stable identities, imported metadata and extension state. The original-byte import preflight provides metadata before cache/worker/fallback script execution. Existing element adapters remain responsible for their implemented callbacks. BAM material/rotation settings are retained with explicit warnings that native physics is unsupported.

**Tech stack:** Existing TypeScript/Vitest and CFB parser, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-31-fp-native-web-design.md`, script contract/BAM stages; workspace handoff next-work item 1.

## Constraints and review focus

- Continue in the approved `codex/fp-native-compatibility` checkout. Preserve inherited changes and private fixtures. Do not push.
- Named lookup uses case-insensitive full names, stable identities and explicit missing/ambiguous results. It never invents an existing native element from a script token.
- The coordinate FindObject overload remains unsupported until its native semantics are recovered; diagnose it instead of returning zero.
- Imported metadata is available before script execution on cache, worker and fallback routes, and resets on a new import.
- Extension writes survive later lookups within a script, but cannot leak to the next script. Material state is not physics parity.
- No added filesystem/network/DOM capabilities in table scripts.

## Task 1: Registry and script integration

- [x] Add failing synthetic tests for case-insensitive name lookup, missing/ambiguous objects, direct-binding/lookup shared state, extension fields and material diagnostics, unsupported coordinate overload, reset between script sessions and CreateAllExt bindings.
- [x] Add the registry in `src/script/native-objects.ts`, integrate it in `src/script-engine.ts`, retain imported metadata through optional `FPTResources.nativeElements` in `src/types.ts` and set it from original bytes in `src/fpt/file-parser.ts` before route selection. Keep existing user edits in that file intact.
- [x] Add import route tests in `src/__tests__/fpt-import-dependencies.test.ts` for metadata availability/reset.
- [x] Run focused tests, full tests, typecheck, production build and security lint. Review the final task diff with a fresh reviewer and fix actionable findings.
- [x] Run production browser import checks with the private corpus where available; record the remaining AI1 failure accurately, including script-log failures that are caught before pageerror.
- [x] Save results in the private workspace analysis/ledger and public compatibility notes. Do not claim playability or native physics parity.

Results: full suite 1,115 passed / 3 skipped; typecheck/build clean; security lint
0 errors / 711 warnings. Independent TypeScript review's reel-state finding was
reproduced with a failing test and fixed. Private browser check: 2 passed / 1
failed. The remaining NewTable failure is missing native global `nvScore1` during
BeginPlay, newly exposed by checking caught handler failures. AI1 reports
unsupported coordinate lookup; its native initialization remains incomplete.
Next work must implement the native score/persistence contract and recover the
coordinate lookup semantics, rather than weakening these private checks.

Push preparation: inherited element-map changes were excluded. The registry now
uses verified numeric IDs for its supported adapters independently of old kind
labels, with a failing-then-passing regression. Exact staged-tree verification:
1,109 passed / 3 skipped; typecheck/build/lint pass. Browser outcomes above were
observed in the original working tree with inherited changes present.

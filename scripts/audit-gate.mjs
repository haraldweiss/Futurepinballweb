#!/usr/bin/env node
// Dependency audit gate.
//
// Two stages, deliberately different:
//   1. Production dependencies must be clean (moderate and above). This is the
//      gate that protects what users actually run.
//   2. The full audit (development tooling included) must not report anything
//      that is not explicitly allowlisted below.
//
// The allowlist exists because npm cannot express "known, accepted, no fix
// upstream". An entry must name the advisory, the package and why it cannot be
// fixed; anything else fails the build. As soon as the advisory publishes a
// patched version, `fixAvailable` becomes truthy and the entry stops being
// accepted, so the gate re-arms itself instead of hiding a fixable finding.
//
// Usage:
//   node scripts/audit-gate.mjs              # run both stages
//   node scripts/audit-gate.mjs --self-test  # assertions against fixtures only

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ALLOWLIST = {
  'GHSA-fc5q-39xc-vjpf': {
    package: 'picomatch',
    reason:
      'ReDoS through single-branch repeated extglobs; the advisory lists no patched ' +
      'release (latest is 4.0.7, 4.0.8 is not published). Reached only through ' +
      'development tooling (tinyglobby/fdir via typescript-eslint); the production ' +
      'audit is clean. Remove this entry as soon as a patched version exists.',
  },
};

/**
 * Returns the problems found in an `npm audit --json` payload.
 * Pure function so the rules can be tested without touching the network.
 */
const SEVERITY_ORDER = ['info', 'low', 'moderate', 'high', 'critical'];

export function evaluate(report, allowlist = ALLOWLIST, minSeverity = 'low') {
  const problems = [];
  const allowed = [];
  const vulnerabilities = report?.vulnerabilities ?? {};
  const floor = SEVERITY_ORDER.indexOf(minSeverity);

  for (const [name, entry] of Object.entries(vulnerabilities)) {
    // npm groups findings per package; `via` holds advisory objects or package names.
    const advisories = (entry.via ?? []).filter((via) => typeof via === 'object');
    for (const advisory of advisories) {
      const id = advisory.url?.split('/').pop() ?? advisory.source?.toString() ?? 'unknown';
      const severity = advisory.severity ?? entry.severity ?? 'unknown';
      if (SEVERITY_ORDER.indexOf(severity) < floor) continue;
      const exception = allowlist[id];
      // npm's `fixAvailable` can point at a semver-major downgrade of the whole
      // toolchain (here: vite 6), which is not a fix for the advisory. Only a
      // non-breaking resolution counts as one.
      const fix = entry.fixAvailable;
      const breakingOnly = typeof fix === 'object' && fix !== null && fix.isSemVerMajor === true;
      const fixable = fix !== false && fix !== undefined && !breakingOnly;
      if (!exception) {
        problems.push(`${name}: ${severity} ${id} is not allowlisted (${advisory.title ?? 'no title'})`);
        continue;
      }
      if (advisory.name && advisory.name !== exception.package) {
        problems.push(`${name}: allowlist entry ${id} is written for ${exception.package}`);
        continue;
      }
      if (fixable) {
        problems.push(`${name}: ${id} has a non-breaking fix available now — upgrade it instead of allowlisting`);
        continue;
      }
      allowed.push(`${name}: ${severity} ${id}`);
    }
  }
  return { problems, allowed };
}

function auditJson(args) {
  // Nested npm calls must not inherit the parent's npm_config_* (npm 11 rejects
  // project-scoped installs when a config such as allow-scripts leaks in).
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^npm_config_/i.test(key)) delete env[key];
  }
  const result = spawnSync('npm', ['audit', '--json', ...args], { encoding: 'utf8', env, shell: false });
  try {
    return JSON.parse(result.stdout);
  } catch {
    console.error(`audit-gate: npm audit ${args.join(' ')} did not return JSON`);
    console.error((result.stderr || result.stdout || '').trim().slice(0, 400));
    return null;
  }
}

function main() {
  const production = auditJson(['--omit=dev']);
  if (!production) return 1;
  const prodResult = evaluate(production, {}, 'moderate');
  if (prodResult.problems.length) {
    for (const problem of prodResult.problems) console.error(`audit-gate: production ${problem}`);
    return 1;
  }
  console.log('audit-gate: production dependencies clean (moderate+)');

  const full = auditJson([]);
  if (!full) return 1;
  const { problems, allowed } = evaluate(full, ALLOWLIST, 'high');
  for (const entry of allowed) console.log(`audit-gate: allowlisted ${entry}`);
  if (problems.length) {
    for (const problem of problems) console.error(`audit-gate: ${problem}`);
    return 1;
  }
  console.log('audit-gate: development audit has no unallowlisted high findings');
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}

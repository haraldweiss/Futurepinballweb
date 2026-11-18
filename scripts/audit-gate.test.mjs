// Rules of the dependency audit gate. Run with: node --test scripts/audit-gate.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluate } from './audit-gate.mjs';

const advisory = (id, severity = 'high') => ({
  source: 1,
  name: 'picomatch',
  title: 'picomatch vulnerable to ReDoS',
  severity,
  url: `https://github.com/advisories/${id}`,
});

test('a clean report passes', () => {
  assert.deepEqual(evaluate({ vulnerabilities: {} }), { problems: [], allowed: [] });
});

test('an allowlisted advisory without a fix passes and is reported', () => {
  const report = {
    vulnerabilities: {
      picomatch: { severity: 'high', fixAvailable: false, via: [advisory('GHSA-fc5q-39xc-vjpf')] },
    },
  };
  const { problems, allowed } = evaluate(report);
  assert.deepEqual(problems, []);
  assert.equal(allowed.length, 1);
});

test('an unknown advisory fails', () => {
  const report = {
    vulnerabilities: {
      'some-package': { severity: 'critical', fixAvailable: false, via: [advisory('GHSA-aaaa-bbbb-cccc')] },
    },
  };
  assert.equal(evaluate(report).problems.length, 1);
});

test('an allowlisted advisory that now has a non-breaking fix fails', () => {
  const report = {
    vulnerabilities: {
      picomatch: {
        severity: 'high',
        fixAvailable: { name: 'picomatch', version: '4.0.8', isSemVerMajor: false },
        via: [advisory('GHSA-fc5q-39xc-vjpf')],
      },
    },
  };
  const problems = evaluate(report).problems;
  assert.equal(problems.length, 1);
  assert.match(problems[0], /non-breaking fix/);
});

test('a semver-major downgrade is not treated as a fix', () => {
  const report = {
    vulnerabilities: {
      picomatch: {
        severity: 'high',
        fixAvailable: { name: 'vite', version: '6.2.7', isSemVerMajor: true },
        via: [advisory('GHSA-fc5q-39xc-vjpf')],
      },
    },
  };
  assert.deepEqual(evaluate(report).problems, []);
});

test('an allowlist entry is rejected when the advisory belongs to another package', () => {
  const foreign = advisory('GHSA-fc5q-39xc-vjpf');
  foreign.name = 'some-other-package';
  const report = {
    vulnerabilities: {
      'some-other-package': { severity: 'high', fixAvailable: false, via: [foreign] },
    },
  };
  const problems = evaluate(report).problems;
  assert.equal(problems.length, 1);
  assert.match(problems[0], /written for picomatch/);
});

test('findings below the severity floor are ignored', () => {
  const report = {
    vulnerabilities: {
      picomatch: { severity: 'low', fixAvailable: false, via: [advisory('GHSA-unknown-id', 'low')] },
    },
  };
  assert.deepEqual(evaluate(report, {}, 'high').problems, []);
});

test('package-level via strings are ignored, advisory objects are evaluated', () => {
  const report = {
    vulnerabilities: {
      picomatch: {
        severity: 'high',
        fixAvailable: false,
        via: [advisory('GHSA-fc5q-39xc-vjpf'), 'tinyglobby'],
      },
    },
  };
  assert.deepEqual(evaluate(report).problems, []);
});

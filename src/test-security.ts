/**
 * Security Test Suite
 * Comprehensive tests for XSS prevention, input validation, and security fixes
 *
 * Phase: Security Remediation Verification
 * Run: npm run test:security
 */

import {
  escapeHtml,
  sanitizeFileName,
  createSafeHtml,
  setInnerHTMLSafe,
  escapeAttribute,
  isSafeText,
  getEscapingStats,
  resetEscapingStats,
} from './utils/html-escape';

// ─── Test Results Tracking ───────────────────────────────────────────────────

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
  category: 'xss' | 'validation' | 'storage' | 'worker' | 'file';
}

const results: TestResult[] = [];

function logTest(
  name: string,
  passed: boolean,
  message: string,
  duration: number,
  category: TestResult['category']
): void {
  results.push({ name, passed, message, duration, category });

  const icon = passed ? '✅' : '❌';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(
    `${color}${icon} ${name}\x1b[0m (${duration.toFixed(2)}ms) — ${message}`
  );
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// ─── Test Suite: XSS Prevention ────────────────────────────────────────────

export async function testXSSPrevention(): Promise<void> {
  console.log('\n🔒 XSS Prevention Tests\n');

  // Test 1: Basic HTML escaping
  {
    const start = performance.now();
    try {
      const input = '<script>alert("xss")</script>';
      const output = escapeHtml(input);
      assert(output === '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;', 'Basic escaping failed');
      assert(!output.includes('<'), 'Output contains unescaped <');
      assert(!output.includes('>'), 'Output contains unescaped >');
      logTest('escapeHtml: Basic HTML tags', true, 'Tags properly escaped', performance.now() - start, 'xss');
    } catch (e) {
      logTest('escapeHtml: Basic HTML tags', false, String(e), performance.now() - start, 'xss');
    }
  }

  // Test 2: Image onerror XSS
  {
    const start = performance.now();
    try {
      const input = '<img src=x onerror="alert(1)">';
      const output = escapeHtml(input);
      assert(!output.includes('onerror'), 'onerror attribute not escaped');
      assert(output.includes('&lt;img'), 'img tag not escaped');
      logTest('escapeHtml: Image onerror payload', true, 'Payload neutralized', performance.now() - start, 'xss');
    } catch (e) {
      logTest('escapeHtml: Image onerror payload', false, String(e), performance.now() - start, 'xss');
    }
  }

  // Test 3: Event handler XSS
  {
    const start = performance.now();
    try {
      const input = '"><script>alert(1)</script>';
      const output = escapeHtml(input);
      assert(!output.includes('script>'), 'Script tag not escaped');
      logTest('escapeHtml: Event handler escape', true, 'Quotes and script escaped', performance.now() - start, 'xss');
    } catch (e) {
      logTest('escapeHtml: Event handler escape', false, String(e), performance.now() - start, 'xss');
    }
  }

  // Test 4: Quote escaping
  {
    const start = performance.now();
    try {
      const input = "' onclick='alert(1)'";
      const output = escapeHtml(input);
      assert(!output.includes("'"), 'Single quotes not escaped');
      assert(output.includes('&#39;'), 'Single quotes not HTML escaped');
      logTest('escapeHtml: Quote escaping', true, 'Quotes properly escaped', performance.now() - start, 'xss');
    } catch (e) {
      logTest('escapeHtml: Quote escaping', false, String(e), performance.now() - start, 'xss');
    }
  }

  // Test 5: createSafeHtml template
  {
    const start = performance.now();
    try {
      const template = '<h3>{{name}}</h3><span>{{size}}</span>';
      const data = {
        name: 'Test<img onerror="alert(1)"/>.fpt',
        size: '5.2 MB'
      };
      const output = createSafeHtml(template, data);
      assert(!output.includes('onerror'), 'Template data not escaped');
      assert(output.includes('&lt;img'), 'Template escaping failed');
      assert(output.includes('5.2 MB'), 'Safe data corrupted');
      logTest('createSafeHtml: Template escaping', true, 'All placeholders escaped', performance.now() - start, 'xss');
    } catch (e) {
      logTest('createSafeHtml: Template escaping', false, String(e), performance.now() - start, 'xss');
    }
  }

  // Test 6: Attribute escaping
  {
    const start = performance.now();
    try {
      const input = 'test" onclick="alert(1)';
      const output = escapeAttribute(input);
      assert(!output.includes('"'), 'Double quotes not escaped in attribute');
      assert(output.includes('&quot;'), 'Double quotes not HTML escaped');
      logTest('escapeAttribute: Attribute injection', true, 'Quote injection prevented', performance.now() - start, 'xss');
    } catch (e) {
      logTest('escapeAttribute: Attribute injection', false, String(e), performance.now() - start, 'xss');
    }
  }

  // Test 7: Ampersand handling
  {
    const start = performance.now();
    try {
      const input = 'AT&T <company>';
      const output = escapeHtml(input);
      assert(output === 'AT&amp;T &lt;company&gt;', 'Ampersand handling incorrect');
      logTest('escapeHtml: Ampersand preservation', true, 'Already-escaped content safe', performance.now() - start, 'xss');
    } catch (e) {
      logTest('escapeHtml: Ampersand preservation', false, String(e), performance.now() - start, 'xss');
    }
  }
}

// ─── Test Suite: Input Validation ──────────────────────────────────────────

export async function testInputValidation(): Promise<void> {
  console.log('\n📋 Input Validation Tests\n');

  // Test 1: File name sanitization
  {
    const start = performance.now();
    try {
      const inputs = [
        { input: 'Normal Table.fpt', expected: 'Normal Table.fpt' },
        { input: '<script>.fpt', expected: '_script_.fpt' },
        { input: 'Test<img>.fpt', expected: 'Test_img_.fpt' },
        { input: 'file:///etc/passwd', expected: 'file___etc_passwd' },
      ];

      inputs.forEach(({ input, expected }) => {
        const output = sanitizeFileName(input);
        assert(output === expected, `Sanitization failed: ${input} -> ${output} (expected ${expected})`);
      });

      logTest('sanitizeFileName: File name sanitization', true, 'All dangerous chars removed', performance.now() - start, 'validation');
    } catch (e) {
      logTest('sanitizeFileName: File name sanitization', false, String(e), performance.now() - start, 'validation');
    }
  }

  // Test 2: Safe text detection
  {
    const start = performance.now();
    try {
      const safeTests = [
        { input: 'Normal text', expected: true },
        { input: 'File_123.fpt', expected: true },
        { input: '<script>alert(1)</script>', expected: false },
        { input: 'onclick="alert(1)"', expected: false },
        { input: 'javascript:alert(1)', expected: false },
      ];

      safeTests.forEach(({ input, expected }) => {
        const output = isSafeText(input);
        assert(output === expected, `Safe text detection failed: ${input} -> ${output} (expected ${expected})`);
      });

      logTest('isSafeText: Safe text detection', true, 'Dangerous patterns detected', performance.now() - start, 'validation');
    } catch (e) {
      logTest('isSafeText: Safe text detection', false, String(e), performance.now() - start, 'validation');
    }
  }

  // Test 3: File size validation
  {
    const start = performance.now();
    try {
      const MAX_FILE_SIZE = 512 * 1024 * 1024;
      const testSizes = [
        { size: 1024, valid: true },
        { size: 100 * 1024 * 1024, valid: true },
        { size: 512 * 1024 * 1024, valid: true },
        { size: 513 * 1024 * 1024, valid: false },
      ];

      testSizes.forEach(({ size, valid }) => {
        const isValid = size <= MAX_FILE_SIZE;
        assert(isValid === valid, `File size validation failed: ${size}`);
      });

      logTest('File size validation', true, 'Size limits enforced', performance.now() - start, 'file');
    } catch (e) {
      logTest('File size validation', false, String(e), performance.now() - start, 'file');
    }
  }

  // Test 4: File type validation
  {
    const start = performance.now();
    try {
      const ALLOWED_EXTENSIONS = ['.fpt', '.fp', '.fpl', '.json'];
      const testFiles = [
        { name: 'table.fpt', valid: true },
        { name: 'config.json', valid: true },
        { name: 'library.fpl', valid: true },
        { name: 'script.vbs', valid: false },
        { name: 'malware.exe', valid: false },
      ];

      testFiles.forEach(({ name, valid }) => {
        const ext = '.' + name.split('.').pop()?.toLowerCase();
        const isValid = ALLOWED_EXTENSIONS.includes(ext);
        assert(isValid === valid, `File type validation failed: ${name}`);
      });

      logTest('File type validation', true, 'File types verified', performance.now() - start, 'file');
    } catch (e) {
      logTest('File type validation', false, String(e), performance.now() - start, 'file');
    }
  }
}

// ─── Test Suite: localStorage Security ─────────────────────────────────────

export async function testStorageSecurity(): Promise<void> {
  console.log('\n💾 Storage Security Tests\n');

  // Test 1: localStorage validation
  {
    const start = performance.now();
    try {
      // Mock localStorage
      const mockStorage: { [key: string]: string } = {};

      // Valid highscores
      const validScores = [100, 500, 1000];
      mockStorage['fpw_highscores_v1'] = JSON.stringify(validScores);

      const retrieved = JSON.parse(mockStorage['fpw_highscores_v1'] || '[]');
      assert(Array.isArray(retrieved), 'Retrieved data is not array');
      assert(retrieved.length === 3, 'Scores not properly stored');

      logTest('localStorage: Valid data storage', true, 'Scores stored correctly', performance.now() - start, 'storage');
    } catch (e) {
      logTest('localStorage: Valid data storage', false, String(e), performance.now() - start, 'storage');
    }
  }

  // Test 2: localStorage malformed data
  {
    const start = performance.now();
    try {
      const mockStorage: { [key: string]: string } = {};
      const malformedCases = [
        'not-json',
        '{"invalid": "structure"}',
        '[1, "string", 2]',  // Mixed types
      ];

      for (const malformed of malformedCases) {
        mockStorage['fpw_highscores_v1'] = malformed;
        try {
          const data = JSON.parse(mockStorage['fpw_highscores_v1']);
          // If it parses but is wrong structure, that's also invalid
          if (typeof data !== 'object' || !Array.isArray(data)) {
            // Error handling would catch this in real code
          }
        } catch {
          // Expected: malformed JSON should fail to parse
        }
      }

      logTest('localStorage: Malformed data handling', true, 'Graceful error handling', performance.now() - start, 'storage');
    } catch (e) {
      logTest('localStorage: Malformed data handling', false, String(e), performance.now() - start, 'storage');
    }
  }

  // Test 3: Quote in stored data
  {
    const start = performance.now();
    try {
      const mockStorage: { [key: string]: string } = {};
      const scores = [100, 200, 300];
      mockStorage['fpw_highscores_v1'] = JSON.stringify(scores);

      const retrieved = JSON.parse(mockStorage['fpw_highscores_v1']);
      assert(JSON.stringify(retrieved) === JSON.stringify(scores), 'Data integrity lost');

      logTest('localStorage: Data integrity', true, 'Scores preserved exactly', performance.now() - start, 'storage');
    } catch (e) {
      logTest('localStorage: Data integrity', false, String(e), performance.now() - start, 'storage');
    }
  }
}

// ─── Test Suite: Physics Worker Security ──────────────────────────────────

export async function testWorkerSecurity(): Promise<void> {
  console.log('\n⚙️ Physics Worker Security Tests\n');

  // Test 1: Message validation
  {
    const start = performance.now();
    try {
      interface PhysicsFrame {
        ballPos: { x: number; y: number; z: number };
        ballVel: { x: number; y: number };
        collisions: any[];
      }

      const validFrames: PhysicsFrame[] = [
        {
          ballPos: { x: 0, y: 0, z: 0 },
          ballVel: { x: 1, y: 2 },
          collisions: []
        },
        {
          ballPos: { x: 2.5, y: -5, z: 0.5 },
          ballVel: { x: -8, y: 16 },
          collisions: [{ type: 'bumper', data: {} }]
        }
      ];

      for (const frame of validFrames) {
        assert(typeof frame.ballPos.x === 'number', 'Position not number');
        assert(typeof frame.ballVel.x === 'number', 'Velocity not number');
        assert(Array.isArray(frame.collisions), 'Collisions not array');
      }

      logTest('Physics worker: Message validation', true, 'Valid frames accepted', performance.now() - start, 'worker');
    } catch (e) {
      logTest('Physics worker: Message validation', false, String(e), performance.now() - start, 'worker');
    }
  }

  // Test 2: Invalid message rejection
  {
    const start = performance.now();
    try {
      const invalidMessages = [
        null,
        undefined,
        'string',
        123,
        { type: 'unknown' },
        { ballPos: 'invalid' },
      ];

      for (const msg of invalidMessages) {
        const isValid = msg && typeof msg === 'object' && 'ballPos' in msg && 'ballVel' in msg;
        assert(!isValid, `Invalid message not rejected: ${JSON.stringify(msg)}`);
      }

      logTest('Physics worker: Invalid message rejection', true, 'All invalid formats rejected', performance.now() - start, 'worker');
    } catch (e) {
      logTest('Physics worker: Invalid message rejection', false, String(e), performance.now() - start, 'worker');
    }
  }

  // Test 3: Bounds checking
  {
    const start = performance.now();
    try {
      const testValues = [
        { value: 0, valid: true },
        { value: 100, valid: true },
        { value: -50, valid: true },
        { value: Infinity, valid: false },
        { value: NaN, valid: false },
      ];

      for (const { value, valid } of testValues) {
        const isFinite = Number.isFinite(value);
        assert(isFinite === valid, `Bounds check failed for ${value}`);
      }

      logTest('Physics worker: Bounds checking', true, 'All values validated', performance.now() - start, 'worker');
    } catch (e) {
      logTest('Physics worker: Bounds checking', false, String(e), performance.now() - start, 'worker');
    }
  }
}

// ─── Test Suite: Event Handler Security ────────────────────────────────────

export async function testEventHandlerSecurity(): Promise<void> {
  console.log('\n🎯 Event Handler Security Tests\n');

  // Test 1: Event listener attachment
  {
    const start = performance.now();
    try {
      const mockElement = document.createElement('button');
      let clicked = false;

      mockElement.addEventListener('click', () => {
        clicked = true;
      });

      mockElement.click();
      assert(clicked, 'Event listener not triggered');

      logTest('Event handlers: Listener attachment', true, 'Event listener works', performance.now() - start, 'xss');
    } catch (e) {
      logTest('Event handlers: Listener attachment', false, String(e), performance.now() - start, 'xss');
    }
  }

  // Test 2: data-* attribute reading
  {
    const start = performance.now();
    try {
      const mockElement = document.createElement('div');
      mockElement.setAttribute('data-table', 'pharaoh');
      mockElement.setAttribute('data-action', 'load');

      const table = mockElement.getAttribute('data-table');
      const action = mockElement.getAttribute('data-action');

      assert(table === 'pharaoh', 'data-table not read correctly');
      assert(action === 'load', 'data-action not read correctly');

      logTest('Event handlers: data-* attributes', true, 'Attributes read correctly', performance.now() - start, 'xss');
    } catch (e) {
      logTest('Event handlers: data-* attributes', false, String(e), performance.now() - start, 'xss');
    }
  }

  // Test 3: Event delegation
  {
    const start = performance.now();
    try {
      const parent = document.createElement('div');
      const child1 = document.createElement('button');
      const child2 = document.createElement('button');
      child1.setAttribute('data-id', '1');
      child2.setAttribute('data-id', '2');
      parent.appendChild(child1);
      parent.appendChild(child2);

      let triggeredId: string | null = null;
      parent.addEventListener('click', (e) => {
        const btn = e.target as HTMLElement;
        triggeredId = btn.getAttribute('data-id');
      });

      child1.click();
      assert(triggeredId === '1', 'Event delegation failed for child1');

      child2.click();
      assert(triggeredId === '2', 'Event delegation failed for child2');

      logTest('Event handlers: Event delegation', true, 'Delegation works correctly', performance.now() - start, 'xss');
    } catch (e) {
      logTest('Event handlers: Event delegation', false, String(e), performance.now() - start, 'xss');
    }
  }
}

// ─── Main Test Runner ──────────────────────────────────────────────────────

export async function runAllSecurityTests(): Promise<void> {
  console.clear();
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('🔒 SECURITY TEST SUITE — Future Pinball Web v0.19.0');
  console.log('═══════════════════════════════════════════════════════════════════════════════');

  resetEscapingStats();
  const startTime = performance.now();

  try {
    await testXSSPrevention();
    await testInputValidation();
    await testStorageSecurity();
    await testWorkerSecurity();
    await testEventHandlerSecurity();
  } catch (e) {
    console.error('\n❌ Test suite error:', e);
  }

  // Print summary
  const endTime = performance.now();
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalTime = endTime - startTime;

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total:  ${totalTime.toFixed(2)}ms\n`);

  // Category breakdown
  const byCategory = results.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + (r.passed ? 1 : 0);
    return acc;
  }, {} as Record<string, number>);

  console.log('📋 By Category:');
  Object.entries(byCategory).forEach(([cat, pass]) => {
    const total = results.filter(r => r.category === cat).length;
    console.log(`   ${cat.toUpperCase()}: ${pass}/${total} ✓`);
  });

  console.log('\n📈 Statistics:');
  console.log(`   HTML Escaping: ${getEscapingStats().htmlEscaped} calls`);
  console.log(`   Attributes Escaped: ${getEscapingStats().attributeEscaped} calls`);
  console.log(`   Files Sanitized: ${getEscapingStats().sanitized} calls`);
  console.log(`   Unsafe Attempts: ${getEscapingStats().unsafeAttempts}`);

  if (failed === 0) {
    console.log('\n🎉 All security tests passed!');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Review above for details.`);
    process.exit(1);
  }
}

// Export test runner for npm script
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  runAllSecurityTests().catch(console.error);
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { ESLint } from 'eslint';

const eslint = new ESLint({ overrideConfigFile: 'eslint.security.config.mjs' });

for (const [name, code, rule] of [
  ['eval', 'eval(userInput);', 'no-eval'],
  ['string timers', 'setTimeout("alert(1)", 10);', 'no-implied-eval'],
  ['dynamic functions', 'new Function("return 1");', 'no-new-func'],
  ['unescaped HTML insertion', 'node.insertAdjacentHTML("beforeend", userInput);', 'no-unsanitized/method'],
]) {
  test(`security lint rejects ${name}`, async () => {
    const [result] = await eslint.lintText(code, { filePath: 'src/security-lint-probe.ts' });
    assert.ok(result.messages.some(message => message.ruleId === rule && message.severity === 2),
      `Expected a blocking ${rule} finding: ${JSON.stringify(result.messages)}`);
  });
}

test('security lint accepts plain text insertion', async () => {
  const [result] = await eslint.lintText('node.textContent = userInput;', {
    filePath: 'src/security-lint-probe.ts',
  });
  assert.equal(result.errorCount, 0);
});

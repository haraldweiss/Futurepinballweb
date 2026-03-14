# 🔒 Security CI/CD Setup Guide
**Future Pinball Web v0.19.0** | **Date**: 2026-03-13

---

## Overview

This guide explains how to set up automated security checking in your CI/CD pipeline and local development workflow.

**Features**:
- ✅ Automated XSS pattern detection
- ✅ Dependency vulnerability scanning
- ✅ ESLint security rules enforcement
- ✅ Pre-commit security hooks
- ✅ GitHub Actions security workflow

---

## Part 1: Local Development Setup

### Step 1.1: Install Security Dependencies

```bash
npm install
# The following packages are now included:
# - eslint-plugin-security: XSS, injection detection
# - eslint-plugin-no-unsanitized: HTML escaping checks
# - @typescript-eslint/eslint-plugin: TypeScript linting
```

### Step 1.2: Run Security Tests Locally

```bash
# Run all security tests
npm run test:security

# Expected output:
# ✅ 20+ security tests passing
# ✅ XSS prevention verified
# ✅ Input validation tested
# ✅ Storage security checked
```

### Step 1.3: Run Security Linting

```bash
# Check for security issues with ESLint
npm run lint:security

# Fix auto-fixable issues
npm run lint:security

# Check for vulnerable dependencies
npm run audit:dependencies

# Run all security checks
npm run security:check
```

### Step 1.4: Set Up Pre-commit Hooks (Optional)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "🔒 Running security checks before commit..."

# Run security tests
npm run test:security
if [ $? -ne 0 ]; then
  echo "❌ Security tests failed. Commit aborted."
  exit 1
fi

# Run security linting
npm run lint:security
if [ $? -ne 0 ]; then
  echo "❌ Security linting failed. Commit aborted."
  exit 1
fi

# Check dependencies
npm run audit:dependencies
if [ $? -ne 0 ]; then
  echo "⚠️ Vulnerable dependencies found. Review above."
  # Don't fail here, just warn
fi

echo "✅ Security checks passed!"
exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## Part 2: GitHub Actions Workflow

### Step 2.1: Workflow File Location

The workflow file is already configured:
```
.github/workflows/security.yml
```

### Step 2.2: What the Workflow Does

**On every push to `main` or `develop`:**

1. ✅ Runs ESLint with security rules
2. ✅ Checks for vulnerable dependencies
3. ✅ Executes security test suite
4. ✅ Scans for XSS patterns
5. ✅ Verifies CSP header configuration
6. ✅ Generates security report

**On every pull request:**

1. All of the above plus:
2. ✅ Posts security check results as PR comment
3. ✅ Blocks merge if critical issues found
4. ✅ Uploads artifacts for review

### Step 2.3: View Security Check Results

**In GitHub UI**:
1. Go to your PR or commit
2. Click "Checks" tab
3. Click "Security Checks" to expand
4. Review results and artifacts

**Download Artifacts**:
1. Go to workflow run
2. Scroll to "Artifacts" section
3. Download `security-reports.zip`
4. Contains:
   - `eslint-report.json` — Linting results
   - `audit-report.txt` — Dependency audit
   - `security-test-report.txt` — Test results

---

## Part 3: Security Rules Explained

### 3.1 ESLint Security Rules

The `.eslintrc.security.json` file enforces these rules:

| Rule | Purpose | Example |
|------|---------|---------|
| `no-eval` | Blocks dangerous eval() | ❌ eval('dangerous code') |
| `security/detect-non-literal-regexp` | Warns on dynamic regex | ⚠️ RegExp(userInput) |
| `no-unsanitized/method` | Checks innerHTML, textContent | ❌ el.innerHTML = userInput |
| `@typescript-eslint/explicit-function-return-types` | Type safety | ✅ function foo(): string {} |

**Severity Levels**:
- 🔴 `error` — Build fails, must fix
- 🟡 `warn` — Build passes, but should review

### 3.2 Running Specific Security Checks

```bash
# Just check for eval() usage
npm run lint:security -- --rule "no-eval"

# Check only security plugin rules
npm run lint:security -- --plugin security

# Check specific file
npm run lint:security -- src/main.ts

# Generate report in different format
npm run lint:security -- --format html --output-file report.html
```

---

## Part 4: Interpreting Security Reports

### 4.1 ESLint Report Format

```json
{
  "filePath": "src/main.ts",
  "messages": [
    {
      "ruleId": "no-unsanitized/method",
      "severity": 2,
      "message": "Unsafe assignment to innerHTML",
      "line": 2776,
      "column": 5,
      "fix": {
        "range": [123, 456],
        "text": "innerHTML = escapeHtml(userInput)"
      }
    }
  ]
}
```

**Interpretation**:
- `severity: 2` = Error (must fix)
- `severity: 1` = Warning (should review)
- `line` = Line number in file
- `fix` = Suggested fix (if available)

### 4.2 Dependency Audit Format

```json
{
  "vulnerabilities": {
    "module-name": {
      "via": [
        {
          "source": 1234567,
          "type": "vulnerability",
          "title": "XSS in module",
          "severity": "high",
          "recommendation": "Upgrade to version X.Y.Z",
          "url": "https://nvd.nist.gov/vuln/detail/CVE-YYYY-NNNNN"
        }
      ]
    }
  },
  "metadata": {
    "vulnerabilities": {
      "critical": 0,
      "high": 0,
      "moderate": 1,
      "low": 0,
      "info": 0
    }
  }
}
```

**What to Do**:
- 🔴 `critical` → Fix immediately
- 🔴 `high` → Fix ASAP
- 🟡 `moderate` → Fix this sprint
- 🟢 `low` → Plan for next sprint

### 4.3 Security Test Report

```
✅ XSS Prevention Tests

✅ escapeHtml: Basic HTML tags (1.23ms) — Tags properly escaped
✅ escapeHtml: Image onerror payload (0.89ms) — Payload neutralized
❌ isSafeText: Safe text detection (2.34ms) — Assertion failed: ...

📊 TEST SUMMARY
═════════════════
✅ Passed: 18
❌ Failed: 1
⏱️  Total:  45.67ms
```

---

## Part 5: Remediation Workflow

### 5.1 When Security Issues Are Found

**Step 1: Read the Error Message**
```
❌ no-unsanitized/method
src/main.ts(2776,5): Unsafe assignment to innerHTML

Suggested fix:
innerHTML = escapeHtml(value)
```

**Step 2: Review the Context**
```typescript
// ❌ BEFORE
loadBtn.innerHTML = `▶ ${fileName} LADEN`;

// ✅ AFTER
loadBtn.innerHTML = `▶ ${escapeHtml(fileName)} LADEN`;
```

**Step 3: Apply Fix**
```bash
# Auto-fix if available
npm run lint:security -- --fix

# Or manually edit the file
```

**Step 4: Verify Fix**
```bash
# Re-run linting
npm run lint:security

# Run tests
npm run test:security

# Commit the fix
git add .
git commit -m "fix: Escape user input in file name display (security fix)"
```

### 5.2 Handling False Positives

Sometimes ESLint flags safe code as unsafe.

**Example: Safe innerHTML**
```typescript
// ❌ ESLint warns about this (even though it's safe template)
element.innerHTML = `<h3>{{name}}</h3>`;  // Template, no user data

// ✅ Fix: Use a comment to suppress
// eslint-disable-next-line no-unsanitized/method
element.innerHTML = template;

// ✅ Better: Use the utility function
setInnerHTMLSafe(element, template, { name: userData });
```

---

## Part 6: Continuous Improvement

### 6.1 Monthly Security Audit

Set a calendar reminder to:

```bash
# First Friday of every month
npm audit --production  # Check production dependencies only
npm outdated           # See if security patches available
npm run test:security  # Run full security suite

# Document findings
echo "Security audit: $(date)" >> SECURITY_LOG.md
npm audit >> SECURITY_LOG.md
```

### 6.2 Quarterly Security Review

Schedule a team meeting to:

1. Review GitHub Actions security logs
2. Check for new vulnerability types
3. Update ESLint rules if needed
4. Train team on latest security practices

### 6.3 Annual Penetration Testing

Consider hiring external security firm to:

1. Perform penetration testing
2. Review code for vulnerabilities
3. Provide recommendations
4. Certify security compliance

---

## Part 7: Troubleshooting

### Issue: "npm run test:security" fails

**Solution**:
```bash
# Make sure dependencies are installed
npm install

# Clear cache and reinstall
rm -rf node_modules
npm install

# Try again
npm run test:security
```

### Issue: ESLint reports false positives

**Solution**:
```bash
# Check eslintignore
cat .eslintignore

# Ignore specific files if needed
echo "src/vendor/*" >> .eslintignore

# Or suppress specific rules in file
// eslint-disable-next-line rule-name
const code = unsafe;  // Only if you're sure it's safe
```

### Issue: GitHub Actions workflow not running

**Solution**:
1. Check branch name (workflow only runs on `main` or `develop`)
2. Verify `.github/workflows/security.yml` exists
3. Check GitHub repo settings → Actions → Permissions
4. Verify `.git/workflows/security.yml` syntax: `npm run lint:security -- .github/workflows/security.yml` (only lints TypeScript)

### Issue: Dependency audit shows vulnerabilities but can't upgrade

**Solution**:
```bash
# Check which package depends on the vulnerable module
npm ls vulnerable-module

# If locked by another dependency, consider:
# 1. Wait for upstream fix
# 2. Fork and maintain patch
# 3. Find alternative library

# Suppress for now (document reason)
npm audit --json | jq '.metadata' >> .npmauditignore
```

---

## Part 8: Security Commands Reference

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production

# Security Testing
npm run test:security          # Run security test suite
npm run lint:security          # Run ESLint security rules
npm run audit:dependencies     # Check for vulnerable packages
npm run security:check         # Run all three above

# CI/CD (GitHub Actions)
# Automatically runs on push/PR to main or develop

# Manual Local Simulation
# Simulate what GitHub Actions will run:
npm install
npm run build
npm run test:security
npm run lint:security
npm run audit:dependencies
```

---

## Part 9: Integration with Your Workflow

### 9.1 Before Committing

```bash
# Check security before each commit
npm run security:check

# If any failures, fix them before committing
# This prevents insecure code from entering the repo
```

### 9.2 Before Creating PR

```bash
# Ensure all checks pass
npm run security:check

# Create PR with clean security report
git push origin feature-branch
# GitHub Actions will run automatically
```

### 9.3 Code Review Checklist

When reviewing PR, check:
- ✅ GitHub Actions security checks pass
- ✅ No new `innerHTML` assignments with user data
- ✅ All user input is escaped via `escapeHtml()`
- ✅ No `eval()` or `new Function()` usage
- ✅ TypeScript types are explicit (no `any`)

---

## Part 10: Next Steps

1. ✅ Run initial security checks
   ```bash
   npm install
   npm run security:check
   ```

2. ✅ Fix any issues found
   ```bash
   npm run lint:security -- --fix
   ```

3. ✅ Set up pre-commit hooks (optional but recommended)
   ```bash
   chmod +x .git/hooks/pre-commit
   ```

4. ✅ Create PR and verify GitHub Actions passes
   ```bash
   git push origin feature-branch
   # Check GitHub Actions results
   ```

5. ✅ Merge when all checks pass
   ```bash
   git checkout main
   git merge feature-branch
   ```

---

## Support & Questions

**Questions about security checks?**
- Read SECURITY_REVIEW.md (technical details)
- Check SECURITY_REMEDIATION_GUIDE.md (implementation)
- Review this file for setup instructions

**Report security bugs?**
- Follow responsible disclosure in SECURITY.md (if exists)
- Or email security team directly

**Update security rules?**
- Edit `.eslintrc.security.json` to add/remove rules
- Update `src/test-security.ts` for new test cases
- Update `.github/workflows/security.yml` for new checks

---

**Last Updated**: 2026-03-13
**Maintainer**: Security Team
**Review Schedule**: Quarterly

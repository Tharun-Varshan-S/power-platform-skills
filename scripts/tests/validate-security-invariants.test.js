'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

test('all scripts that call az account get-access-token must also import shared validation helper', () => {
  const repoRoot = path.resolve(__dirname, '..', '..');

  // Find all JS files in the repository that contain "az account get-access-token", ignoring tests, node_modules, .git, etc.
  const stdout = execSync(
    'git grep -l "az account get-access-token" -- "*.js" ":!*/tests/*" ":!*/tests/**/*" || true',
    { cwd: repoRoot, encoding: 'utf8' }
  );

  const files = stdout.trim().split('\n').filter(Boolean);
  if (files.length === 0) {
    return; // No files found, nothing to assert
  }

  const failures = [];

  for (const file of files) {
    const fullPath = path.join(repoRoot, file);
    const content = fs.readFileSync(fullPath, 'utf8');

    // It must either be the validation helper itself or require it.
    // The validation helpers define or require `validateDataverseEnvironmentUrl` (or dataverseOrigin for model-apps).
    // Let's check if the file references 'validateDataverseEnvironmentUrl', 'validateDataverseApiPath', 'dataverseOrigin', or 'requireDataverseOrigin'.
    
    // We check that the file enforces origin checks.
    const hasSharedValidator = 
      content.includes('validateDataverseEnvironmentUrl') ||
      content.includes('dataverseOrigin') ||
      content.includes('requireDataverseOrigin');

    if (!hasSharedValidator) {
      failures.push(file);
    }
  }

  assert.deepEqual(
    failures,
    [],
    'The following scripts acquire tokens but do not use the shared environment/origin validation helper. ' +
    'To prevent unvalidated API path concatenation and origin bypasses, any script acquiring a token must validate the origin.'
  );
});

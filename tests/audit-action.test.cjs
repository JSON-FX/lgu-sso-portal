/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('dashboard event labels cover directory and SSO events without throwing', async () => {
  const { auditActionLabel, auditActionLabels } = await import('../lib/audit-action.ts');
  for (const action of Object.keys(auditActionLabels)) {
    assert.equal(typeof auditActionLabel(action).toLowerCase(), 'string');
  }
  assert.equal(auditActionLabel('office_updated'), 'Office updated');
  assert.equal(auditActionLabel('position_created'), 'Position created');
  assert.equal(auditActionLabel('login'), 'Signed in');
});

test('future or malformed server actions have safe event labels', async () => {
  const { auditActionLabel } = await import('../lib/audit-action.ts');
  assert.equal(auditActionLabel('employee_archived'), 'Employee Archived');
  for (const action of [null, undefined, '', '  ', '__', 123]) {
    assert.equal(auditActionLabel(action), 'Unknown event');
  }
  assert.equal(auditActionLabel('constructor'), 'Constructor');
});

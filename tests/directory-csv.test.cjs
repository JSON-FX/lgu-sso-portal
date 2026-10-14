/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('exports full directory columns with RFC 4180 escaping and safe spreadsheet cells', async () => {
  const { directoryCsv } = await import('../lib/directory-csv.ts');
  const csv = directoryCsv(['id', 'title', 'is_active'], [
    [12, 'Planning, Records "Unit"\nNorth', true],
    [13, '=HYPERLINK("bad")', false],
    [14, '  +SUM(1,1)', true],
  ]);
  assert.equal(csv, '\uFEFF"id","title","is_active"\r\n' +
    '"12","Planning, Records ""Unit""\nNorth","true"\r\n' +
    '"13","\'=HYPERLINK(""bad"")","false"\r\n' +
    '"14","\'  +SUM(1,1)","true"\r\n');
});

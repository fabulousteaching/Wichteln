'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test('Auslosung und Hilfsfunktionen (PHP)', () => {
  const out = execFileSync('php', [path.join(__dirname, 'draw_check.php')]).toString().trim();
  assert.equal(out, 'ok');
});

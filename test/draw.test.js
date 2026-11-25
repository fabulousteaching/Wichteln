'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { drawCircle, paradeTiming } = require('../src/draw');

test('Auslosung: niemand beschenkt sich selbst, jede Person genau einmal', () => {
  for (let n = 3; n <= 30; n++) {
    const ids = Array.from({ length: n }, (_, i) => i + 1);
    for (let run = 0; run < 30; run++) {
      const map = drawCircle(ids);
      assert.equal(map.size, n);
      assert.deepEqual([...map.values()].sort((a, b) => a - b), ids);
      for (const [giver, giftee] of map) {
        assert.notEqual(giver, giftee);
        assert.notEqual(map.get(giftee), giver, 'keine gegenseitigen Paare');
      }
    }
  }
});

test('Auslosung: ein einziger Kreis über alle Kinder', () => {
  const ids = Array.from({ length: 12 }, (_, i) => `k${i}`);
  const map = drawCircle(ids);
  const seen = new Set();
  let current = ids[0];
  while (!seen.has(current)) {
    seen.add(current);
    current = map.get(current);
  }
  assert.equal(seen.size, ids.length);
});

test('Auslosung braucht mindestens 3 Kinder', () => {
  assert.throws(() => drawCircle([1, 2]), /mindestens 3/);
});

test('Parade-Zeitplan bleibt in vernünftigem Rahmen', () => {
  for (const n of [0, 1, 3, 10, 25, 60]) {
    const t = paradeTiming(n);
    assert.ok(t.total >= 1500 && t.total < 60000, `n=${n} total=${t.total}`);
  }
});

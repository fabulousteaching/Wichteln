'use strict';

const crypto = require('node:crypto');

const MIN_CHILDREN = 3;

/** Fisher-Yates mit kryptografisch sicherem Zufall. */
function shuffle(list, randomInt = crypto.randomInt) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Lost einen einzigen grossen Kreis aus: A → B → C → … → A.
 * Dadurch beschenkt niemand sich selbst und es gibt keine Paare, die sich
 * gegenseitig beschenken (ab 3 Kindern).
 *
 * @returns {Map<id, id>} schenkende Person → beschenkte Person
 */
function drawCircle(ids, randomInt = crypto.randomInt) {
  if (ids.length < MIN_CHILDREN) {
    throw new Error(`Für die Auslosung braucht es mindestens ${MIN_CHILDREN} Kinder.`);
  }
  const order = shuffle(ids, randomInt);
  const result = new Map();
  order.forEach((id, i) => result.set(id, order[(i + 1) % order.length]));
  return result;
}

/**
 * Zeitplan der Wichtel-Parade am Beamer. Die Tablets zeigen ihren Zettel erst,
 * wenn alle Wichtel vom Beamer weggelaufen sind.
 */
function paradeTiming(giftCount) {
  const n = Math.max(0, giftCount);
  const lead = 900;
  const cycle = 6500;
  const outro = 800;
  const stagger = n > 1 ? Math.min(700, Math.max(250, Math.round(7000 / n))) : 0;
  const total = n === 0 ? lead + 1200 : lead + (n - 1) * stagger + cycle + outro;
  return { count: n, lead, stagger, cycle, total };
}

module.exports = { MIN_CHILDREN, shuffle, drawCircle, paradeTiming };

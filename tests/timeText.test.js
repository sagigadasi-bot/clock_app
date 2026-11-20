import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeToHebrew, allPhrasings, digital, toT, fromT, minuteWords } from '../js/timeText.js';
import { LEVELS, randomTime, distractors } from '../js/levels.js';

test('numeric style', () => {
  assert.equal(timeToHebrew(7, 0), 'שבע');
  assert.equal(timeToHebrew(7, 30), 'שבע ושלושים');
  assert.equal(timeToHebrew(7, 15), 'שבע וחמש עשרה');
  assert.equal(timeToHebrew(7, 45), 'שבע ארבעים וחמש');
  assert.equal(timeToHebrew(7, 5), 'שבע וחמש');
  assert.equal(timeToHebrew(12, 20), 'שתים עשרה ועשרים');
  assert.equal(timeToHebrew(2, 22), 'שתיים עשרים ושתיים');
});

test('words style', () => {
  assert.equal(timeToHebrew(7, 30, 'words'), 'שבע וחצי');
  assert.equal(timeToHebrew(7, 15, 'words'), 'שבע ורבע');
  assert.equal(timeToHebrew(7, 45, 'words'), 'שבע ושלושת רבעי');
  assert.equal(timeToHebrew(7, 20, 'words'), 'שבע ועשרים');
});

test('"to" style', () => {
  assert.equal(timeToHebrew(7, 45, 'to'), 'רבע לשמונה');
  assert.equal(timeToHebrew(12, 45, 'to'), 'רבע לאחת');
  assert.equal(timeToHebrew(11, 45, 'to'), 'רבע לשתים עשרה');
  assert.equal(timeToHebrew(7, 30, 'to'), 'שבע וחצי');
});

test('all phrasings', () => {
  assert.deepEqual(allPhrasings(7, 45), ['שבע ארבעים וחמש', 'שבע ושלושת רבעי', 'רבע לשמונה']);
  assert.deepEqual(allPhrasings(3, 0), ['שלוש']);
});

test('every minute has words', () => {
  for (let m = 1; m < 60; m++) assert.ok(minuteWords(m) && !minuteWords(m).includes('undefined'), `minute ${m}`);
});

test('digital and conversions', () => {
  assert.equal(digital(7, 5), '7:05');
  assert.deepEqual(fromT(0), { h: 12, m: 0 });
  assert.deepEqual(fromT(toT({ h: 7, m: 45 })), { h: 7, m: 45 });
  assert.deepEqual(fromT(-15), { h: 11, m: 45 });
});

test('levels generate valid questions and distinct distractors', () => {
  for (const level of LEVELS) {
    for (let i = 0; i < 200; i++) {
      const t = randomTime(level);
      assert.ok(t.h >= 1 && t.h <= 12 && t.m >= 0 && t.m < 60);
      const ds = distractors(level, t);
      assert.equal(ds.length, 2);
      const keys = new Set([t, ...ds].map(toT));
      assert.equal(keys.size, 3, `level ${level.id} ${digital(t.h, t.m)}`);
    }
  }
});

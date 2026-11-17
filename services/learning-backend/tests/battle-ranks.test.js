import test from 'node:test';
import assert from 'node:assert/strict';
import { RANKS, rankForPoints, rankedDeltas } from '../src/battle/ranks.js';

test('eight rank thresholds cover the approved ladder', () => {
  assert.equal(RANKS.length, 8);
  const cases = [
    [0, 'Novice'], [1000, 'Novice'], [1099, 'Novice'],
    [1100, 'Bronze'], [1249, 'Bronze'], [1250, 'Silver'], [1399, 'Silver'],
    [1400, 'Gold'], [1549, 'Gold'], [1550, 'Platinum'], [1699, 'Platinum'],
    [1700, 'Diamond'], [1849, 'Diamond'], [1850, 'Master'], [1999, 'Master'],
    [2000, 'Grandmaster'], [4000, 'Grandmaster'],
  ];
  for (const [points, name] of cases) assert.equal(rankForPoints(points).name, name, String(points));
});

test('win and loss points follow the approved table, including Gold -19', () => {
  const expected = {
    Novice: [24, 0], Bronze: [22, -16], Silver: [20, -18], Gold: [18, -19],
    Platinum: [16, -20], Diamond: [14, -22], Master: [12, -24], Grandmaster: [10, -25],
  };
  for (const rank of RANKS) {
    assert.deepEqual([rank.win, rank.loss], expected[rank.name], rank.name);
  }
});

test('each delta is read from that player pre-match rank', () => {
  assert.deepEqual(rankedDeltas({ winnerPoints: 1099, loserPoints: 1100 }), { winnerDelta: 24, loserDelta: -16 });
  assert.deepEqual(rankedDeltas({ winnerPoints: 1400, loserPoints: 1000 }), { winnerDelta: 18, loserDelta: 0 });
  assert.deepEqual(rankedDeltas({ winnerPoints: 2000, loserPoints: 1400 }), { winnerDelta: 10, loserDelta: -19 });
});

test('one result can cross a rank boundary in either direction', () => {
  assert.equal(rankForPoints(1099).win, 24);
  assert.equal(1099 + rankForPoints(1099).win, 1123);
  assert.equal(rankForPoints(1099 + rankForPoints(1099).win).name, 'Bronze');
  assert.equal(rankForPoints(1100).loss, -16);
  assert.equal(1100 + rankForPoints(1100).loss, 1084);
  assert.equal(rankForPoints(1100 + rankForPoints(1100).loss).name, 'Novice');
  assert.equal(rankForPoints(1249 + rankForPoints(1249).win).name, 'Silver');
});

test('rank lookup rejects unusable point values', () => {
  assert.throws(() => rankForPoints(Number.NaN), TypeError);
  assert.throws(() => rankForPoints(Infinity), TypeError);
  assert.equal(rankForPoints(-50).name, 'Novice');
});

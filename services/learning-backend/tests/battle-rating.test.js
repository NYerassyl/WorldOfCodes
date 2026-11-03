import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateElo, expectedScore } from '../src/battle/rating.js';

test('equal ratings have equal expected score', () => {
  assert.equal(expectedScore(1000, 1000), 0.5);
});

test('winner gains and loser loses rating for equal ratings', () => {
  const result = calculateElo(1000, 1000, 1);
  assert.equal(result.deltaA, 16);
  assert.equal(result.deltaB, -16);
});

test('draw preserves total rating', () => {
  const result = calculateElo(1200, 1000, 0.5);
  assert.equal(result.deltaA + result.deltaB, 0);
});

test('rejects invalid scores', () => {
  assert.throws(() => calculateElo(1000, 1000, 0.25), TypeError);
});

test('rejects non-finite ratings and invalid K factors', () => {
  assert.throws(() => expectedScore(Number.NaN, 1000), TypeError);
  assert.throws(() => calculateElo(1000, 1000, 1, 0), TypeError);
  assert.throws(() => calculateElo(1000, Infinity, 1), TypeError);
});

test('every Elo outcome is zero-sum after rounding', () => {
  for (const [ratingA, ratingB] of [[1000, 1000], [1000, 1011], [2200, 1400], [800, 1600]]) {
    for (const score of [0, 0.5, 1]) {
      const result = calculateElo(ratingA, ratingB, score);
      assert.equal(result.deltaA + result.deltaB, 0);
    }
  }
});

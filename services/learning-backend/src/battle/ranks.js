/** Approved ranked ladder: thresholds and win/loss points per rank. */
export const RANKS = Object.freeze([
  Object.freeze({ name: 'Novice', min: 0, max: 1099, win: 24, loss: 0 }),
  Object.freeze({ name: 'Bronze', min: 1100, max: 1249, win: 22, loss: -16 }),
  Object.freeze({ name: 'Silver', min: 1250, max: 1399, win: 20, loss: -18 }),
  Object.freeze({ name: 'Gold', min: 1400, max: 1549, win: 18, loss: -19 }),
  Object.freeze({ name: 'Platinum', min: 1550, max: 1699, win: 16, loss: -20 }),
  Object.freeze({ name: 'Diamond', min: 1700, max: 1849, win: 14, loss: -22 }),
  Object.freeze({ name: 'Master', min: 1850, max: 1999, win: 12, loss: -24 }),
  Object.freeze({ name: 'Grandmaster', min: 2000, max: Infinity, win: 10, loss: -25 }),
]);

export function rankForPoints(points) {
  if (!Number.isFinite(points)) throw new TypeError('Rating points must be a finite number');
  const value = Math.max(0, Math.trunc(points));
  return RANKS.find(rank => value >= rank.min && value <= rank.max) || RANKS[0];
}

/** Each side's delta comes from the rank it held when the match started. */
export function rankedDeltas({ winnerPoints, loserPoints }) {
  return {
    winnerDelta: rankForPoints(winnerPoints).win,
    loserDelta: rankForPoints(loserPoints).loss,
  };
}

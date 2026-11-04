/** Elo helpers. Pure functions are intentionally independent from Prisma. */
export function expectedScore(playerRating, opponentRating) {
  if (!Number.isFinite(playerRating) || !Number.isFinite(opponentRating)) {
    throw new TypeError('Ratings must be finite numbers');
  }
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

export function calculateElo(ratingA, ratingB, scoreA, kFactor = 32) {
  if (![ratingA, ratingB].every(Number.isFinite) ||
      ![0, 0.5, 1].includes(scoreA) ||
      !Number.isFinite(kFactor) || kFactor <= 0) {
    throw new TypeError('Invalid rating input');
  }
  // The two players' changes must be exact opposites. Independent rounding can
  // otherwise create or destroy one rating point at half-point boundaries.
  const deltaA = Math.round(kFactor * (scoreA - expectedScore(ratingA, ratingB)));
  const deltaB = -deltaA;
  return { deltaA, deltaB };
}

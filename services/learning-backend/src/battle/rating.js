/** Elo helpers. Pure functions are intentionally independent from Prisma. */
export function expectedScore(playerRating, opponentRating) {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

export function calculateElo(ratingA, ratingB, scoreA, kFactor = 32) {
  if (![ratingA, ratingB].every(Number.isFinite) || ![0, 0.5, 1].includes(scoreA)) {
    throw new TypeError('Invalid rating input');
  }
  const scoreB = 1 - scoreA;
  const deltaA = Math.round(kFactor * (scoreA - expectedScore(ratingA, ratingB)));
  const deltaB = Math.round(kFactor * (scoreB - expectedScore(ratingB, ratingA)));
  return { deltaA, deltaB };
}

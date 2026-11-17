export function award(
  state,
  id,
  xp = 40,
  coins = 15,
  date = new Date().toISOString().slice(0, 10),
) {
  if (state.completed.includes(id)) return state;
  return {
    ...state,
    completed: [...state.completed, id],
    xp: state.xp + xp,
    coins: state.coins + coins,
    activity: { ...state.activity, [date]: (state.activity[date] || 0) + 1 },
  };
}
export function typingStats(expected, actual) {
  let correct = 0;
  for (let i = 0; i < actual.length; i++)
    if (actual[i] === expected[i]) correct++;
  return {
    accuracy: actual.length ? Math.round((correct / actual.length) * 100) : 100,
    progress: Math.min(100, Math.round((correct / expected.length) * 100)),
    complete: actual === expected,
  };
}
export function levelFor(xp) {
  return Math.floor(xp / 200) + 1;
}
export function uniqueCorrect(indices, total) {
  if (!Array.isArray(indices)) return 0;
  return new Set(
    indices.filter((i) => Number.isInteger(i) && i >= 0 && i < total),
  ).size;
}
export function lessonPassed(correctCount, threshold = 5) {
  return Number.isFinite(correctCount) && correctCount >= threshold;
}

import test from "node:test";
import assert from "node:assert/strict";
import {
  award,
  typingStats,
  levelFor,
  uniqueCorrect,
  lessonPassed,
} from "../src/lib/progress.mjs";
const initial = { xp: 0, coins: 0, completed: [], activity: {} };
test("lesson retry cannot award a second reward", () => {
  const once = award(initial, "variables", 40, 15, "2026-11-03");
  const twice = award(once, "variables", 40, 15, "2026-11-03");
  assert.equal(twice.xp, 40);
  assert.equal(twice.coins, 15);
  assert.equal(twice.activity["2026-11-03"], 1);
  assert.deepEqual(initial.completed, []);
});
test("different exercises receive independent rewards", () => {
  const state = award(award(initial, "variables"), "copy:hello", 20, 5);
  assert.equal(state.xp, 60);
  assert.equal(state.coins, 20);
  assert.equal(state.completed.length, 2);
});
test("typing requires exact whitespace and no trailing characters", () => {
  assert.equal(typingStats("a\n b", "a\n b").complete, true);
  assert.equal(typingStats("a\n b", "a\nb").complete, false);
  assert.equal(typingStats("a", "ab").complete, false);
  assert.equal(typingStats("abc", "axc").accuracy, 67);
});
test("levels advance exactly at the XP threshold", () => {
  assert.equal(levelFor(0), 1);
  assert.equal(levelFor(199), 1);
  assert.equal(levelFor(200), 2);
});
test("task progress counts unique answers inside the task range", () => {
  assert.equal(uniqueCorrect([0, 0, 2, 9], 10), 3);
  assert.equal(uniqueCorrect([10, -1, 1.5], 10), 0);
  assert.equal(uniqueCorrect(undefined, 10), 0);
});
test("a lesson passes at five correct tasks", () => {
  assert.equal(lessonPassed(4), false);
  assert.equal(lessonPassed(5), true);
  assert.equal(lessonPassed(7), true);
  assert.equal(lessonPassed(NaN), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import { award, typingStats, levelFor } from "../src/lib/progress.mjs";
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

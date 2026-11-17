// Guards the Duel Arena integration of the shared smart editor: the battle
// editor must keep Python key handling and the editor must stay monospace.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = (path) => readFileSync(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), "utf8");

const arena = source("pages/Arena.tsx");
const ui = source("components/UI.tsx");
const style = source("style.css");

test("the Arena solution editor opts into smart editing for Python", () => {
  const battleEditor = /<Editor[\s\S]*?title="solution\.py · Python"[\s\S]*?\/>/.exec(arena)?.[0];
  assert.ok(battleEditor, "Arena renders the Python solution editor");
  assert.match(battleEditor, /^\s*smartEditing\s*$/m);
  assert.match(battleEditor, /language="python"/);
});

test("the shared Editor only intercepts keys when smart editing is enabled", () => {
  assert.match(ui, /onKeyDown=\{\(event\) => smartEditing && handleEditorKeyDown\(/);
  assert.match(ui, /handleEditorKeyDown,\s*languageForFile/);
  assert.match(ui, /aria-describedby=\{smartEditing \? helpId : undefined\}/);
});

test("the code editor keeps a monospace font and exposes key help", () => {
  const editorRule = /\.editor textarea\s*\{[^}]*\}/.exec(style)?.[0] ?? "";
  assert.match(editorRule, /font:[^;]*var\(--mono\)/);
  assert.match(style, /\.editor-key-help\s*\{/);
  assert.match(style, /textarea:not\(\.editor textarea\)/, "generic textarea reset still excludes the code editor");
});

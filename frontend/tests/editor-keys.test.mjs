// Pure unit tests for the IDE-style code editor keys. No DOM, no server.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const frontend = fileURLToPath(new URL("..", import.meta.url));
const temp = mkdtempSync(join(process.env.JCODE_SCRATCH_DIR || tmpdir(), "woc-editor-keys-"));
const entry = join(temp, "entry.ts");
writeFileSync(entry, `export * from ${JSON.stringify(join(frontend, "src/lib/editor-keys.ts"))};`);
execFileSync(join(frontend, "node_modules/.bin/esbuild"), [
  entry, "--bundle", "--format=esm", "--platform=node", `--outfile=${join(temp, "keys.mjs")}`, "--log-level=warning",
]);
const { applyEditorKey, detectIndent } = await import(pathToFileURL(join(temp, "keys.mjs")).href);
after(() => rmSync(temp, { recursive: true, force: true }));

const press = (value, caret, key, extra = {}) =>
  applyEditorKey({ value, selectionStart: caret, selectionEnd: caret, key, ...extra });
const select = (value, start, end, key, extra = {}) =>
  applyEditorKey({ value, selectionStart: start, selectionEnd: end, key, ...extra });

test("opening brackets and quotes insert their closing partner", () => {
  for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"], ['"', '"'], ["'", "'"], ["`", "`"]]) {
    const result = press("foo", 3, open);
    assert.equal(result.value, `foo${open}${close}`);
    assert.equal(result.selectionStart, 4);
    assert.equal(result.selectionEnd, 4);
  }
});

test("a selection is wrapped and stays selected inside the pair", () => {
  const result = select("bar", 0, 3, '"');
  assert.equal(result.value, '"bar"');
  assert.equal(result.selectionStart, 1);
  assert.equal(result.selectionEnd, 4);
});

test("typing the closing character of an empty pair moves the caret over it", () => {
  const paren = press("f()", 2, ")");
  assert.equal(paren.value, "f()");
  assert.equal(paren.selectionStart, 3);
  const quote = press('""', 1, '"');
  assert.equal(quote.value, '""');
  assert.equal(quote.selectionStart, 2);
  const escaped = press('"\\""', 2, '"');
  assert.equal(escaped, null);
});

test("pairs are not auto-inserted in front of an identifier", () => {
  assert.equal(press("hello", 0, "("), null);
  assert.equal(press("hello", 0, '"'), null);
});

test("Tab moves the caret outside the auto-inserted bracket or quote", () => {
  const paren = press("foo()", 4, "Tab");
  assert.equal(paren.value, "foo()");
  assert.equal(paren.selectionStart, 5);
  const quote = press('""', 1, "Tab");
  assert.equal(quote.selectionStart, 2);
  const nested = press("f(g())", 5, "Tab");
  assert.equal(nested.selectionStart, 6);
});

test("Tab otherwise indents the current line and every selected line", () => {
  const line = press("x = 1", 0, "Tab");
  assert.equal(line.value, "  x = 1");
  assert.equal(line.selectionStart, 2);

  const middle = press("x = 1", 3, "Tab");
  assert.equal(middle.value, "  x = 1");
  assert.equal(middle.selectionStart, 5);

  const block = select("a\nb", 0, 3, "Tab");
  assert.equal(block.value, "  a\n  b");
  assert.equal(block.selectionStart, 2);
  assert.equal(block.selectionEnd, 7);
});

test("the indent unit follows the file's existing indentation", () => {
  assert.equal(detectIndent("def f():\n    pass"), "    ");
  assert.equal(detectIndent("x = 1"), "  ");
  assert.equal(detectIndent("if x:\n\ty"), "\t");

  const python = select("if x:\n    y", 0, 11, "Tab");
  assert.equal(python.value, "    if x:\n        y");
  assert.equal(python.selectionEnd, 19);
});

test("Shift+Tab removes one level of indentation", () => {
  const line = press("    x", 6, "Tab", { shiftKey: true });
  assert.equal(line.value, "x");
  assert.equal(line.selectionStart, 2);

  const block = select("  a\n  b", 2, 6, "Tab", { shiftKey: true });
  assert.equal(block.value, "a\nb");
  assert.equal(block.selectionStart, 0);
  assert.equal(block.selectionEnd, 2);

  const flush = press("x", 1, "Tab", { shiftKey: true });
  assert.equal(flush.value, "x");
});

test("Enter between an empty pair splits it onto an indented line", () => {
  const plain = press("{}", 1, "Enter");
  assert.equal(plain.value, "{\n  \n}");
  assert.equal(plain.selectionStart, 4);

  const nested = press("  {}", 3, "Enter");
  assert.equal(nested.value, "  {\n    \n  }");
  assert.equal(nested.selectionStart, 8);
});

test("Enter keeps the current indentation and adds one level after a block opener", () => {
  const colon = press("    if x:", 9, "Enter");
  assert.equal(colon.value, "    if x:\n        ");
  assert.equal(colon.selectionStart, 18);

  const brace = press("function f() {", 14, "Enter");
  assert.equal(brace.value, "function f() {\n  ");
  assert.equal(press("x", 1, "Enter").value, "x\n");
});

test("Backspace removes an empty pair but keeps pairs with content", () => {
  const empty = press("()", 1, "Backspace");
  assert.equal(empty.value, "");
  assert.equal(empty.selectionStart, 0);
  assert.equal(press("[]", 1, "Backspace").value, "");
  assert.equal(press('"x"', 2, "Backspace"), null);
  assert.equal(press("(x)", 2, "Backspace"), null);
});

test("an explicit indent unit overrides detection in an empty editor", () => {
  const four = { indent: "    " };
  const typed = press("if score >= 75:", 15, "Enter", four);
  assert.equal(typed.value, "if score >= 75:\n    ");
  assert.equal(typed.selectionStart, 20);

  const tab = press("", 0, "Tab", { indent: "\t" });
  assert.equal(tab.value, "\t");
  assert.equal(press("x = 1", 0, "Tab", four).value, "    x = 1");
});

test("exact-copy mode leaves Enter to the browser while Tab still uses the reference indent", () => {
  const drill = { indent: "    ", autoIndent: false };
  assert.equal(press("if score >= 75:", 15, "Enter", drill), null);
  assert.equal(press("    print(total)", 16, "Enter", drill), null);
  assert.equal(press("", 0, "Tab", drill).value, "    ");
  assert.equal(press("    return x", 12, "Tab", { ...drill, shiftKey: true }).value, "return x");
});

test("modifier shortcuts and ordinary characters are left to the browser", () => {
  assert.equal(press("foo", 3, "(", { ctrlKey: true }), null);
  assert.equal(press("foo", 3, "(", { metaKey: true }), null);
  assert.equal(press("foo", 3, "a"), null);
  assert.equal(press("foo", 3, ")"), null);
  assert.equal(press("foo", 3, "Backspace"), null);
});

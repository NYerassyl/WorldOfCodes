import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testsDir = fileURLToPath(new URL(".", import.meta.url));
const frontendDir = fileURLToPath(new URL("..", import.meta.url));

const tempDir = mkdtempSync(join(tmpdir(), "woc-curriculum-"));
const bundlePath = join(tempDir, "curriculum.mjs");
const esbuild = fileURLToPath(import.meta.resolve('esbuild/bin/esbuild'));

execFileSync(
  esbuild,
  [
    join(frontendDir, "src", "lib", "curriculum.ts"),
    "--bundle",
    "--format=esm",
    "--platform=node",
    `--outfile=${bundlePath}`,
    "--log-level=warning",
  ],
  { cwd: frontendDir, stdio: "inherit" },
);

const curriculum = await import(pathToFileURL(bundlePath).href);
const solutionModules = {
  python: await import(
    pathToFileURL(join(testsDir, "lab-solutions", "python.mjs")).href
  ),
  javascript: await import(
    pathToFileURL(join(testsDir, "lab-solutions", "javascript.mjs")).href
  ),
  html: await import(
    pathToFileURL(join(testsDir, "lab-solutions", "html.mjs")).href
  ),
  css: await import(
    pathToFileURL(join(testsDir, "lab-solutions", "css.mjs")).href
  ),
  java: await import(
    pathToFileURL(join(testsDir, "lab-solutions", "java.mjs")).href
  ),
  cpp: await import(
    pathToFileURL(join(testsDir, "lab-solutions", "cpp.mjs")).href
  ),
};

const allLessons = curriculum.languages.flatMap((language) =>
  language.lessons.map((lesson) => ({ language, lesson })),
);
const allLabs = allLessons.map(({ language, lesson }) => ({
  language,
  lesson,
  lab: lesson.lab,
}));

test.after(() => rmSync(tempDir, { recursive: true, force: true }));

test("six languages expose five lessons each", () => {
  assert.equal(curriculum.languages.length, 6);
  for (const language of curriculum.languages) {
    assert.equal(language.lessons.length, 5, language.name);
  }
  assert.equal(curriculum.PASS_MARK, 5);
});

test("lesson ids are unique inside every language", () => {
  for (const language of curriculum.languages) {
    const ids = language.lessons.map((lesson) => lesson.id);
    assert.equal(new Set(ids).size, ids.length, language.name);
  }
});

test("every lesson has ten well-formed quiz tasks", () => {
  for (const { language, lesson } of allLessons) {
    const label = `${language.id}/${lesson.id}`;
    assert.equal(lesson.tasks.length, 10, label);
    const prompts = new Set();
    for (const [index, task] of lesson.tasks.entries()) {
      assert.ok(task.prompt.trim(), `${label} task ${index + 1} prompt`);
      const promptKey = `${task.prompt}\n${task.code ?? ""}`;
      assert.ok(!prompts.has(promptKey), `${label} duplicate task`);
      prompts.add(promptKey);
      assert.equal(
        task.options.length,
        4,
        `${label} task ${index + 1} options`,
      );
      assert.ok(
        Number.isInteger(task.answer) &&
          task.answer >= 0 &&
          task.answer < task.options.length,
        `${label} task ${index + 1} answer`,
      );
      assert.equal(
        new Set(task.options).size,
        task.options.length,
        `${label} task ${index + 1} duplicate options`,
      );
      assert.ok(
        task.explanation.trim(),
        `${label} task ${index + 1} explanation`,
      );
    }
  }
});

test("every lesson has expanded lecture material", () => {
  for (const { language, lesson } of allLessons) {
    const label = `${language.id}/${lesson.id}`;
    assert.ok(lesson.theory.length >= 4, `${label} theory blocks`);
    assert.ok(lesson.objectives?.length === 3, `${label} objectives`);
    assert.ok(lesson.terms?.length === 4, `${label} key terms`);
    for (const term of lesson.terms) {
      assert.ok(term.term.trim(), `${label} term name`);
      assert.ok(term.meaning.trim(), `${label} term meaning`);
    }
    assert.ok(lesson.deepDive?.body.length > 400, `${label} deep dive`);
    assert.ok(lesson.pitfall?.length > 60, `${label} pitfall`);
  }
});

const runLanguages = new Set(["python", "javascript", "java", "cpp"]);

test("every lab has executable tests", () => {
  for (const { language, lesson, lab } of allLabs) {
    const label = `${language.id}/${lesson.id}`;
    assert.ok(lab, `${label} lab`);
    assert.equal(lab.id, `${lesson.id}-lab`, `${label} lab id`);
    assert.ok(lab.title.trim(), `${label} lab title`);
    assert.ok(lab.brief.length > 60, `${label} lab brief`);
    assert.ok(lab.file.trim(), `${label} lab file`);
    assert.ok(lab.starter.trim(), `${label} lab starter`);
    assert.ok(lab.hint.trim(), `${label} lab hint`);
    assert.ok(lab.explanation.trim(), `${label} lab explanation`);
    assert.ok(!("checks" in lab), `${label} must not keep regex checks`);

    if (runLanguages.has(language.id)) {
      assert.ok(Array.isArray(lab.tests), `${label} tests`);
      assert.ok(
        lab.tests.length >= 1 && lab.tests.length <= 2,
        `${label} run test count`,
      );
      assert.ok(!lab.renderChecks, `${label} must not mix render checks`);
      const labels = new Set();
      for (const runTest of lab.tests) {
        assert.ok(runTest.label.trim(), `${label} test label`);
        assert.ok(!labels.has(runTest.label), `${label} duplicate test label`);
        labels.add(runTest.label);
        assert.equal(typeof runTest.stdin, "string", `${label} test stdin`);
        assert.ok(
          typeof runTest.expectedStdout === "string" &&
            runTest.expectedStdout.trim(),
          `${label} test expectedStdout`,
        );
      }
    } else {
      assert.ok(Array.isArray(lab.renderChecks), `${label} render checks`);
      assert.ok(
        lab.renderChecks.length >= 4 && lab.renderChecks.length <= 6,
        `${label} render check count`,
      );
      assert.ok(!lab.tests, `${label} must not mix run tests`);
      if (language.id === "css") {
        assert.ok(lab.fixture?.trim(), `${label} css fixture`);
      }
      const labels = new Set();
      for (const check of lab.renderChecks) {
        assert.ok(check.label.trim(), `${label} check label`);
        assert.ok(!labels.has(check.label), `${label} duplicate check label`);
        labels.add(check.label);
        assert.ok(check.selector.trim(), `${label} check selector`);
        assert.notEqual(check.count, 0, `${label} cannot assert count 0`);
        if (check.style) {
          assert.ok(check.style.property.trim(), `${label} style property`);
          assert.ok(check.style.value.trim(), `${label} style value`);
        }
        if (check.viewport !== undefined) {
          assert.ok(
            Number.isInteger(check.viewport) && check.viewport > 0,
            `${label} check viewport`,
          );
        }
      }
    }
  }
  const labIds = allLabs.map(({ lab }) => lab.id);
  assert.equal(new Set(labIds).size, labIds.length, "lab ids must be unique");
});

test("every lab has a reference solution and no stale demo wording", () => {
  const solutionIds = new Set();
  for (const { language, lesson, lab } of allLabs) {
    const label = `${language.id}/${lesson.id}`;
    const solutions = solutionModules[language.id]?.solutions;
    assert.ok(solutions, `${language.id} solution module`);
    const solution = solutions[lab.id];
    assert.ok(
      typeof solution === "string" && solution.trim(),
      `${label} solution`,
    );
    assert.notEqual(solution, lab.starter, `${label} solution equals starter`);
    solutionIds.add(lab.id);
  }
  for (const [languageId, module] of Object.entries(solutionModules)) {
    for (const id of Object.keys(module.solutions)) {
      assert.ok(solutionIds.has(id), `${languageId} stale solution ${id}`);
    }
  }
  for (const { lesson, lab } of allLabs) {
    const labText = [lab.brief, lab.hint, lab.explanation].join("\n");
    assert.doesNotMatch(
      labText,
      /structure check|not executed|nothing is sent/i,
    );
    assert.ok(lesson.lab);
  }
});

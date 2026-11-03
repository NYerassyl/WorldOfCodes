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
const esbuild = join(frontendDir, "node_modules", ".bin", "esbuild");

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

test("every lesson has a code lab with structural checks", () => {
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
    assert.ok(
      lab.checks.length >= 3 && lab.checks.length <= 5,
      `${label} lab check count`,
    );
    for (const check of lab.checks) {
      assert.ok(check.label.trim(), `${label} check label`);
      assert.equal(typeof check.test, "function", `${label} check test`);
    }
  }
  const labIds = allLabs.map(({ lab }) => lab.id);
  assert.equal(new Set(labIds).size, labIds.length, "lab ids must be unique");
});

test("reference solutions pass every lab check", () => {
  for (const { language, lesson, lab } of allLabs) {
    const label = `${language.id}/${lesson.id}`;
    const solutions = solutionModules[language.id]?.solutions;
    assert.ok(solutions, `${language.id} solution module`);
    const solution = solutions[lab.id];
    assert.ok(
      typeof solution === "string" && solution.trim(),
      `${label} solution`,
    );
    const results = curriculum.runLabChecks(lab, solution);
    assert.deepEqual(
      results.filter((result) => !result.pass).map((result) => result.label),
      [],
      `${label} failing checks`,
    );
  }
});

test("starter code and empty input do not already pass", () => {
  for (const { language, lesson, lab } of allLabs) {
    const label = `${language.id}/${lesson.id}`;
    assert.ok(
      curriculum.runLabChecks(lab, "").some((result) => !result.pass),
      `${label} empty code passes`,
    );
    assert.ok(
      curriculum.runLabChecks(lab, lab.starter).some((result) => !result.pass),
      `${label} starter passes`,
    );
  }
});

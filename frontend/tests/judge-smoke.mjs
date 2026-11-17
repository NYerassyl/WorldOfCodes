// Executes every run-language reference lab solution on the real Judge0 CE
// sandbox and compares stdout with each lab test's expectedStdout.
//   node tests/judge-smoke.mjs
// Pass --starters to also submit each starter and confirm it fails.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testsDir = fileURLToPath(new URL(".", import.meta.url));
const frontendDir = fileURLToPath(new URL("..", import.meta.url));
const tempDir = mkdtempSync(join(tmpdir(), "woc-judge-smoke-"));
const esbuild = join(frontendDir, "node_modules", ".bin", "esbuild");

function bundle(entry, outfile) {
  execFileSync(
    esbuild,
    [
      join(frontendDir, entry),
      "--bundle",
      "--format=esm",
      "--platform=node",
      `--outfile=${outfile}`,
      "--log-level=warning",
    ],
    { cwd: frontendDir, stdio: "inherit" },
  );
}

bundle("src/lib/curriculum.ts", join(tempDir, "curriculum.mjs"));
bundle("src/lib/judge.ts", join(tempDir, "judge.mjs"));

const curriculum = await import(
  pathToFileURL(join(tempDir, "curriculum.mjs")).href
);
const { runCode, normalizeOutput } = await import(
  pathToFileURL(join(tempDir, "judge.mjs")).href
);

const solutions = {};
for (const languageId of ["python", "javascript", "java", "cpp"]) {
  const module = await import(
    pathToFileURL(join(testsDir, "lab-solutions", `${languageId}.mjs`)).href
  );
  solutions[languageId] = module.solutions;
}

const checkStarters = process.argv.includes("--starters");
const failures = [];
let passed = 0;

function report(ok, message) {
  if (ok) {
    passed += 1;
    console.log(`  ok   ${message}`);
  } else {
    failures.push(message);
    console.log(`  FAIL ${message}`);
  }
}

for (const language of curriculum.languages) {
  if (!["python", "javascript", "java", "cpp"].includes(language.id)) continue;
  for (const lesson of language.lessons) {
    const lab = lesson.lab;
    if (!lab?.tests?.length) continue;
    const solution = solutions[language.id]?.[lab.id];
    if (!solution) {
      report(false, `${language.id}/${lab.id}: missing solution`);
      continue;
    }
    for (const [index, labTest] of lab.tests.entries()) {
      let run = await runCode(language.id, solution, labTest.stdin);
      for (
        let attempt = 0;
        run.status === "unavailable" && attempt < 2;
        attempt++
      ) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        run = await runCode(language.id, solution, labTest.stdin);
      }
      const name = `${language.id}/${lab.id} test ${index + 1} (${labTest.label})`;
      if (run.status === "unavailable") {
        report(false, `${name}: runner unavailable — ${run.message}`);
        continue;
      }
      if (run.verdict !== "Accepted") {
        report(false, `${name}: ${run.verdict}`);
        continue;
      }
      const actual = normalizeOutput(run.stdout);
      const expected = normalizeOutput(labTest.expectedStdout);
      report(actual === expected, name);
      if (actual !== expected) {
        console.log(`       expected: ${JSON.stringify(expected)}`);
        console.log(`       actual:   ${JSON.stringify(actual)}`);
      }
    }
    if (checkStarters) {
      for (const [index, labTest] of lab.tests.entries()) {
        const run = await runCode(language.id, lab.starter, labTest.stdin);
        const name = `${language.id}/${lab.id} starter ${index + 1}`;
        if (run.status === "unavailable") {
          report(false, `${name}: runner unavailable — ${run.message}`);
          continue;
        }
        const actual = normalizeOutput(run.stdout);
        const expected = normalizeOutput(labTest.expectedStdout);
        report(
          run.verdict !== "Accepted" || actual !== expected,
          `${name} must not pass`,
        );
      }
    }
  }
}

rmSync(tempDir, { recursive: true, force: true });

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}

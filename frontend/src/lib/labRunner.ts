import type { Lab, LabCheckResult } from "./curriculum";
import { normalizeOutput, runCode } from "./judge";
import { runRenderChecks } from "./renderCheck";

export type LabEvaluation =
  | {
      status: "ok";
      results: LabCheckResult[];
      stdout: string;
      stderr: string;
      compileError: string;
      verdict: string;
    }
  | { status: "unavailable"; message: string };

export async function evaluateLab(
  languageId: string,
  lab: Lab,
  code: string,
  signal?: AbortSignal,
): Promise<LabEvaluation> {
  if (lab.renderChecks?.length) {
    const results = await runRenderChecks(languageId, lab, code);
    return {
      status: "ok",
      results,
      stdout: "",
      stderr: "",
      compileError: "",
      verdict: "Rendered",
    };
  }
  if (!lab.tests?.length) {
    return {
      status: "unavailable",
      message: "This lab has no tests configured yet.",
    };
  }
  const results: LabCheckResult[] = [];
  let lastStdout = "";
  let lastStderr = "";
  for (const test of lab.tests) {
    const run = await runCode(languageId, code, test.stdin, signal);
    if (run.status === "unavailable") return run;
    lastStdout = run.stdout;
    lastStderr = run.stderr;
    if (run.compileError) {
      results.push({
        label: test.label,
        pass: false,
        detail: "Compilation failed.",
      });
      return {
        status: "ok",
        results,
        stdout: run.stdout,
        stderr: run.stderr,
        compileError: run.compileError,
        verdict: run.verdict,
      };
    }
    if (run.verdict !== "Accepted") {
      results.push({
        label: test.label,
        pass: false,
        detail: run.verdict,
      });
      return {
        status: "ok",
        results,
        stdout: run.stdout,
        stderr: run.stderr,
        compileError: "",
        verdict: run.verdict,
      };
    }
    const expected = normalizeOutput(test.expectedStdout);
    const actual = normalizeOutput(run.stdout);
    const pass = actual === expected;
    results.push({
      label: test.label,
      pass,
      detail: pass
        ? undefined
        : `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`,
    });
    if (!pass) {
      return {
        status: "ok",
        results,
        stdout: run.stdout,
        stderr: run.stderr,
        compileError: "",
        verdict: "Wrong output",
      };
    }
  }
  return {
    status: "ok",
    results,
    stdout: lastStdout,
    stderr: lastStderr,
    compileError: "",
    verdict: "Accepted",
  };
}

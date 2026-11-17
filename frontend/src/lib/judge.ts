const RUNNER_URL =
  "https://ce.judge0.com/submissions?base64_encoded=false&wait=true";

export const RUNNER = {
  provider: "Judge0 CE",
  url: RUNNER_URL,
};

const LANGUAGE_IDS: Record<string, number> = {
  python: 113,
  javascript: 102,
  java: 91,
  cpp: 105,
};

export type JudgeRun =
  | {
      status: "ok";
      stdout: string;
      stderr: string;
      compileError: string;
      verdict: string;
      time: string;
      memory: number;
    }
  | { status: "unavailable"; message: string };

export function normalizeOutput(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n+$/g, "");
}

export async function runCode(
  languageId: string,
  sourceCode: string,
  stdin: string,
  signal?: AbortSignal,
): Promise<JudgeRun> {
  const language = LANGUAGE_IDS[languageId];
  if (!language) {
    return {
      status: "unavailable",
      message: "This language has no remote runner configured yet.",
    };
  }
  try {
    const timeout = AbortSignal.timeout(60000);
    const response = await fetch(RUNNER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: language,
        stdin,
      }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) {
      return {
        status: "unavailable",
        message: `The code runner returned HTTP ${response.status}. Try again in a moment.`,
      };
    }
    const payload = await response.json();
    const statusId = payload?.status?.id;
    if (!Number.isInteger(statusId)) {
      return {
        status: "unavailable",
        message: "The code runner sent an unexpected response.",
      };
    }
    return {
      status: "ok",
      stdout: payload.stdout ?? "",
      stderr: payload.stderr ?? "",
      compileError:
        payload.compile_output ||
        (statusId === 6 ? payload.message || "Compilation failed." : ""),
      verdict: payload.status.description ?? "Unknown",
      time: payload.time ?? "0",
      memory: payload.memory ?? 0,
    };
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === "AbortError" || name === "TimeoutError") {
      return {
        status: "unavailable",
        message: "The run was cancelled or took too long. Try again.",
      };
    }
    return {
      status: "unavailable",
      message:
        "The code runner is unreachable. Check your connection and try again.",
    };
  }
}

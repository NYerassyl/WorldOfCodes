// Runs every HTML/CSS reference solution and starter through the real
// render-check pipeline in headless Chrome. Start the dev server first:
//   npm run dev -- --port 5180
//   node tests/render-smoke.mjs
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.env.CDP_PORT || 9336);
const BASE = process.env.BASE_URL || "http://localhost:5180";

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--hide-scrollbars",
    `--user-data-dir=${process.env.CHROME_PROFILE || "/tmp/chrome-woc-render"}`,
    `--remote-debugging-port=${PORT}`,
    "--window-size=1440,1000",
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function getTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await response.json();
      const page = list.find((target) => target.type === "page");
      if (page) return page;
    } catch {}
    await sleep(250);
  }
  throw new Error("no Chrome target");
}

const target = await getTarget();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
};
await new Promise((resolve) => (ws.onopen = resolve));

function send(method, params = {}) {
  return new Promise((resolve) => {
    const messageId = ++id;
    pending.set(messageId, resolve);
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });
}

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: `${BASE}/#learn` });
await sleep(1800);

const expression = `(async()=>{
  const { runRenderChecks } = await import('/src/lib/renderCheck.ts');
  const { languages } = await import('/src/lib/curriculum.ts');
  const solutions = {
    html: (await import('/tests/lab-solutions/html.mjs')).solutions,
    css: (await import('/tests/lab-solutions/css.mjs')).solutions,
  };
  const rows = [];
  for (const language of languages) {
    if (language.id !== 'html' && language.id !== 'css') continue;
    for (const lesson of language.lessons) {
      const lab = lesson.lab;
      if (!lab?.renderChecks?.length) continue;
      const solution = solutions[language.id][lab.id];
      const solutionResults = await runRenderChecks(language.id, lab, solution);
      const starterResults = await runRenderChecks(language.id, lab, lab.starter);
      rows.push({
        language: language.id,
        lab: lab.id,
        solution: solutionResults,
        starter: starterResults,
      });
    }
  }
  return rows;
})()`;

const evaluation = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
  awaitPromise: true,
});
ws.close();
chrome.kill();

if (evaluation.result?.exceptionDetails) {
  console.error(
    evaluation.result.exceptionDetails.exception?.description ||
      evaluation.result.exceptionDetails.text,
  );
  process.exit(1);
}

const rows = evaluation.result?.result?.value ?? [];
const failures = [];
for (const row of rows) {
  for (const result of row.solution) {
    if (!result.pass) {
      failures.push(
        `${row.lab} solution: ${result.label} — ${result.detail ?? "failed"}`,
      );
    }
  }
  if (!row.starter.some((result) => !result.pass)) {
    failures.push(`${row.lab}: starter already passes every check`);
  }
  console.log(
    `${row.lab}: solution ${row.solution.filter((r) => r.pass).length}/${row.solution.length}, starter ${row.starter.filter((r) => !r.pass).length} failing`,
  );
}

console.log(`\n${rows.length} render labs checked`);
if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}

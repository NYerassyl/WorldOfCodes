// Browser QA for the demo frontend. Start the dev server first:
//   npm run dev -- --port 5180
//   node tests/browser-qa.mjs
// The account checks use a local stub on port 4001 through the Vite proxy.
// Stop any real learning backend on that port before running this script.
// Override CHROME_PATH, BASE_URL, CDP_PORT or CHROME_PROFILE when needed.
import { spawn } from "node:child_process";
import http from "node:http";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.env.CDP_PORT || 9335);
const BASE = process.env.BASE_URL || "http://localhost:5180";
const STUB_PORT = 4001;

let stubUser = {
  id: "stub-user",
  email: "ada@example.com",
  nickname: "Aruzhan",
  avatarUrl: null,
  xp: 120,
  coins: 30,
  level: 2,
  nicknameChanges: 0,
  nextNicknameChange: "FREE",
};
const stubTokens = new Set();

function stubJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

function stubPrivateUser() {
  return {
    ...stubUser,
    nextNicknameChange:
      stubUser.nicknameChanges === 0 ? "FREE" : "PAYMENT_REQUIRED",
  };
}

const stub = http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    const input = body ? JSON.parse(body) : {};
    const token = (req.headers.authorization || "").replace(/^Bearer /, "");
    const authed = stubTokens.has(token);
    if (req.method === "POST" && req.url === "/api/auth/register") {
      const nickname = String(input.nickname || "").trim();
      if (!/^[A-Za-z0-9_]{3,24}$/.test(nickname)) {
        return stubJson(res, 400, {
          error: {
            code: "BAD_REQUEST",
            message:
              "Nickname must be 3-24 Latin letters, digits, or underscores",
          },
        });
      }
      stubUser = {
        ...stubUser,
        email: String(input.email || "").toLowerCase(),
        nickname,
        nicknameChanges: 0,
      };
      const issued = "stub-token-register";
      stubTokens.add(issued);
      return stubJson(res, 201, { token: issued, user: stubPrivateUser() });
    }
    if (req.method === "POST" && req.url === "/api/auth/login") {
      if (
        String(input.email || "").toLowerCase() !== stubUser.email ||
        input.password !== "password123"
      ) {
        return stubJson(res, 401, {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        });
      }
      const issued = `stub-token-login-${stubTokens.size}`;
      stubTokens.add(issued);
      return stubJson(res, 200, { token: issued, user: stubPrivateUser() });
    }
    if (!authed) {
      return stubJson(res, 401, {
        error: { code: "UNAUTHORIZED", message: "Bearer token required" },
      });
    }
    if (req.method === "POST" && req.url === "/api/auth/logout") {
      stubTokens.delete(token);
      res.writeHead(204);
      return res.end();
    }
    if (req.method === "GET" && req.url === "/api/users/me") {
      return stubJson(res, 200, { ...stubPrivateUser(), completedLessons: 4 });
    }
    if (req.method === "PATCH" && req.url === "/api/users/me") {
      const nickname = String(input.nickname ?? stubUser.nickname).trim();
      if (!/^[A-Za-z0-9_]{3,24}$/.test(nickname)) {
        return stubJson(res, 400, {
          error: { code: "BAD_REQUEST", message: "Invalid nickname" },
        });
      }
      if (
        nickname.toLowerCase() !== stubUser.nickname.toLowerCase() &&
        stubUser.nicknameChanges > 0
      ) {
        return stubJson(res, 402, {
          error: {
            code: "NICKNAME_CHANGE_PAYMENT_REQUIRED",
            message:
              "Additional nickname changes require payment; payment is not available this week",
          },
        });
      }
      if (nickname.toLowerCase() !== stubUser.nickname.toLowerCase()) {
        stubUser = {
          ...stubUser,
          nickname,
          nicknameChanges: stubUser.nicknameChanges + 1,
        };
      }
      return stubJson(res, 200, stubPrivateUser());
    }
    stubJson(res, 404, {
      error: { code: "NOT_FOUND", message: "Not found" },
    });
  });
});

try {
  await new Promise((resolve, reject) => {
    stub.once("error", reject);
    stub.listen(STUB_PORT, "127.0.0.1", resolve);
  });
} catch {
  console.error(
    `Browser QA needs port ${STUB_PORT} free for its account stub. Stop the learning backend first.`,
  );
  process.exit(1);
}

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-prefers-reduced-motion",
    `--user-data-dir=${process.env.CHROME_PROFILE || "/tmp/chrome-woc-e2e"}`,
    `--remote-debugging-port=${PORT}`,
    "--window-size=1440,1000",
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function getTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === "page");
      if (page) return page;
    } catch {}
    await sleep(250);
  }
  throw new Error("no chrome target");
}

const target = await getTarget();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const pageErrors = [];
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === "Runtime.exceptionThrown") {
    pageErrors.push(msg.params.exceptionDetails?.text || "exception");
  }
  if (
    msg.method === "Runtime.consoleAPICalled" &&
    msg.params.type === "error"
  ) {
    pageErrors.push(
      msg.params.args.map((a) => a.value || a.description || "").join(" "),
    );
  }
};
await new Promise((res) => (ws.onopen = res));
function send(method, params = {}) {
  return new Promise((res) => {
    const mid = ++id;
    pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

const results = [];
const STATE = `(()=>{try{return JSON.parse(localStorage.getItem('worldofcodes-demo-v1'))}catch(e){return null}})()`;

async function ev(expression) {
  const out = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (out.result?.exceptionDetails) {
    throw new Error(
      out.result.exceptionDetails.exception?.description ||
        out.result.exceptionDetails.text ||
        "evaluate failed",
    );
  }
  return out.result?.result?.value;
}
function check(name, actual, expected) {
  const pass =
    typeof expected === "function" ? expected(actual) : actual === expected;
  results.push({ name, pass, actual });
}
async function clickText(selector, text) {
  const res = await ev(`(()=>{
    const els=[...document.querySelectorAll(${JSON.stringify(selector)})];
    const el=els.find(e=>e.textContent.trim().includes(${JSON.stringify(text)}));
    if(!el) return {ok:false,texts:els.map(e=>e.textContent.trim()).slice(0,12)};
    el.click();
    return {ok:true,text:el.textContent.trim()};
  })()`);
  check(`click "${text}"`, res.ok, true);
  if (!res.ok)
    results.push({ name: `missing "${text}"`, pass: false, actual: res });
  return res;
}
async function setValue(selector, value, eventName = "input") {
  const res = await ev(`(()=>{
    const el=document.querySelector(${JSON.stringify(selector)});
    if(!el) return {ok:false};
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto,'value').set;
    setter.call(el,${JSON.stringify(value)});
    el.dispatchEvent(new Event(${JSON.stringify(eventName)},{bubbles:true}));
    return {ok:true,value:el.value};
  })()`);
  check(`set ${selector}`, res.ok, true);
  return res;
}
async function nav(hash) {
  await ev(`location.hash=${JSON.stringify(hash)};'ok'`);
  await sleep(500);
}
async function waitFor(expression, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await ev(expression);
    if (value) return value;
    await sleep(500);
  }
  return null;
}
async function reload() {
  await send("Page.reload", {});
  await sleep(1700);
}

await send("Page.navigate", { url: `${BASE}/#home` });
await sleep(1600);
await ev(`localStorage.clear();'ok'`);
await reload();

const fresh = await ev(STATE);
check("fresh demo state starts at 0 XP", fresh?.xp, 0);
check("fresh demo state has no completions", fresh?.completed?.length, 0);
check(
  "fresh demo state has no task answers",
  Object.keys(fresh?.practice || {}).length,
  0,
);

// --- Lessons: language picker and tracks ---
await nav("#learn");
const picker = await ev(`(()=>({
  cards:[...document.querySelectorAll('.language-card')].map(c=>c.dataset.lang),
  heading:document.querySelector('h1')?.textContent
}))()`);
check("language picker shows six languages", picker.cards.length, 6);
check("picker includes Python", picker.cards.includes("python"), true);
check("picker includes JavaScript", picker.cards.includes("javascript"), true);
check(
  "picker includes HTML and CSS",
  picker.cards.includes("html") && picker.cards.includes("css"),
  true,
);
check(
  "picker includes Java and C++",
  picker.cards.includes("java") && picker.cards.includes("cpp"),
  true,
);
check(
  "picker heading invites a choice",
  picker.heading,
  "Choose your language.",
);

await nav("#learn/javascript");
const jsTrack = await ev(`(()=>{
  const rows=[...document.querySelectorAll('.lesson-row')];
  return {
    count:rows.length,
    locked:rows.map(r=>r.classList.contains('locked')),
    firstAction:rows[0]?.querySelector('.lesson-status,.btn')?.textContent.trim()
  };
})()`);
check("JavaScript track lists five lessons", jsTrack.count, 5);
check("first JS lesson is unlocked", jsTrack.locked[0], false);
check("second JS lesson starts locked", jsTrack.locked[1], true);
check("first JS lesson shows a Start action", jsTrack.firstAction, (v) =>
  /Start/.test(v || ""),
);

await nav("#learn/python");
const pythonTrack = await ev(`(()=>{
  const rows=[...document.querySelectorAll('.lesson-row')];
  return {
    count:rows.length,
    locked:rows.map(r=>r.classList.contains('locked'))
  };
})()`);
check("Python track lists five lessons", pythonTrack.count, 5);
check("Python first lesson is unlocked", pythonTrack.locked[0], false);
check("Python second lesson starts locked", pythonTrack.locked[1], true);

// --- Theory and quiz checking ---
await nav("#learn/javascript/js-basics");
check(
  "lesson page opens",
  await ev(`document.querySelector('h1')?.textContent`),
  "Values & variables",
);
const theory = await ev(`(()=>({
  blocks:document.querySelectorAll('.theory-block').length,
  code:document.querySelectorAll('.theory-block .code').length,
  objectives:document.querySelectorAll('.lesson-objectives li').length,
  terms:document.querySelectorAll('.term-list dt').length,
  pitfall:Boolean(document.querySelector('.pitfall')),
  tabs:[...document.querySelectorAll('.tabbar button')].map(b=>b.textContent.trim())
}))()`);
check("lesson shows expanded theory blocks", theory.blocks, 4);
check("theory includes code examples", theory.code, (v) => v >= 2);
check("lesson lists objectives", theory.objectives, 3);
check("lesson defines key terms", theory.terms, 4);
check("lesson warns about a common mistake", theory.pitfall, true);
check(
  "lesson exposes theory, quiz and lab tabs",
  theory.tabs.length === 3 &&
    /Theory/.test(theory.tabs[0]) &&
    /Quiz/.test(theory.tabs[1]) &&
    /Code lab/.test(theory.tabs[2]),
  true,
);
await clickText("button", "Start quiz");
await sleep(350);
const taskOne = await ev(`(()=>({
  head:document.querySelector('.task-head .eyebrow')?.textContent.replace(/\\s+/g,' ').trim(),
  level:document.querySelector('.task-level')?.textContent,
  choices:document.querySelectorAll('.choices input').length
}))()`);
check("quiz starts at task one", taskOne.head, "TASK 01 / 10");
check("first task is a warm-up", taskOne.level, "Warm-up");
check("each task has four options", taskOne.choices, 4);

await ev(`document.querySelectorAll('.choices input')[2].click();'ok'`);
await sleep(200);
await clickText("button", "Check answer");
await sleep(350);
const wrongAttempt = await ev(`(()=>({
  text:document.querySelector('.panel .result')?.textContent || null,
  state:${STATE}
}))()`);
check(
  "wrong answer is marked incorrect",
  /Not quite/.test(wrongAttempt.text || ""),
  true,
);
check(
  "wrong answer is not counted",
  wrongAttempt.state?.practice?.["javascript:js-basics"]?.length ?? 0,
  0,
);

await ev(`document.querySelectorAll('.choices input')[0].click();'ok'`);
await sleep(200);
await clickText("button", "Check answer");
await sleep(400);
const firstCorrect = await ev(`(()=>({
  text:document.querySelector('.panel .result')?.textContent || null,
  state:${STATE}
}))()`);
check(
  "correct answer is accepted",
  /Correct\./.test(firstCorrect.text || ""),
  true,
);
check(
  "correct answer is stored",
  firstCorrect.state?.practice?.["javascript:js-basics"]?.length,
  1,
);
check(
  "one correct task does not complete the lesson",
  firstCorrect.state?.completed?.includes("javascript:js-basics"),
  false,
);

const nextAnswers = [1, 1, 1, 2];
for (const answer of nextAnswers) {
  await clickText("button", "Next task");
  await sleep(250);
  await ev(
    `document.querySelectorAll('.choices input')[${answer}].click();'ok'`,
  );
  await sleep(150);
  await clickText("button", "Check answer");
  await sleep(350);
}
const passedLesson = await ev(`(()=>({
  tag:[...document.querySelectorAll('.tag')].map(t=>t.textContent).find(t=>t.includes('Lesson passed')) || null,
  pass:document.querySelector('.lesson-pass')?.textContent.replace(/\\s+/g,' ').trim() || null,
  state:${STATE}
}))()`);
check(
  "five correct tasks pass the lesson",
  passedLesson.tag,
  "Lesson passed ✓",
);
check(
  "pass banner says the next lesson is unlocked",
  /next lesson is now unlocked/.test(passedLesson.pass || ""),
  true,
);
check("lesson grants 40 XP", passedLesson.state?.xp, 40);
check("lesson grants 15 coins", passedLesson.state?.coins, 15);
check(
  "lesson is recorded as completed",
  passedLesson.state?.completed?.includes("javascript:js-basics"),
  true,
);
check(
  "five task answers are stored",
  passedLesson.state?.practice?.["javascript:js-basics"]?.length,
  5,
);

await nav("#learn/javascript");
const unlocked = await ev(`(()=>{
  const rows=[...document.querySelectorAll('.lesson-row')];
  return {locked:rows.map(r=>r.classList.contains('locked')), done:rows.map(r=>r.classList.contains('done'))};
})()`);
check(
  "second lesson unlocks after five correct tasks",
  unlocked.locked[1],
  false,
);
check("passed lesson is marked done", unlocked.done[0], true);

await reload();
const persisted = await ev(`(()=>({
  hash:location.hash,
  state:${STATE},
  locked:[...document.querySelectorAll('.lesson-row')].map(r=>r.classList.contains('locked'))
}))()`);
check("track hash survives reload", persisted.hash, "#learn/javascript");
check("XP persists after reload", persisted.state?.xp, 40);
check(
  "completed lesson persists after reload",
  persisted.state?.completed?.includes("javascript:js-basics"),
  true,
);
check("unlock state persists after reload", persisted.locked[1], false);

await nav("#learn/javascript/js-basics");
await clickText(".tabbar button", "Quiz");
await sleep(350);
const resumed = await ev(`(()=>({
  head:document.querySelector('.task-head .eyebrow')?.textContent.replace(/\\s+/g,' ').trim(),
  state:${STATE}
}))()`);
check(
  "practice resumes at the next unanswered task",
  resumed.head,
  "TASK 06 / 10",
);
check(
  "task progress persists after reload",
  resumed.state?.practice?.["javascript:js-basics"]?.length,
  5,
);

await ev(`document.querySelectorAll('.choices input')[0].click();'ok'`);
await sleep(200);
await clickText("button", "Check answer");
await sleep(400);
const extra = await ev(`(()=>({state:${STATE}}))()`);
check("extra correct task does not award XP twice", extra.state?.xp, 40);
check(
  "extra correct task is stored",
  extra.state?.practice?.["javascript:js-basics"]?.length,
  6,
);

await nav("#learn");
const progressCard = await ev(`(()=>{
  const card=document.querySelector('.language-card[data-lang="javascript"]');
  return card?.textContent.replace(/\\s+/g,' ').trim() || null;
})()`);
check(
  "language picker shows track progress",
  /1 of 5 lessons passed/.test(progressCard || ""),
  true,
);

// --- Challenge filtering ---
await nav("#algorithms");
const allRows = await ev(
  `document.querySelectorAll('.problem-list tbody tr').length`,
);
check("challenge catalog renders six rows", allRows, 6);
await setValue(".filters input", "binary");
await sleep(400);
const searchTitles = await ev(
  `[...document.querySelectorAll('.problem-title')].map(a=>a.textContent)`,
);
check(
  "search finds Binary search only",
  searchTitles.length === 1 && searchTitles[0] === "Binary search",
  true,
);
await setValue(".filters input", "");
await setValue('.filters select[aria-label="Difficulty"]', "hard", "change");
await sleep(400);
const hardTitles = await ev(
  `[...document.querySelectorAll('.problem-title')].map(a=>a.textContent)`,
);
check("hard filter shows one problem", hardTitles.length === 1, true);
await setValue('.filters select[aria-label="Topic"]', "Arrays", "change");
await setValue('.filters select[aria-label="Difficulty"]', "medium", "change");
await sleep(400);
const comboTitles = await ev(
  `[...document.querySelectorAll('.problem-title')].map(a=>a.textContent)`,
);
check(
  "topic + difficulty filter combines",
  comboTitles.length === 1 && comboTitles[0] === "Two sum",
  true,
);
await setValue('.filters select[aria-label="Topic"]', "all", "change");
await setValue('.filters select[aria-label="Difficulty"]', "all", "change");
await sleep(300);
check(
  "filters reset to six rows",
  await ev(`document.querySelectorAll('.problem-list tbody tr').length`),
  6,
);

// --- Typing completion ---
await nav("#copy");
const snippet = await ev(`(()=>{
  const el=document.querySelector('.code-reference');
  return {text:el?el.textContent:null,len:el?el.textContent.length:0};
})()`);
check("typing reference renders text", snippet.len, (v) => v > 40);
await setValue(".editor textarea", snippet.text);
await sleep(500);
const typed = await ev(`(()=>({
  status:document.querySelector('[role="status"]')?.textContent || null,
  disabled:document.querySelector('.inline-actions button')?.disabled,
  progress:document.querySelector('.typing-progress span:last-child')?.textContent || null
}))()`);
check("exact typing enables completion", typed.disabled, false);
check(
  "exact typing reports a full match",
  /Every character matches/.test(typed.status || ""),
  true,
);
await clickText(".inline-actions button", "Complete exercise");
await sleep(500);
const typingDone = await ev(`(()=>({
  result:document.querySelector('.result')?.textContent || null,
  state:${STATE}
}))()`);
check(
  "typing completion confirms success",
  /Perfect match/.test(typingDone.result || ""),
  true,
);
check("typing grants 20 XP", typingDone.state?.xp, 60);
check("typing grants 5 coins", typingDone.state?.coins, 20);
check(
  "typing exercise is recorded",
  typingDone.state?.completed?.includes("copy:hello"),
  true,
);

// --- Code lab: real execution, verdicts and rewards ---
await nav("#learn/javascript/js-basics");
await clickText(".tabbar button", "Code lab");
await sleep(350);
const labStart = await ev(`(()=>({
  checks:document.querySelectorAll('.lab-check').length,
  starter:document.querySelector('.lab-editor')?.value.includes('TODO') || false,
  file:document.querySelector('.lab-meta .tag')?.textContent || null,
  runLabel:[...document.querySelectorAll('.inline-actions button')].map(b=>b.textContent.trim()),
  disclosure:[...document.querySelectorAll('.panel > .muted')].map(e=>e.textContent).join(' ')
}))()`);
check("code lab lists its automated tests", labStart.checks, 2);
check("code lab starts from a starter snippet", labStart.starter, true);
check("code lab names the target file", labStart.file, "basics.js");
check(
  "code lab offers a real run action",
  labStart.runLabel.some((label) => /Run & check/.test(label)),
  true,
);
check(
  "code lab discloses remote execution",
  /Judge0 CE/.test(labStart.disclosure || "") &&
    /sent to the public/.test(labStart.disclosure || ""),
  true,
);
await clickText("button", "Run & check");
await waitFor(
  `Boolean(document.querySelector('.lab-result.error, .lab-result.pass'))`,
);
const labStarterResult = await ev(`(()=>({
  failed:document.querySelectorAll('.lab-check.fail').length,
  error:Boolean(document.querySelector('.lab-result.error')),
  output:document.querySelector('.lab-output')?.textContent.replace(/\\s+/g,' ').trim() || null,
  state:${STATE}
}))()`);
check("starter code fails a real test", labStarterResult.failed, (v) => v > 0);
check("starter code shows the retry guidance", labStarterResult.error, true);
check(
  "failed run shows runner output",
  /Runner output/.test(labStarterResult.output || ""),
  true,
);
check("failed lab run grants no XP", labStarterResult.state?.xp, 60);

const labSolution = `const name = require("node:fs").readFileSync(0, "utf8").trim();
function greet(person) {
  return \`Hello, \${person}!\`;
}
console.log(greet(name));`;
await setValue(".lab-editor", labSolution);
await sleep(200);
await clickText("button", "Run & check");
await waitFor(`Boolean(document.querySelector('.lab-result.pass'))`);
const labDone = await ev(`(()=>({
  passed:document.querySelectorAll('.lab-check.pass').length,
  result:document.querySelector('.lab-result.pass')?.textContent.replace(/\\s+/g,' ').trim() || null,
  output:document.querySelector('.lab-output')?.textContent.replace(/\\s+/g,' ').trim() || null,
  state:${STATE}
}))()`);
check("complete lab solution passes every test", labDone.passed, 2);
check(
  "lab result reports a real accepted run",
  /Accepted — all 2 tests passed/.test(labDone.result || ""),
  true,
);
check(
  "accepted run shows program stdout",
  /Hello, Grace!/.test(labDone.output || ""),
  true,
);
check("code lab grants 10 XP", labDone.state?.xp, 70);
check("code lab grants 5 coins", labDone.state?.coins, 25);
check(
  "code lab is recorded separately",
  labDone.state?.labs?.includes("javascript:js-basics:js-basics-lab"),
  true,
);
check(
  "code lab counts as a completed exercise",
  labDone.state?.completed?.includes("javascript:js-basics:js-basics-lab"),
  true,
);

await clickText("button", "Run & check");
await sleep(1200);
await waitFor(`Boolean(document.querySelector('.lab-result.pass'))`);
const labRepeat = await ev(`(()=>({state:${STATE}}))()`);
check(
  "re-running a passed lab does not award XP again",
  labRepeat.state?.xp,
  70,
);

await reload();
await clickText(".tabbar button", "Code lab");
await sleep(350);
const labPersisted = await ev(`(()=>({
  draft:document.querySelector('.lab-editor')?.value.includes('Hello') || false,
  complete:document.querySelector('.lab-meta')?.textContent.includes('Lab complete') || false,
  state:${STATE}
}))()`);
check("lab draft persists after reload", labPersisted.draft, true);
check("lab completion persists after reload", labPersisted.complete, true);
check("lab XP persists after reload", labPersisted.state?.xp, 70);

// --- Render lab: real sandboxed preview and computed-style checks ---
await nav("#learn/css/css-basics");
await clickText(".tabbar button", "Code lab");
await sleep(350);
const renderLabStart = await ev(`(()=>({
  preview:Boolean(document.querySelector('.lab-preview iframe')),
  checks:document.querySelectorAll('.lab-check').length,
  runLabel:[...document.querySelectorAll('.inline-actions button')].map(b=>b.textContent.trim())
}))()`);
check("css lab renders a live preview", renderLabStart.preview, true);
check("css lab lists its layout tests", renderLabStart.checks, 5);
check(
  "css lab offers a layout test action",
  renderLabStart.runLabel.some((label) => /Run layout tests/.test(label)),
  true,
);

const cssSolution = `.card {
  color: #173e31;
  background-color: #f4efe5;
  padding: 20px;
  border-radius: 12px;
}
#hero {
  color: #ffffff;
  background-color: #173e31;
  padding: 24px;
}
.card p {
  color: #55605b;
  line-height: 1.6;
}`;
await setValue(".lab-editor", cssSolution);
await sleep(300);
await clickText("button", "Run layout tests");
await waitFor(`Boolean(document.querySelector('.lab-result.pass'))`, 15000);
const renderLabDone = await ev(`(()=>({
  passed:document.querySelectorAll('.lab-check.pass').length,
  result:document.querySelector('.lab-result.pass')?.textContent.replace(/\\s+/g,' ').trim() || null,
  state:${STATE}
}))()`);
check(
  "css layout tests pass on the reference solution",
  renderLabDone.passed,
  5,
);
check(
  "css lab reports a rendered result",
  /Accepted — all 5 tests passed/.test(renderLabDone.result || ""),
  true,
);
check("css lab grants 10 XP", renderLabDone.state?.xp, 80);
check("css lab grants 5 coins", renderLabDone.state?.coins, 30);

// --- Profile rename: first free, second blocked, persistence ---
await nav("#profile");
await setValue(".profile-form input", "Aruzhan");
await sleep(200);
await clickText(".profile-form button", "Save changes");
await sleep(500);
const savedProfile = await ev(`(()=>({
  message:document.querySelector('.profile-form .result')?.textContent || null,
  heading:document.querySelector('.profile-identity h2')?.textContent || null,
  state:${STATE}
}))()`);
check(
  "profile save confirms",
  /saved in this browser/.test(savedProfile.message || ""),
  true,
);
check("profile name updates", savedProfile.heading, "Aruzhan");
check("rename flag is stored", savedProfile.state?.renamed, true);

await setValue(".profile-form input", "Arlan");
await sleep(200);
await clickText(".profile-form button", "Save changes");
await sleep(500);
const blockedProfile = await ev(`(()=>({
  message:document.querySelector('.profile-form .result')?.textContent || null,
  heading:document.querySelector('.profile-identity h2')?.textContent || null,
  state:${STATE}
}))()`);
check(
  "second rename is blocked",
  /free name change has been used/.test(blockedProfile.message || ""),
  true,
);
check(
  "blocked rename keeps the saved name",
  blockedProfile.state?.name,
  "Aruzhan",
);

await reload();
const profileReload = await ev(`(()=>({
  name:document.querySelector('.profile-form input')?.value,
  heading:document.querySelector('.profile-identity h2')?.textContent,
  hint:[...document.querySelectorAll('.profile-form small')].map(e=>e.textContent).join(' '),
  state:${STATE}
}))()`);
check("renamed profile persists after reload", profileReload.name, "Aruzhan");
check(
  "rename lock persists after reload",
  /free name change has been used/.test(profileReload.hint || ""),
  true,
);

// --- Account: server session through the /api proxy ---
await nav("#profile");
const accountAnon = await ev(`(()=>({
  tabs:[...document.querySelectorAll('.account-tab')].map(b=>b.textContent.trim()),
  fields:document.querySelectorAll('.account-form input').length,
  note:document.querySelector('.account-note')?.textContent || ''
}))()`);
check(
  "account panel offers sign in",
  accountAnon.tabs.includes("Sign in"),
  true,
);
check(
  "account panel offers registration",
  accountAnon.tabs.includes("Create account"),
  true,
);
check("signed-out account asks for credentials", accountAnon.fields, 2);
check(
  "account panel explains local progress",
  /on this device/.test(accountAnon.note),
  true,
);

await clickText(".account-tab", "Create account");
await sleep(250);
await setValue('.account-form input[type="email"]', "ada@example.com");
await setValue('.account-form input[type="password"]', "password123");
await setValue('.account-form input[autocomplete="username"]', "Aruzhan");
await ev(
  `document.querySelector('.account-form button[type=submit]').click();'ok'`,
);
await waitFor(`!!document.querySelector('.account-identity')`);
await waitFor(`document.querySelectorAll('.account-facts dd').length === 4`);
await waitFor(
  `document.querySelector('.sidebar .account')?.textContent.includes('Aruzhan')`,
);
const signedIn = await ev(`(()=>({
  identity:document.querySelector('.account-identity strong')?.textContent,
  email:document.querySelector('.account-identity div span')?.textContent,
  tag:document.querySelector('.account-panel .tag')?.textContent,
  facts:[...document.querySelectorAll('.account-facts dd')].map(d=>d.textContent),
  sidebar:document.querySelector('.sidebar .account')?.textContent || '',
  hero:document.querySelector('.profile-identity h2')?.textContent,
  localXp:document.querySelector('.profile-numbers strong')?.textContent,
  token:localStorage.getItem('worldofcodes-session-v1')
}))()`);
check("registration opens a server session", signedIn.identity, "Aruzhan");
check("account shows the server email", signedIn.email, "ada@example.com");
check("account panel marks the server session", signedIn.tag, "SERVER SESSION");
check(
  "account shows server level, XP, coins and lessons",
  signedIn.facts.join(","),
  "2,120,30,4",
);
check(
  "server nickname reaches the sidebar",
  /Aruzhan/.test(signedIn.sidebar),
  true,
);
check("server nickname reaches the profile hero", signedIn.hero, "Aruzhan");
check("server XP stays separate from local XP", signedIn.localXp, "80");
check(
  "registration stores a session token",
  typeof signedIn.token === "string" && signedIn.token.length > 0,
  true,
);

await setValue(".account-form input[pattern]", "Aruzhan_One");
await ev(
  `document.querySelector('.account-form button[type=submit]').click();'ok'`,
);
await waitFor(
  `document.querySelector('.account-identity strong')?.textContent === 'Aruzhan_One'`,
);
const renamedAccount = await ev(`(()=>({
  identity:document.querySelector('.account-identity strong')?.textContent,
  hint:document.querySelector('.account-form small')?.textContent || '',
  notice:document.querySelector('.account-form .result')?.textContent || ''
}))()`);
check(
  "server nickname update is reflected",
  renamedAccount.identity,
  "Aruzhan_One",
);
check(
  "server profile save confirms",
  /server profile has been updated/.test(renamedAccount.notice),
  true,
);
check(
  "nickname hint reports the used free change",
  /free nickname change has been used/.test(renamedAccount.hint),
  true,
);

await reload();
const restoredAccount = await waitFor(
  `(()=>{const el=document.querySelector('.account-identity strong');return el?el.textContent:null})()`,
);
check("server session survives reload", restoredAccount, "Aruzhan_One");

await clickText(".account-panel button", "Sign out");
await waitFor(`!!document.querySelector('.account-tabs')`);
const signedOut = await ev(`(()=>({
  form:!!document.querySelector('.account-tabs'),
  token:localStorage.getItem('worldofcodes-session-v1')
}))()`);
check("sign out returns to the account form", signedOut.form, true);
check("sign out removes the session token", signedOut.token, null);

await setValue('.account-form input[type="email"]', "ada@example.com");
await setValue('.account-form input[type="password"]', "not-the-password");
await ev(
  `document.querySelector('.account-form button[type=submit]').click();'ok'`,
);
const signInError = await waitFor(
  `document.querySelector('.account-form .result.error')?.textContent || null`,
);
check(
  "bad credentials show the api error",
  /Invalid email or password/.test(signInError || ""),
  true,
);

await setValue('.account-form input[type="password"]', "password123");
await ev(
  `document.querySelector('.account-form button[type=submit]').click();'ok'`,
);
await waitFor(
  `document.querySelector('.account-identity strong')?.textContent === 'Aruzhan_One'`,
);
check(
  "sign in restores the server profile",
  await ev(`document.querySelector('.account-identity strong')?.textContent`),
  "Aruzhan_One",
);
await clickText(".account-panel button", "Sign out");
await waitFor(`!!document.querySelector('.account-tabs')`);

// --- Arena rehearsal: start, timeout, finish ---
await nav("#duel");
await ev(
  `window.__realNow=Date.now.bind(Date);window.__offset=0;Date.now=()=>window.__realNow()+window.__offset;'ok'`,
);
await clickText("button", "Start a rehearsal");
await sleep(700);
const started = await ev(`(()=>({
  heading:document.querySelector('h1')?.textContent || null,
  timer:document.querySelector('.timer')?.textContent.replace(/\\s+/g,' ').trim() || null,
  strip:document.querySelector('.match-strip')?.textContent.replace(/\\s+/g,' ').trim() || null
}))()`);
check("rehearsal opens the arena", started.heading, "Your practice arena");
check(
  "rehearsal timer starts near 15:00",
  /1[45]:\d\d/.test(started.timer || ""),
  true,
);
check(
  "rehearsal shows no opponent",
  /No opponent connected/.test(started.strip || ""),
  true,
);
await ev(`window.__offset=901000;'ok'`);
await sleep(1100);
const timedOut = await ev(
  `document.querySelector('[role="status"]')?.textContent || null`,
);
check("rehearsal timeout is handled", /Time is up/.test(timedOut || ""), true);
await clickText("button", "End rehearsal");
await sleep(400);
check(
  "end rehearsal opens a confirmation",
  await ev(`!!document.querySelector('dialog[open]')`),
  true,
);
await clickText("button", "Finish session");
await sleep(500);
check(
  "finish returns to setup",
  await ev(`document.querySelector('h1')?.textContent`),
  "Meet your next challenge.",
);

// --- Friendly room code validation ---
await nav("#friends");
await clickText(".tabbar button", "Join with a code");
await sleep(350);
await setValue(".profile-form input", "abc");
await sleep(150);
await clickText("button", "Validate code");
await sleep(400);
const invalidCode = await ev(
  `document.querySelector('.profile-form .result')?.textContent || null`,
);
check(
  "invalid room code is rejected",
  /6-character code/.test(invalidCode || ""),
  true,
);
await setValue(".profile-form input", "ABC123");
await sleep(150);
await clickText("button", "Validate code");
await sleep(400);
const validCode = await ev(
  `document.querySelector('.profile-form .result')?.textContent || null`,
);
check(
  "valid room code passes format check",
  /Valid code format/.test(validCode || ""),
  true,
);

// --- Mobile navigation ---
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 900,
  deviceScaleFactor: 1,
  mobile: true,
});
await nav("#home");
await sleep(400);
await ev(`document.querySelector('.mobile-controls button').click();'ok'`);
await sleep(400);
const menu = await ev(`(()=>({
  open:document.querySelector('.sidebar')?.classList.contains('mobile-open'),
  expanded:document.querySelector('.mobile-controls button')?.getAttribute('aria-expanded'),
  labels:[...document.querySelectorAll('.navitem')].map(a=>a.textContent.replace(/\\s+/g,' ').trim())
}))()`);
check("mobile menu opens", menu.open, true);
check("mobile menu exposes all routes", menu.labels.length, 7);
await ev(`document.querySelectorAll('.navitem')[1].click();'ok'`);
await sleep(600);
const menuNav = await ev(`(()=>({
  hash:location.hash,
  open:document.querySelector('.sidebar')?.classList.contains('mobile-open'),
  heading:document.querySelector('h1')?.textContent || null,
  overflow:document.documentElement.scrollWidth <= document.documentElement.clientWidth
}))()`);
check("mobile navigation reaches Lessons", menuNav.hash, "#learn");
check(
  "mobile lessons page shows the picker",
  menuNav.heading,
  "Choose your language.",
);
check("mobile menu closes after navigation", menuNav.open, false);
check("mobile page stays within the viewport", menuNav.overflow, true);

await nav("#learn/javascript");
const mobileTrack = await ev(`(()=>({
  rows:document.querySelectorAll('.lesson-row').length,
  overflow:document.documentElement.scrollWidth <= document.documentElement.clientWidth
}))()`);
check("mobile track lists the five lessons", mobileTrack.rows, 5);
check(
  "mobile lesson list stays within the viewport",
  mobileTrack.overflow,
  true,
);

await nav("#learn/javascript/js-basics");
await clickText(".tabbar button", "Quiz");
await sleep(350);
check(
  "mobile practice stays within the viewport",
  await ev(
    `document.documentElement.scrollWidth <= document.documentElement.clientWidth`,
  ),
  true,
);
await clickText(".tabbar button", "Code lab");
await sleep(350);
check(
  "mobile code lab shows the editor",
  await ev(`document.querySelectorAll('.lab-editor').length`),
  1,
);
check(
  "mobile code lab stays within the viewport",
  await ev(
    `document.documentElement.scrollWidth <= document.documentElement.clientWidth`,
  ),
  true,
);

const failed = results.filter((r) => !r.pass);
console.log(
  JSON.stringify(
    {
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      pageErrors: [...new Set(pageErrors)].slice(0, 8),
      failures: failed,
      results,
    },
    null,
    2,
  ),
);
ws.close();
chrome.kill();
stub.closeAllConnections();
stub.close();
process.exit(failed.length ? 1 : 0);

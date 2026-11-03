// Browser QA for the demo frontend. Start the dev server first:
//   npm run dev -- --port 5180
//   node tests/browser-qa.mjs
// Override CHROME_PATH, BASE_URL, CDP_PORT or CHROME_PROFILE when needed.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.env.CDP_PORT || 9335);
const BASE = process.env.BASE_URL || "http://localhost:5180";

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

// --- Learning path: lock state ---
await nav("#learn");
const list = await ev(`(()=>{
  const rows=[...document.querySelectorAll('.lesson-row')];
  return {
    count:rows.length,
    locked:rows.map(r=>r.classList.contains('locked')),
    done:rows.map(r=>r.classList.contains('done')),
    firstAction:rows[0]?.querySelector('.lesson-status,.btn')?.textContent.trim()
  };
})()`);
check("learning path lists six lessons", list.count, 6);
check("first lesson is unlocked", list.locked[0], false);
check("second lesson starts locked", list.locked[1], true);
check("first lesson shows a Start action", list.firstAction, (v) =>
  /Start/.test(v || ""),
);

// --- Lesson completion, retry and idempotent reward ---
await nav("#learn/variables");
check(
  "variables lesson page opens",
  await ev(`document.querySelector('h1')?.textContent`),
  "Variables & types",
);
await clickText(".tabbar button", "Practice");
await sleep(300);
const choices = await ev(
  `[...document.querySelectorAll('.choices span')].map(s=>s.textContent)`,
);
check("practice choices render", choices.length, 4);
await ev(`document.querySelectorAll('.choices input')[1].click();'ok'`);
await sleep(200);
await clickText("button", "Check answer");
await sleep(400);
const afterLesson = await ev(`(()=>({
  result:document.querySelector('.panel .result')?.textContent || null,
  tag:[...document.querySelectorAll('.tag')].map(t=>t.textContent).find(t=>t.includes('Lesson complete')) || null,
  reward:document.querySelector('.lesson-reward p')?.textContent || null,
  state:${STATE}
}))()`);
check(
  "correct answer is accepted",
  /Exactly right/.test(afterLesson.result || ""),
  true,
);
check(
  "lesson complete tag appears",
  /Lesson complete/.test(afterLesson.tag || ""),
  true,
);
check("lesson grants 40 XP", afterLesson.state?.xp, 40);
check("lesson grants 15 coins", afterLesson.state?.coins, 15);
check(
  "lesson is recorded as completed",
  afterLesson.state?.completed?.includes("variables"),
  true,
);
check(
  "reward copy switches to earned",
  /earned this lesson reward/.test(afterLesson.reward || ""),
  true,
);

await clickText("button", "Check answer");
await sleep(350);
const repeated = await ev(STATE);
check("re-checking does not award XP twice", repeated?.xp, 40);
check("re-checking does not award coins twice", repeated?.coins, 15);

await nav("#learn");
const unlocked = await ev(`(()=>{
  const rows=[...document.querySelectorAll('.lesson-row')];
  return {locked:rows.map(r=>r.classList.contains('locked')), done:rows.map(r=>r.classList.contains('done'))};
})()`);
check("second lesson unlocks after the first", unlocked.locked[1], false);
check("completed lesson is marked done", unlocked.done[0], true);

await reload();
const persisted = await ev(`(()=>({
  hash:location.hash,
  state:${STATE},
  locked:[...document.querySelectorAll('.lesson-row')].map(r=>r.classList.contains('locked')),
  row1:[...document.querySelectorAll('.lesson-row')][1]?.querySelector('.lesson-copy h3')?.textContent
}))()`);
check("hash survives reload", persisted.hash, "#learn");
check("XP persists after reload", persisted.state?.xp, 40);
check(
  "completed lesson persists after reload",
  persisted.state?.completed?.includes("variables"),
  true,
);
check("unlock state persists after reload", persisted.locked[1], false);

// --- Wrong answer then retry ---
await nav("#learn/variables");
await clickText(".tabbar button", "Practice");
await sleep(300);
await ev(`document.querySelectorAll('.choices input')[0].click();'ok'`);
await sleep(200);
await clickText("button", "Check answer");
await sleep(350);
const wrong = await ev(`document.querySelector('.panel .result')?.textContent`);
check("wrong answer shows retry guidance", /Not quite/.test(wrong || ""), true);
await ev(`document.querySelectorAll('.choices input')[1].click();'ok'`);
await sleep(200);
await clickText("button", "Check answer");
await sleep(350);
const retryState = await ev(STATE);
check("retry after completion keeps XP at 40", retryState?.xp, 40);

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
check("mobile navigation reaches Learning Path", menuNav.hash, "#learn");
check("mobile menu closes after navigation", menuNav.open, false);
check("mobile page stays within the viewport", menuNav.overflow, true);

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
process.exit(failed.length ? 1 : 0);

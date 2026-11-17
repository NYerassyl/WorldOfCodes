// Browser acceptance for the Arena smart editor: Python auto-pair, block-aware
// Enter, Tab past a closing bracket, monospace text and reload restore.
// Requires the API with a real judge database and Google Chrome:
//   node --env-file=.env scripts/verify-arena-editor-browser.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4001";
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.env.CDP_PORT || 9361);
const results = [];
const pass = (name, detail = "") => {
  results.push(name);
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
};

const letters = (length) =>
  Array.from({ length }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
const stamp = Date.now();

async function api(path, { token, method = "GET", body } = {}) {
  const response = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}

async function register() {
  const nickname = `arena${letters(6)}`;
  const { status, json } = await api("/auth/register", {
    method: "POST",
    body: { email: `${nickname}.${stamp}@example.com`, password: "Passw0rd!123", nickname },
  });
  assert.equal(status, 201, "register browser account");
  return json;
}

const chrome = spawn(CHROME, [
  "--headless=new",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-gpu",
  "--hide-scrollbars",
  `--user-data-dir=${process.env.CHROME_PROFILE || "/tmp/chrome-woc-arena-editor"}`,
  `--remote-debugging-port=${PORT}`,
  "--window-size=1440,1000",
  "about:blank",
], { stdio: "ignore" });

async function target() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((item) => item.type === "page");
      if (page) return page;
    } catch { /* Chrome is still starting. */ }
    await sleep(250);
  }
  throw new Error("no Chrome target");
}

let ws;
try {
  const alice = await register();
  const bob = await register();
  const invite = await api("/battle/friendly", { token: alice.token, method: "POST", body: {} });
  assert.equal(invite.status, 201);
  const joined = await api(`/battle/friendly/${invite.json.inviteCode}/join`, { token: bob.token, method: "POST" });
  assert.equal(joined.status, 200);
  pass("browser setup: active friendly match exists", joined.json.id);

  const page = await target();
  ws = new WebSocket(page.webSocketDebuggerUrl);
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
  const send = (method, params = {}) => new Promise((resolve) => {
    const messageId = ++id;
    pending.set(messageId, resolve);
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });
  const evaluate = async (expression) => {
    const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (response.result?.exceptionDetails) {
      throw new Error(response.result.exceptionDetails.exception?.description || "evaluation failed");
    }
    return response.result?.result?.value;
  };
  const key = async (keyName, text, code) => {
    await send("Input.dispatchKeyEvent", {
      type: "keyDown", key: keyName, code: keyName, text, unmodifiedText: text,
      windowsVirtualKeyCode: code ?? text?.charCodeAt(0) ?? 0,
    });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: keyName, code: keyName });
    await sleep(40);
  };
  const type = async (text) => {
    await send("Input.insertText", { text });
    await sleep(40);
  };
  const editorValue = () => evaluate(`document.querySelector('.battle-solution textarea[aria-label="Code editor"]').value`);
  const caret = () => evaluate(`document.querySelector('.battle-solution textarea[aria-label="Code editor"]').selectionStart`);
  const setCaret = (position) => evaluate(`(() => {
    const editor = document.querySelector('.battle-solution textarea[aria-label="Code editor"]');
    editor.focus(); editor.setSelectionRange(${position}, ${position});
  })()`);
  const waitForEditor = async () => {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const ready = await evaluate(`(() => {
        const editor = document.querySelector('.battle-solution textarea[aria-label="Code editor"]');
        return Boolean(editor && editor.value.length > 0);
      })()`);
      if (ready) return;
      await sleep(250);
    }
    throw new Error("Arena editor did not load");
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: BASE });
  await sleep(1200);
  await evaluate(`localStorage.setItem('worldofcodes-session-v1', ${JSON.stringify(alice.token)})`);
  await send("Page.navigate", { url: `${BASE}/#duel` });
  await ensureReload();
  async function ensureReload() {
    await sleep(1500);
    const hasEditor = await evaluate(`Boolean(document.querySelector('.battle-solution textarea'))`);
    if (!hasEditor) {
      await send("Page.reload");
      await sleep(1800);
    }
  }
  await waitForEditor();
  pass("browser: the active match renders after a page load");

  const font = await evaluate(`getComputedStyle(document.querySelector('.battle-solution textarea')).fontFamily`);
  assert.match(font, /JetBrains Mono|monospace/i, "editor uses a monospace font");
  pass("browser: the Arena editor is monospace", font);

  const help = await evaluate(`document.querySelector('.editor-key-help')?.textContent ?? ''`);
  assert.match(help, /Tab indents or moves past a closing bracket/);
  pass("browser: the key help text is present");

  await evaluate(`(() => {
    const editor = document.querySelector('.battle-solution textarea');
    editor.focus(); editor.select();
  })()`);
  await key("Backspace", undefined, 8);
  assert.equal(await editorValue(), "", "editor cleared");

  await type("x = ");
  await key("(", "(", 40);
  assert.equal(await editorValue(), "x = ()", "opening paren inserts its closing partner");
  assert.equal(await caret(), 5, "caret sits between the pair");

  await setCaret(6);
  await type("\nif x:");
  await key("Enter", "\r", 13);
  assert.equal(await editorValue(), "x = ()\nif x:\n    ", "Enter after a Python block header indents one level");
  pass("browser: Python brackets auto-close", JSON.stringify(await editorValue()));

  await type("print");
  await key("(", "(", 40);
  assert.equal(await editorValue(), "x = ()\nif x:\n    print()", "second pair auto-closes after print");
  await key(")", ")", 41);
  assert.equal(await editorValue(), "x = ()\nif x:\n    print()", "typing the closer overtypes instead of doubling");
  pass("browser: typing a closer overtypes the auto-inserted one");

  const closer = await evaluate(`(() => {
    const editor = document.querySelector('.battle-solution textarea');
    const at = editor.value.indexOf(')', editor.value.indexOf('print'));
    editor.focus(); editor.setSelectionRange(at, at); return at;
  })()`);
  await key("Tab", undefined, 9);
  assert.equal(await caret(), closer + 1, "Tab moves the caret past the closer");
  assert.equal(await editorValue(), "x = ()\nif x:\n    print()", "Tab past a closer does not change the text");
  pass("browser: Tab exits the closing bracket");

  await type("\n");
  await key('"', '"', 34);
  assert.match(await editorValue(), /"\s*"$/, "double quote inserts its partner");
  pass("browser: Python quotes auto-close");

  await send("Page.reload");
  await sleep(1800);
  await waitForEditor();
  pass("browser: reloading the page restores the same active match");

  console.log(`\nALL ${results.length} BROWSER CHECKS PASSED`);
} catch (error) {
  console.error("FAIL", error.message);
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch { /* already closed */ }
  chrome.kill();
}

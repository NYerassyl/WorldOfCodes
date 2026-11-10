// PLAYWRIGHT_MODULE may point to a host-provided Playwright installation.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.APP_URL || "http://127.0.0.1:4001";
const suffix = Date.now().toString(36);
const email = `browser-${suffix}@example.test`;
const nickname = `browser_${suffix}`;
const waitText = (text) =>
  page.getByText(text, { exact: false }).first().waitFor({ timeout: 20000 });
await mkdir("/private/tmp/worldofcodes-qa", { recursive: true });
try {
  await page.goto(base + "/#profile");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("BrowserTestPass_123");
  await page.locator("input[autocomplete=username]").fill(nickname);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .last()
    .click();
  await waitText("SERVER SESSION");
  const token = await page.evaluate(() =>
    localStorage.getItem("worldofcodes-session-v1"),
  );
  assert.ok(token);
  await page.reload();
  await waitText("SERVER SESSION");
  await page.goto(base + "/#learn/python");
  await page
    .getByRole("heading", { name: "Build your Python foundations." })
    .waitFor();
  assert.equal(await page.locator(".server-card").count(), 6);
  await page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", { name: "Variables", exact: true }),
    })
    .click();
  await page.getByLabel("Code editor").waitFor();
  assert.equal(
    await page.getByLabel("Code editor").inputValue(),
    "def double(n):\n    pass\n",
  );
  await page.getByLabel("Code editor").fill("def double(n):\n    return 0");
  await page.getByRole("button", { name: "Submit Python solution" }).click();
  await waitText("WRONG ANSWER");
  await page.getByLabel("Code editor").fill("def double(n):\n    return n * 2");
  await page.getByRole("button", { name: "Submit Python solution" }).click();
  await waitText("+20 XP");
  await page.getByRole("button", { name: "Area", exact: true }).click();
  await page
    .getByLabel("Code editor")
    .fill("def rectangle_area(width, height):\n    return width * height");
  await page.getByRole("button", { name: "Submit Python solution" }).click();
  await waitText("Lesson completed.");
  await page.screenshot({
    path: "/private/tmp/worldofcodes-qa/learning-desktop.png",
    fullPage: true,
  });
  await page.goto(base + "/#copy");
  await page.getByRole("button", { name: "Copy if statement" }).click();
  await page
    .getByLabel("Code editor")
    .fill('score = 85\nif score >= 75:\n    print("Passed")\n');
  await page.getByRole("button", { name: "Check exact match" }).click();
  await waitText("Exact match!");
  await page.goto(base + "/#profile");
  await waitText("SERVER SESSION");
  const facts = await page.locator(".account-facts").innerText();
  assert.match(facts, /Server XP\s+60/);
  assert.match(facts, /Coins\s+15/);
  assert.match(facts, /Lessons completed\s+1/);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .first()
    .waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("worldofcodes-session-v1")),
    null,
  );
  const revoked = await fetch(base + "/api/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(revoked.status, 401);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("BrowserTestPass_123");
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .last()
    .click();
  await waitText("SERVER SESSION");
  assert.match(
    await page.locator(".account-facts").innerText(),
    /Server XP\s+60/,
  );
  // A forged local reward never changes displayed account balances.
  await page.evaluate(() => {
    const key = "worldofcodes-demo-v1";
    const value = JSON.parse(localStorage.getItem(key));
    value.xp = 999999;
    value.coins = 999999;
    localStorage.setItem(key, JSON.stringify(value));
  });
  await page.reload();
  await waitText("SERVER SESSION");
  assert.equal(await page.locator(".balance b").innerText(), "15");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/#algorithms/py-double");
  await page.getByLabel("Code editor").waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "/private/tmp/worldofcodes-qa/problem-mobile.png",
    fullPage: true,
  });
  await page.goto(base + "/#home");
  await page.screenshot({
    path: "/private/tmp/worldofcodes-qa/home-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: real browser registration, restoration, six topics, wrong/correct submissions, lesson completion, copy, rewards, revoked logout, relogin, local balance tampering, desktop/mobile layout.",
  );
} finally {
  await browser.close();
}

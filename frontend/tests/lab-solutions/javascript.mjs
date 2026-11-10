export const solutions = {
  "js-basics-lab": `const name = require("node:fs").readFileSync(0, "utf8").trim();

function greet(who) {
  return \`Hello, \${who}!\`;
}

console.log(greet(name));`,
  "js-control-lab": `const limit = Number(require("node:fs").readFileSync(0, "utf8").trim());

const evens = [];
for (let n = 1; n <= limit; n++) {
  if (n % 2 === 0) {
    evens.push(n);
  }
}

console.log(evens.join(" "));`,
  "js-functions-lab": `const [width, height] = require("node:fs")
  .readFileSync(0, "utf8")
  .trim()
  .split(/\\s+/)
  .map(Number);

function area(w, h) {
  return w * h;
}

console.log(area(width, height));`,
  "js-dom-lab": `const events = require("node:fs")
  .readFileSync(0, "utf8")
  .split("\\n")
  .map((line) => line.trim())
  .filter(Boolean);

const note = {
  textContent: "Todo",
  classList: new Set(),
  handler: null,
  addEventListener(event, handler) {
    if (event === "click") {
      this.handler = handler;
    }
  },
  click() {
    if (this.handler) {
      this.handler();
    }
  },
};

note.addEventListener("click", () => {
  if (note.classList.has("done")) {
    note.classList.delete("done");
    note.textContent = "Todo";
  } else {
    note.classList.add("done");
    note.textContent = "Done";
  }
});

for (const event of events) {
  if (event === "click") {
    note.click();
  }
}

console.log(note.textContent);
console.log(note.classList.has("done") ? "done" : "not done");`,
  "js-async-lab": `const users = {
  "/api/ada": { name: "Ada" },
  "/api/grace": { name: "Grace" },
};

function fetchUser(url) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (users[url]) {
        resolve({ ok: true, json: () => Promise.resolve(users[url]) });
      } else {
        reject(new Error("unknown user"));
      }
    }, 0);
  });
}

const url = require("node:fs").readFileSync(0, "utf8").trim();

async function loadUser(target) {
  try {
    const response = await fetchUser(target);
    const user = await response.json();
    console.log(user.name);
  } catch (error) {
    console.log("Could not load user:", error.message);
  }
}

loadUser(url);`,
};

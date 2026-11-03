export const solutions = {
  "js-basics-lab": `function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("Ada"));`,
  "js-control-lab": `let result = "";
for (let n = 1; n <= 10; n++) {
  if (n % 2 === 0) {
    result += n + " ";
  }
}

console.log(result.trim());`,
  "js-functions-lab": `function area(width, height) {
  return width * height;
}

console.log(area(4, 5));`,
  "js-dom-lab": `const note = document.querySelector("#note");

note.addEventListener("click", () => {
  note.classList.toggle("done");
  note.textContent = note.classList.contains("done") ? "Done" : "Todo";
});`,
  "js-async-lab": `const url = "/api/user";

async function loadUser() {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Request failed with " + response.status);
    }
    const data = await response.json();
    console.log(data.name);
  } catch (error) {
    console.log("Could not load user:", error.message);
  }
}

loadUser();`,
};

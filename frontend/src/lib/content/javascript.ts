import type { Lesson, LessonExtras } from "../curriculum";

export const newLessons: Lesson[] = [
  {
    id: "js-dom",
    title: "The DOM & events",
    summary:
      "Select elements, change content and classes, and react to clicks and form input.",
    theory: [
      {
        title: "The page as a tree",
        body: "A browser does not keep your HTML as text. It reads the markup and builds the DOM, short for Document Object Model: a live tree of objects where every element is a node with a parent and children. JavaScript talks to the page through that tree, using the global document object as the entry point. The method you will use most is document.querySelector, which takes a CSS selector as a string and returns the first element that matches, or null when nothing matches. Pass '.card' for a class, '#note' for an id and 'li' for a tag, exactly as you would in a stylesheet. If you need every match, querySelectorAll returns a NodeList that you can loop over with forEach. Because the tree is live, changes you make through these objects appear on screen immediately. Store the result in a const so you can reuse it instead of searching again. Always ask what happens when the element is missing: a null result has no methods, so a guard like if (card) saves you from a confusing error.",
        code: `const card = document.querySelector(".card");
const panels = document.querySelectorAll(".panel");
console.log(card, panels.length);`,
      },
      {
        title: "Changing text and classes",
        body: "Once you hold an element, you can change it. The textContent property reads or replaces the text inside an element, and it treats the value as plain text, so angle brackets stay visible instead of becoming markup. That makes it the safe choice for content that comes from a user. Styles usually belong in CSS, so instead of writing inline styles from JavaScript, toggle a class. classList is a small helper attached to every element: add puts a class on, remove takes it off, toggle flips it and returns true when the class ended up present, and contains answers whether the class is there. To build something new, call document.createElement with a tag name, set its textContent or classList, then attach it to an existing element with append. A brand-new node exists in memory only until you add it to the tree, which is the most common reason a freshly created element never appears. Read the current class list before deciding what to change.",
        code: `const status = document.querySelector("#status");
status.textContent = "Saved";
status.classList.add("done");

const item = document.createElement("li");
item.textContent = "New task";
document.querySelector("ul").append(item);`,
      },
      {
        title: "Events and form values",
        body: "Events are the browser telling your code that something happened: a click, a key press, a form submission. You subscribe with element.addEventListener, passing an event name such as 'click' and a function called the handler. The handler runs later, whenever the event occurs, and receives an event object describing it. Attaching a listener does not call the function immediately; it registers it for the future. Form controls keep their current contents in a value property, so input.value gives you exactly what the user typed at that moment. For a form, listen for 'submit', read the fields, then call event.preventDefault() to stop the browser from reloading the page, which is otherwise its default reaction. Text fields also fire an 'input' event on every keystroke, which suits live previews and search boxes. Because values are strings, convert numbers with Number before doing maths. Remove a listener with removeEventListener using the same function reference.",
        code: `const field = document.querySelector("#name");

field.addEventListener("input", () => {
  console.log(field.value);
});`,
      },
    ],
    tasks: [
      {
        prompt: "Which call returns the first element whose class is card?",
        options: [
          'document.querySelector(".card")',
          'document.querySelectorAll(".card")',
          'document.getElementsByClassName("card")',
          'document.querySelector("card")',
        ],
        answer: 0,
        explanation:
          "querySelector takes a CSS selector and returns only the first match, while querySelectorAll and getElementsByClassName return every match.",
      },
      {
        prompt:
          "What does document.querySelector return when no element matches the selector?",
        options: ["undefined", "null", "false", "An empty array"],
        answer: 1,
        explanation:
          "querySelector signals a missing match with null, so guard the result before calling methods on it.",
      },
      {
        prompt:
          "Which property replaces the visible text of an element with plain text?",
        options: ["textContent", "innerHTML", "value", "classList"],
        answer: 0,
        explanation:
          "textContent writes text literally, so characters like angle brackets are shown instead of being parsed as markup.",
      },
      {
        prompt:
          "Which call adds the class active when it is missing and removes it when it is present?",
        options: [
          'element.classList.add("active")',
          'element.classList.remove("active")',
          'element.classList.toggle("active")',
          'element.classList.contains("active")',
        ],
        answer: 2,
        explanation:
          "toggle is the switch: it reads the current state, flips it and returns whether the class is now present.",
      },
      {
        prompt:
          "The page contains a span with id status whose text is Draft. What does the span show after this code runs?",
        code: `const label = document.querySelector("#status");
label.textContent = "Saved";`,
        options: ["Draft", "Saved", "#status", "Nothing"],
        answer: 1,
        explanation:
          "textContent replaces the old text with the new string, and the live tree updates the screen.",
      },
      {
        prompt: "What does this code add to the page?",
        code: `const item = document.createElement("li");
item.textContent = "New task";
list.append(item);`,
        options: [
          "A list item with the text New task, added as the last child of list",
          "A copy of every existing list item",
          "A new element that stays detached from the page",
          "An error, because a new li has no parent yet",
        ],
        answer: 0,
        explanation:
          "createElement builds the node, and append places it inside list as the final child.",
      },
      {
        prompt:
          "Which line correctly registers a click handler named show on a button element?",
        options: [
          'button.addEventListener("click", show);',
          "button.addEventListener(click, show());",
          'button.addEvent("onClick", show);',
          'button.onClick = addEventListener("click", show);',
        ],
        answer: 0,
        explanation:
          "The first argument is the event name as a string and the second is the function itself, passed without parentheses so it is not called immediately.",
      },
      {
        prompt: "What is logged while the user types into this field?",
        code: `const input = document.querySelector("#name");
input.addEventListener("input", () => {
  console.log(input.value);
});`,
        options: [
          "The starting value, once",
          "The current text after every keystroke",
          "The id of the field",
          "Nothing until the form is submitted",
        ],
        answer: 1,
        explanation:
          "The input event fires on each change, and value always holds the text as it is now.",
      },
      {
        prompt:
          "A submit handler calls event.preventDefault() before anything else. What is prevented?",
        options: [
          "The handler function from running",
          "The browser reloading the page for the submit event",
          "The input values from being read",
          "The event from reaching the form element",
        ],
        answer: 1,
        explanation:
          "preventDefault cancels the browser's built-in reaction to the event, which for a form submission is a page reload.",
      },
      {
        prompt:
          "You create a paragraph with document.createElement, set its textContent, but nothing appears on the page. What is missing?",
        options: [
          "A call to document.render()",
          "Adding the new element to an element that is already in the tree",
          "Setting an id on the new element",
          "Wrapping the code in addEventListener",
        ],
        answer: 1,
        explanation:
          "A created node lives in memory until append puts it inside the live tree; only then can the browser paint it.",
      },
    ],
  },
  {
    id: "js-async",
    title: "Async JavaScript",
    summary:
      "Work with promises, async/await and fetch, and handle failures without freezing the page.",
    theory: [
      {
        title: "Promises represent future values",
        body: "JavaScript runs one task at a time, so waiting for a network reply cannot block the page. A promise is an object that stands for a value that is not ready yet. It starts pending, then settles exactly once: fulfilled when the work succeeds, rejected when it fails. You do not read the value directly; you subscribe. The method then runs a callback with the fulfilled value, and catch runs a callback with the reason for failure, usually an Error. Both return a new promise, which is why calls chain: fetch a response, then read it. A callback passed to then may return another promise, and the chain waits for it. Functions such as setTimeout and fetch hand you promises instead of results. Treat a promise as a receipt: it is not the parcel, but it guarantees you will be told when the parcel arrives or why it never did. One settlement, many listeners.",
        code: `fetch("/api/user")
  .then((response) => response.json())
  .then((user) => console.log(user.name))
  .catch((error) => console.log("Failed:", error.message));`,
      },
      {
        title: "async, await and try/catch",
        body: "async and await are syntax on top of promises, not a different mechanism. Mark a function async and it always returns a promise: whatever you return is wrapped as a fulfilled value, and a thrown error becomes a rejection. Inside that function you may use await, which pauses the function until the promise settles, then gives you the fulfilled value. Pausing does not freeze the browser, because other code keeps running and the function resumes from that line later. Because await can throw, wrap risky work in try and catch, exactly as with synchronous code. The catch block receives the rejection reason, and a finally block runs either way, which suits cleanup such as hiding a spinner. Remember that await is only allowed inside an async function, and that calling an async function without await still starts its work, so handle the promise it returns rather than ignoring it.",
        code: `async function load() {
  try {
    const response = await fetch("/api/user");
    const user = await response.json();
    return user.name;
  } catch (error) {
    console.log("Failed:", error.message);
  }
}`,
      },
      {
        title: "fetch and parallel requests",
        body: "fetch is the browser function for HTTP requests. It takes a URL and returns a promise for a Response object, which describes the reply: status, headers and body. The body is a stream, so reading it is a second asynchronous step: response.json() returns another promise that resolves to the parsed JavaScript value, and response.text() does the same for raw text. Note that fetch rejects only for network-level failures. A 404 or 500 still resolves, so check response.ok, which is true for status codes from 200 to 299, and throw an error yourself when it is false. To run several independent requests at once, pass an array of promises to Promise.all. It resolves with an array of results in the same order as the input, and rejects as soon as any member rejects. That ordering keeps results readable even though the requests finish at different times, and it beats awaiting one request after another when the data is independent.",
        code: `const [user, posts] = await Promise.all([
  fetch("/api/user").then((r) => r.json()),
  fetch("/api/posts").then((r) => r.json()),
]);
console.log(user.name, posts.length);`,
      },
    ],
    tasks: [
      {
        prompt: "What does a promise represent?",
        options: [
          "A value that will be available later",
          "A copy of a variable made right away",
          "A function that must run immediately",
          "A scheduled CSS animation",
        ],
        answer: 0,
        explanation:
          "A promise is a placeholder for a future result, which is why you subscribe with then instead of reading it directly.",
      },
      {
        prompt:
          "Which method registers a callback that runs when a promise is fulfilled?",
        options: ["then", "catch", "finally", "resolve"],
        answer: 0,
        explanation:
          "then receives the fulfilled value, while catch handles rejection and finally runs in either case.",
      },
      {
        prompt: "Which keyword marks a function that always returns a promise?",
        options: ["await", "async", "promise", "defer"],
        answer: 1,
        explanation:
          "An async function wraps its returned value in a promise and turns thrown errors into rejections.",
      },
      {
        prompt: "What order does the console show?",
        code: `console.log("A");
setTimeout(() => console.log("B"), 0);
console.log("C");`,
        options: ["A B C", "A C B", "B A C", "C A B"],
        answer: 1,
        explanation:
          "The timer callback is queued and runs only after the current synchronous code, so C prints before B even with a delay of 0.",
      },
      {
        prompt: "Why are there two await keywords in this function?",
        code: `async function load() {
  const response = await fetch("/api/user");
  const user = await response.json();
  return user.name;
}`,
        options: [
          "The second await retries the request",
          "fetch returns a promise and response.json() returns another promise",
          "json() only works after an artificial delay",
          "One await is for the network and one is for errors",
        ],
        answer: 1,
        explanation:
          "Each asynchronous step produces its own promise, so the body must be awaited separately after the response arrives.",
      },
      {
        prompt:
          "A promise rejects. What does the callback passed to catch receive?",
        options: [
          "The error or rejection reason",
          "null",
          "The last fulfilled value",
          "The promise itself",
        ],
        answer: 0,
        explanation:
          "The rejection reason travels to catch, which is why logging error.message is usually enough to diagnose a failure.",
      },
      {
        prompt: "When does the catch block run in this function?",
        code: `async function load() {
  try {
    const response = await fetch("/data");
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.log("Failed:", error.message);
  }
}`,
        options: [
          "Only when fetch returns a 404",
          "When the request fails or reading the body throws",
          "Every time the function is called",
          "Only when console.log itself throws",
        ],
        answer: 1,
        explanation:
          "await forwards rejections into the surrounding catch, and a 404 does not reject at all, so response.ok would need its own check.",
      },
      {
        prompt:
          "Promise.all receives two requests and both succeed. What does it resolve with?",
        options: [
          "The result of whichever request finishes first",
          "An array of both results, in the order of the input array",
          "The total number of results",
          "A promise for each request",
        ],
        answer: 1,
        explanation:
          "Promise.all keeps the input order regardless of finishing order, so destructuring stays predictable.",
      },
      {
        prompt:
          "A fetch call receives a 404 response. What happens to the promise returned by fetch?",
        options: [
          "It rejects with the status code",
          "It resolves, because HTTP error codes are not network failures",
          "It stays pending until the page reloads",
          "It resolves with null",
        ],
        answer: 1,
        explanation:
          "fetch only rejects on network problems, so code must inspect response.ok and throw when the status is an error.",
      },
      {
        prompt:
          "Inside a then callback you call response.json() but forget to return it. What does the next then receive?",
        options: [
          "The parsed body",
          "The Response object",
          "undefined",
          "A rejected promise",
        ],
        answer: 2,
        explanation:
          "A chain passes along whatever the previous callback returns, and a callback without return produces undefined.",
      },
    ],
  },
];

export const extras: Record<string, LessonExtras> = {
  "js-basics": {
    objectives: [
      "Declare values with const and let, and explain when reassignment is allowed.",
      "Identify strings, numbers and booleans with typeof, including its quirks.",
      "Build readable messages with template literals instead of string concatenation.",
    ],
    terms: [
      {
        term: "binding",
        meaning:
          "A name in your code that points at a value and can be created with const or let.",
      },
      {
        term: "primitive",
        meaning:
          "A simple value such as a string, number or boolean that is copied whenever it is assigned.",
      },
      {
        term: "reference",
        meaning:
          "The link an object variable holds, which lets two names share one object.",
      },
      {
        term: "template literal",
        meaning:
          "A string written between backticks that can insert expressions with a dollar brace placeholder.",
      },
    ],
    deepDive: {
      title: "Going deeper: bindings, values and identity",
      body: "A useful mental model is that a variable is a label attached to a value, not a box that contains it. const stops you from moving the label to a different value, but it does not freeze the value itself: an object declared with const can still gain properties, because you are changing the object, not the binding. JavaScript splits values into primitives, such as strings, numbers, booleans, null and undefined, and objects, which include arrays and functions. Primitives are copied whenever they are assigned or passed, so two labels holding the number 5 are independent. Objects are shared through references, so two labels can point at the same object and a change through one is visible through the other. typeof is a quick check, but it has quirks worth memorising: typeof null is 'object', and arrays report 'object' too, so Array.isArray is the honest test for arrays. Prefer const by default and reach for let only when reassignment is part of the logic. Template literals are more than decoration: they turn values into text at the exact place you read the code, which keeps messages readable.",
    },
    pitfall:
      "A common beginner mistake is declaring everything with let and then wondering why values change unexpectedly, or assuming const makes an object immutable. Use const for bindings you never reassign and remember that const only protects the label. When you need a real copy of an object, create one explicitly instead of assigning the same reference to a second name.",
    lab: {
      id: "js-basics-lab",
      title: "Write a greet helper",
      brief:
        "In basics.js, read the name from stdin (one line), declare a function named greet that accepts that name as a parameter and returns a sentence in exactly this form: Hello, Ada! with a comma and an exclamation mark and no extra spaces. Then call greet and print the returned value with console.log. Your file really runs, twice, with two different names, and the printed output is compared line by line, so the sentence must be built from the input instead of being written out by hand.",
      file: "basics.js",
      starter:
        '// Read the name from stdin (one line).\nconst name = require("node:fs").readFileSync(0, "utf8").trim();\n\n// TODO: write greet(name) that returns a sentence like Hello, Ada!\n// Then print the value that greet returns with console.log.',
      tests: [
        {
          label: "Greets Ada",
          stdin: "Ada\n",
          expectedStdout: "Hello, Ada!",
        },
        {
          label: "Greets Grace",
          stdin: "Grace\n",
          expectedStdout: "Hello, Grace!",
        },
      ],
      hint: "Return the sentence from the function, then wrap the call in console.log so the value becomes visible. A template literal keeps the name inside a readable phrase instead of gluing pieces together with +.",
      explanation:
        "A function that returns text can be reused in many places, while console.log only shows a value once. Building the sentence with a template literal keeps the name inside a readable phrase, and calling the function inside console.log both runs it and displays the result. The runner executes your file once per input, so a hard-coded name passes no test while a sentence built from the parameter passes both.",
    },
  },
  "js-control": {
    objectives: [
      "Choose between if, else and the ternary operator for a decision.",
      "Write for and while loops whose update guarantees they stop.",
      "Accumulate a result across iterations without off-by-one errors.",
    ],
    terms: [
      {
        term: "condition",
        meaning:
          "An expression that evaluates to true or false and decides which branch runs.",
      },
      {
        term: "iteration",
        meaning: "One complete pass through the body of a loop.",
      },
      {
        term: "accumulator",
        meaning:
          "A variable declared before a loop that collects a result as the loop runs.",
      },
      {
        term: "infinite loop",
        meaning:
          "A loop whose condition never becomes false because its state is not updated.",
      },
    ],
    deepDive: {
      title: "Going deeper: thinking in loop states",
      body: "The clearest way to read a loop is as a small state machine with three parts: the starting state, the condition that decides whether another round happens, and the update that moves the state forward. In a for loop all three live in the header, which is why it suits counting. A while loop hides the update inside the body, so it is easy to forget, and a forgotten update produces the infinite loop that freezes the tab. Before writing a loop, name the state out loud: what changes each round, and what proves the loop should stop. Most off-by-one bugs come from choosing the wrong comparison; use a strict less-than with a length, and less-than-or-equal only when the end value truly belongs to the range. When a loop builds a result, initialise that result before the loop and update it inside, so the value after the loop is predictable. break and continue are escape hatches, not structure: one early break for a clear reason reads well, while several of them scatter the control flow. If you need both an index and a value, prefer for...of with entries over manual counting.",
    },
    pitfall:
      "Many beginners write a while loop and forget to change the value its condition checks, so the page appears to hang. Update the state inside the body, or use a for loop whose header makes the update impossible to miss. Also double-check the comparison, because a less-than-or-equal test against an array length visits one item too many.",
    lab: {
      id: "js-control-lab",
      title: "Collect the even numbers",
      brief:
        "In control.js, read a whole number from stdin. Loop from 1 up to that number inclusive and build one string that contains only the even numbers, separated by single spaces and with no space before or after the list. Use a condition inside the loop to decide what to add, then print the finished string with console.log once the loop has ended. Your program is executed with two different limits and both outputs must match exactly.",
      file: "control.js",
      starter:
        '// Read the upper limit from stdin.\nconst limit = Number(require("node:fs").readFileSync(0, "utf8").trim());\n\n// TODO: loop from 1 to limit, keep only the even numbers in one result string\n// separated by single spaces, then print it with console.log.\nlet result = "";',
      tests: [
        {
          label: "Even numbers up to 10",
          stdin: "10\n",
          expectedStdout: "2 4 6 8 10",
        },
        {
          label: "Even numbers up to 7",
          stdin: "7\n",
          expectedStdout: "2 4 6",
        },
      ],
      hint: "Decide the numbers with the remainder operator, and remember that the result string has to exist before the loop starts. Appending a space after every number leaves a trailing space, so push the numbers into an array and join them with a single space at the end, or trim the result.",
      explanation:
        "An accumulator declared before the loop keeps every accepted value in one place, so the result is complete when the loop ends. Checking the remainder with the modulus operator separates even numbers from odd ones without hard-coding a list, and printing after the loop shows the whole result rather than each step. Because the limit is read from stdin and the program is run twice, the loop has to use that number instead of a fixed 10.",
    },
  },
  "js-functions": {
    objectives: [
      "Define functions that accept parameters and return reusable values.",
      "Distinguish printed output from a returned value in a function.",
      "Choose between a function declaration and an arrow function for a task.",
    ],
    terms: [
      {
        term: "parameter",
        meaning:
          "A named slot in a function definition that receives a value when the function is called.",
      },
      {
        term: "argument",
        meaning:
          "The actual value passed into a function call for one of its parameters.",
      },
      {
        term: "return value",
        meaning:
          "The single result a function sends back to the code that called it.",
      },
      {
        term: "side effect",
        meaning:
          "A change a function makes outside itself, such as printing or editing shared data.",
      },
    ],
    deepDive: {
      title: "Going deeper: contracts between caller and function",
      body: "Treat a function as a contract: it receives inputs through parameters and hands back one output through return. The caller supplies arguments, and JavaScript matches them by position, not by name, so order matters. A function that only prints has no output to reuse, which is why console.log inside a helper is a debugging habit rather than a design; return the value and let the caller decide what to display. Functions that depend only on their parameters and return a result without touching anything else are called pure, and they are easy to test because the same inputs always give the same output. Arrow functions are shorthand for expressions, with one rule to remember: a concise body returns implicitly, while a body wrapped in braces needs an explicit return. That single difference explains most empty results beginners see. Default parameters document optional input without extra branching, and rest parameters collect a variable number of arguments. Small functions that do one thing compose better than large ones, because a pipeline of clear steps reads like a sentence and each step can be replaced on its own.",
    },
    pitfall:
      "A frequent mistake is printing inside a function and then expecting the result to be usable elsewhere, because printing does not produce a value. Return the value and log it at the call site instead. Arrow functions wrapped in braces also need an explicit return, otherwise they quietly hand back undefined.",
    lab: {
      id: "js-functions-lab",
      title: "Return the area",
      brief:
        "In functions.js, read two whole numbers from stdin on one line, separated by a space. Write a function named area that takes width and height and returns their product; the function must return the value and must not print anything itself. Call area with the two numbers you read and print the returned value with console.log. The file runs twice with different pairs of numbers, and the printed number must be exact, so the result has to be calculated.",
      file: "functions.js",
      starter:
        '// Read two numbers from stdin, for example "4 5".\nconst [width, height] = require("node:fs")\n  .readFileSync(0, "utf8")\n  .trim()\n  .split(/\\s+/)\n  .map(Number);\n\n// TODO: write a function named area that returns width * height.\n// Then print area(width, height) with console.log.',
      tests: [
        {
          label: "Rectangle 4 by 5",
          stdin: "4 5\n",
          expectedStdout: "20",
        },
        {
          label: "Rectangle 7 by 3",
          stdin: "7 3\n",
          expectedStdout: "21",
        },
      ],
      hint: "Keep the multiplication inside the function and return it, then let the console.log at the call site show the number. Use the two values you read from stdin as the arguments so the same file works for any rectangle.",
      explanation:
        "Returning a value makes the function usable in expressions, tests and other functions, while printing locks the result to one place. Parameters keep the calculation general, so the same function handles any rectangle instead of one fixed pair of numbers. That is exactly what the two runs check: the number printed has to come from the arguments, not from a constant baked into the file.",
    },
  },
  "js-dom": {
    objectives: [
      "Select elements with CSS selectors and guard against missing matches.",
      "Update text and state classes instead of writing inline styles.",
      "React to a click or form input with a listener that reads current values.",
    ],
    terms: [
      {
        term: "DOM",
        meaning:
          "The live tree of element objects that the browser builds from the HTML document.",
      },
      {
        term: "event listener",
        meaning:
          "A function registered for a named event and run whenever that event occurs on the element.",
      },
      {
        term: "bubbling",
        meaning:
          "The path an event follows from the target element up through its ancestors.",
      },
      {
        term: "node",
        meaning:
          "One object in the DOM tree, such as an element, a text run or the document itself.",
      },
    ],
    deepDive: {
      title: "Going deeper: a live tree with events flowing through it",
      body: "The DOM is not a snapshot you patch; it is a live structure the browser keeps in sync with the screen, so every change you make is visible on the next paint. That leads to a different mental model from editing text files: you rarely rebuild markup, you adjust the objects that already exist. Selecting is a lookup, changing is a property assignment, and creating is a two-step process of construction and attachment. Events travel too, and knowing the route prevents duplicate handlers. A click on a button first fires on the button, then on its parents in turn, up to the document. This is bubbling, and it enables delegation: attach one listener to a container, then inspect event.target to learn which child was clicked. Delegation keeps handlers working for elements you create later, which is why a list that grows never needs re-binding. When a handler only needs the current state, read it at click time rather than copying it when the page loads. Keep behaviour out of inline attributes, keep visual rules in CSS classes, and remove listeners when a component disappears so old closures cannot keep reacting.",
    },
    pitfall:
      "Beginners often create an element with document.createElement and expect it to appear, forgetting that a detached node is invisible until it is appended. The other common trap is calling the handler immediately by writing addEventListener('click', handleClick()), when the parentheses should be left off so the function is passed rather than called.",
    lab: {
      id: "js-dom-lab",
      title: "Toggle a note",
      brief:
        'Node has no document, so in dom.js you model the part of the DOM this lesson is about with a plain object. Build a note object with textContent starting as Todo, a classList held in a Set, an addEventListener("click", handler) method that remembers the handler, and a click() method that runs the remembered handler. The handler toggles a class named done and sets textContent to Done when the class is present, otherwise back to Todo. Read stdin as a list of click events, one per line, dispatch one click for each line, then print two lines: the final textContent, and then done when the class is present or not done when it is not. The file runs twice with a different number of clicks, so the state has to be updated by the handler instead of printed once.',
      file: "dom.js",
      starter:
        '// Read the click events from stdin, one per line.\nconst events = require("node:fs")\n  .readFileSync(0, "utf8")\n  .split("\\n")\n  .map((line) => line.trim())\n  .filter(Boolean);\n\n// TODO: build the note object described in the brief: textContent, a classList Set,\n// addEventListener("click", handler) and click().\n// Dispatch one click per line in events, then print the final textContent\n// and then done or not done on the next line.',
      tests: [
        {
          label: "One click",
          stdin: "click\n",
          expectedStdout: "Done\ndone",
        },
        {
          label: "Four clicks",
          stdin: "click\nclick\nclick\nclick\n",
          expectedStdout: "Todo\nnot done",
        },
      ],
      hint: "The listener needs a function as its second argument and is stored for later, so click() decides when it runs. The element you created can be reused inside that function, which is what lets each click flip the same state back and forth.",
      explanation:
        "A listener is registered once and runs on each click, so the same handler can flip the class back and forth. Keeping the visual change in a class means CSS owns the appearance, while the JavaScript only decides which state the element is in. Toggling rather than adding explains why an even number of clicks ends where the note started, and why the program prints a different result for each run.",
    },
  },
  "js-async": {
    objectives: [
      "Explain promise states and attach success and failure handlers.",
      "Rewrite a promise chain as an async function with try/catch.",
      "Read JSON responses and run independent requests with Promise.all.",
    ],
    terms: [
      {
        term: "promise",
        meaning:
          "An object that represents a value which arrives later as either a success or a failure.",
      },
      {
        term: "event loop",
        meaning:
          "The browser mechanism that runs queued callbacks once the current synchronous work finishes.",
      },
      {
        term: "microtask",
        meaning:
          "A short queued job, such as a promise callback, that runs before timers and rendering.",
      },
      {
        term: "rejection",
        meaning:
          "The failed settlement of a promise, carrying a reason that catch or try/catch receives.",
      },
    ],
    deepDive: {
      title: "Going deeper: waiting without blocking",
      body: "JavaScript has one call stack, so long work would freeze the page if it were truly waited on. Instead, slow operations are handed to the browser and their completion is scheduled as a callback. The event loop runs whatever is on the stack to completion, then drains queued work. Promises that settle queue microtasks, which run before timers, which is why a then callback consistently beats a setTimeout of zero milliseconds. That ordering turns mysterious output into a predictable sequence. await is sugar over this machinery: it suspends the async function and resumes it as a microtask when the awaited promise settles, while the rest of the program keeps running. Errors travel the same route as values. A rejection skips every then until it meets a catch or a surrounding try/catch, so recovery belongs where you can actually handle it. Two independent requests are not made faster by awaiting them one after another; start both, keep the promises, then await together with Promise.all. And since fetch treats HTTP error codes as successful responses, check response.ok before trusting the body.",
    },
    pitfall:
      "A very common mistake is awaiting fetch and then forgetting that response.json() is also asynchronous, so the parsed data is never awaited and the code logs a promise. Another is assuming fetch rejects on a 404, when it resolves, so response.ok must be checked. A try/catch also cannot help with a rejected promise that was never awaited.",
    lab: {
      id: "js-async-lab",
      title: "Load a user safely",
      brief:
        'In async.js the starter already provides fetchUser, a promise-based stand-in for fetch that resolves with a response whose json() method returns another promise, and rejects with Error("unknown user") for a url it does not know. Read a url from stdin, then write an async function named loadUser that awaits fetchUser(url), awaits the parsed body, and prints the name field. Wrap the work in try/catch so a failure prints Could not load user: followed by the error message, for example Could not load user: unknown user. Call loadUser(url) at the end. The file runs twice, once with a known url and once with an unknown one, and both outputs are compared exactly.',
      file: "async.js",
      starter:
        '// A stand-in for fetch so this lab runs without a network.\nconst users = {\n  "/api/ada": { name: "Ada" },\n  "/api/grace": { name: "Grace" },\n};\n\nfunction fetchUser(url) {\n  return new Promise((resolve, reject) => {\n    setTimeout(() => {\n      if (users[url]) {\n        resolve({ ok: true, json: () => Promise.resolve(users[url]) });\n      } else {\n        reject(new Error("unknown user"));\n      }\n    }, 0);\n  });\n}\n\n// Read the url from stdin (one line).\nconst url = require("node:fs").readFileSync(0, "utf8").trim();\n\n// TODO: write an async function loadUser(url) that awaits fetchUser(url),\n// reads the body with await response.json() and prints the name field.\n// Wrap the work in try/catch so a failure prints Could not load user: <message>.\n// Then call loadUser(url).',
      tests: [
        {
          label: "Known user",
          stdin: "/api/ada\n",
          expectedStdout: "Ada",
        },
        {
          label: "Unknown user",
          stdin: "/api/nobody\n",
          expectedStdout: "Could not load user: unknown user",
        },
      ],
      hint: "Every promise needs its own await, so the response and the parsed body are two separate waits. Put both lines inside the try block, because a rejection skips straight to catch, and log the message from the error object.",
      explanation:
        "await unwraps one promise at a time, so the response and the parsed body are two separate waits. A try/catch around both turns a rejected request or a malformed body into a handled message, which keeps the rest of the program working instead of leaving an unhandled rejection. The second run rejects on purpose, which is why only a real try/catch can produce the expected line.",
    },
  },
};

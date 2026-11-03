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
        "In basics.js, declare a function named greet that accepts one parameter, a name. It must return a welcome sentence that includes that name rather than printing it. Then call greet with a name and print the returned value with console.log. The check inspects the structure of your code only.",
      file: "basics.js",
      starter:
        '// TODO: write greet(name) that returns a welcome sentence.\n// Then print the result of calling it with console.log.\nconst name = "Ada";',
      checks: [
        {
          label: "Declares a function named greet",
          test: (code) =>
            /function\s+greet\s*\(|(?:const|let|var)\s+greet\s*=\s*(?:function\s*)?\(?\s*[A-Za-z_$]/.test(
              code,
            ),
        },
        {
          label: "Accepts a name parameter",
          test: (code) =>
            /function\s+greet\s*\(\s*[A-Za-z_$][\w$]*\s*\)|(?:const|let|var)\s+greet\s*=\s*(?:function\s*)?\(?\s*[A-Za-z_$][\w$]*\s*\)?\s*(?:=>|\{)/.test(
              code,
            ),
        },
        {
          label: "Returns a string greeting",
          test: (code) => /return\s+[`"']/.test(code),
        },
        {
          label: "Calls greet inside console.log",
          test: (code) => /console\.log\s*\(\s*greet\s*\(/.test(code),
        },
      ],
      hint: "Return the sentence from the function, then wrap the call in console.log so the value becomes visible.",
      explanation:
        "A function that returns text can be reused in many places, while console.log is only about showing a value once. Building the sentence with a template literal keeps the name inside a readable phrase, and calling the function inside console.log both runs it and displays the result.",
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
        "In control.js, loop from 1 to 10 and build one string that contains only the even numbers, separated by spaces. Use a condition inside the loop to decide what to add to the result. Print the finished string with console.log once the loop has ended. The check reads structure, not output.",
      file: "control.js",
      starter:
        '// TODO: loop from 1 to 10, keep the even numbers and build one result string.\n// Then print the finished string with console.log.\nlet result = "";',
      checks: [
        {
          label: "Uses a for or while loop",
          test: (code) => /\bfor\s*\(|\bwhile\s*\(/.test(code),
        },
        {
          label: "Checks a condition inside the loop",
          test: (code) => /if\s*\(/.test(code),
        },
        {
          label: "Builds the result with +=",
          test: (code) => /\w+\s*\+=/.test(code),
        },
        {
          label: "Prints the result with console.log",
          test: (code) => /console\.log\s*\(/.test(code),
        },
      ],
      hint: "Decide the numbers with the remainder operator, and remember that the result string has to exist before the loop starts.",
      explanation:
        "An accumulator declared before the loop keeps every accepted value in one place, so the result is complete when the loop ends. Checking the remainder with the modulus operator separates even numbers from odd ones without hard-coding a list, and printing after the loop shows the whole result rather than each step.",
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
        "In functions.js, write a function named area that takes two parameters, width and height, and returns their product. Call it with two numbers and print the returned value with console.log. The function itself must return the result rather than printing it. The check inspects structure only.",
      file: "functions.js",
      starter:
        '// TODO: write a function named area that takes width and height and returns their product.\n// Then call area with two numbers and print the result with console.log.\nconst unit = "cm";',
      checks: [
        {
          label: "Declares a function named area",
          test: (code) =>
            /function\s+area\s*\(|(?:const|let|var)\s+area\s*=\s*(?:function\s*)?\(/.test(
              code,
            ),
        },
        {
          label: "Takes two parameters",
          test: (code) =>
            /function\s+area\s*\(\s*[A-Za-z_$][\w$]*\s*,\s*[A-Za-z_$][\w$]*\s*\)|area\s*=\s*(?:function\s*)?\(?\s*[A-Za-z_$][\w$]*\s*,\s*[A-Za-z_$][\w$]*/.test(
              code,
            ),
        },
        {
          label: "Returns the product of the parameters",
          test: (code) =>
            /return\s+[A-Za-z_$][\w$]*\s*\*\s*[A-Za-z_$][\w$]*/.test(code),
        },
        {
          label: "Calls area with two numbers",
          test: (code) => /\barea\s*\(\s*\d+\s*,\s*\d+\s*\)/.test(code),
        },
        {
          label: "Logs the returned value",
          test: (code) => /console\.log\s*\(/.test(code),
        },
      ],
      hint: "Keep the multiplication inside the function and return it, then let the console.log at the call site show the number.",
      explanation:
        "Returning a value makes the function usable in expressions, tests and other functions, while printing locks the result to one place. Parameters keep the calculation general, so the same function handles any rectangle instead of one fixed pair of numbers.",
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
        "In dom.js, select the element with the id note and add a click listener to it. Inside the listener, toggle a class named done on that same element, or update its textContent when it is clicked. The check inspects structure only, so no browser is needed.",
      file: "dom.js",
      starter:
        '// TODO: select the element with id "note".\n// Add a click listener that toggles the "done" class on it.\nconst note = document.querySelector("#note");',
      checks: [
        {
          label: "Selects an element from the document",
          test: (code) =>
            /document\.(?:querySelector|querySelectorAll|getElementById)\s*\(/.test(
              code,
            ),
        },
        {
          label: "Uses addEventListener",
          test: (code) => /addEventListener\s*\(\s*["']click["']/.test(code),
        },
        {
          label: "Passes a function or arrow callback",
          test: (code) => /=>|function\s*\(/.test(code),
        },
        {
          label: "Toggles a class or updates text",
          test: (code) =>
            /classList\.(?:toggle|add|remove)\s*\(|textContent\s*=/.test(code),
        },
      ],
      hint: "The listener needs a function as its second argument, and the element you selected can be reused inside that function.",
      explanation:
        "A listener is registered once and runs on each click, so the same handler can flip the class back and forth. Keeping the visual change in a class means CSS owns the appearance, while the JavaScript only decides which state the element is in.",
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
        "In async.js, write an async function named loadUser that awaits fetch for the given url, parses the response with json and prints the name field. Wrap the work in try/catch so a failure logs a message instead of crashing. Call loadUser at the end of the file. The check reads structure only.",
      file: "async.js",
      starter:
        '// TODO: write an async function called loadUser that awaits fetch, parses JSON and logs the name.\n// Wrap the work in try/catch so a failure is handled.\nconst url = "/api/user";',
      checks: [
        {
          label: "Declares an async function",
          test: (code) =>
            /async\s+function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*async\s*\(/.test(
              code,
            ),
        },
        {
          label: "Waits for a promise with await",
          test: (code) => /\bawait\s+/.test(code),
        },
        {
          label: "Handles errors with try and catch",
          test: (code) => /try\s*\{[\s\S]*catch\s*\(/.test(code),
        },
        {
          label: "Parses the body with json()",
          test: (code) => /\.json\s*\(\s*\)/.test(code),
        },
        {
          label: "Calls loadUser at the top level",
          test: (code) => /\n\s*loadUser\s*\(\s*\)\s*;/.test(code),
        },
      ],
      hint: "Every promise needs its own await, and the error-prone lines belong inside the try block so the catch can see their failures.",
      explanation:
        "await unwraps one promise at a time, so the response and the parsed body are two separate waits. A try/catch around both turns a network failure or a malformed body into a handled message, which keeps the rest of the page working instead of leaving an unhandled rejection.",
    },
  },
};

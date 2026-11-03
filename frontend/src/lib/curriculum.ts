import { lessonPassed, uniqueCorrect } from "./progress.mjs";

export const PASS_MARK = 5;

export type TheoryBlock = {
  title: string;
  body: string;
  code?: string;
};

export type Task = {
  prompt: string;
  code?: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type Lesson = {
  id: string;
  title: string;
  summary: string;
  theory: TheoryBlock[];
  tasks: Task[];
};

export type Language = {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  lessons: Lesson[];
};

export const languages: Language[] = [
  {
    id: "python",
    name: "Python",
    badge: "PY",
    tagline: "Readable code, fast ideas.",
    description: "Start with values and loops, then shape data with functions.",
    lessons: [
      {
        id: "py-basics",
        title: "Values & output",
        summary: "Print text, store values and format strings.",
        theory: [
          {
            title: "Printing text",
            body: "print() writes a line to the console. Text goes inside quotes, and comments begin with a hash sign.",
            code: 'print("Hello, world!")\n# This is a comment',
          },
          {
            title: "Variables and types",
            body: "A variable is a name for a value. The common types are int, float, str and bool, and Python works out the type for you.",
            code: 'age = 16\nprice = 4.5\nname = "Ada"\nready = True',
          },
          {
            title: "F-strings",
            body: "Put an f before a string and wrap an expression in braces to insert its value.",
            code: 'name = "Ada"\nprint(f"Hello, {name}!")',
          },
        ],
        tasks: [
          {
            prompt: "What does this code print?",
            code: 'print("Hello, Python!")',
            options: ["Hello, Python!", "print", "Hello Python", "Nothing"],
            answer: 0,
            explanation:
              "The string inside print() is written exactly as it appears.",
          },
          {
            prompt: "Which type does this value have?",
            code: "value = 42",
            options: ["str", "int", "bool", "float"],
            answer: 1,
            explanation: "42 is a whole number, so Python stores it as an int.",
          },
          {
            prompt: "What is the output?",
            code: 'name = "Ada"\nprint("Hi, " + name)',
            options: ["Hi, name", "Hi, Ada", "Ada", "Error"],
            answer: 1,
            explanation: "The + operator joins the two strings into Hi, Ada.",
          },
          {
            prompt: "What number is printed?",
            code: "print(2 + 3 * 4)",
            options: ["20", "14", "24", "9"],
            answer: 1,
            explanation:
              "Multiplication happens first: 3 * 4 = 12, then 2 + 12 = 14.",
          },
          {
            prompt: "What is the output?",
            code: 'age = 12\nprint(f"Age: {age}")',
            options: ["Age: {age}", "Age: 12", "12", "Error"],
            answer: 1,
            explanation: "The braces are replaced by the value of age.",
          },
          {
            prompt: "Which is a valid variable name?",
            options: ["2player", "user-name", "user_name", "class"],
            answer: 2,
            explanation:
              "Names cannot start with a digit or contain a hyphen, and class is a keyword.",
          },
          {
            prompt: "What is printed?",
            code: "print(10 // 3)",
            options: ["3.33", "3", "4", "1"],
            answer: 1,
            explanation:
              "// is floor division, so 10 // 3 keeps the whole-number part, 3.",
          },
          {
            prompt: "What is the output?",
            code: 'print("5" + "2")',
            options: ["7", "52", "5 2", "Error"],
            answer: 1,
            explanation: "Both values are strings, so + joins them into 52.",
          },
          {
            prompt: "What is the final value printed?",
            code: "x = 3\nx += 2\nprint(x)",
            options: ["3", "2", "5", "32"],
            answer: 2,
            explanation: "x += 2 adds 2 to 3, so x becomes 5.",
          },
          {
            prompt: "What does len return?",
            code: 'print(len("code"))',
            options: ["3", "4", "5", "Error"],
            answer: 1,
            explanation: "The string code has four characters.",
          },
        ],
      },
      {
        id: "py-control",
        title: "Decisions & loops",
        summary: "Branch with if, repeat with for and while.",
        theory: [
          {
            title: "if / elif / else",
            body: "A condition decides which block runs. Indentation defines the block, so every line inside it must line up.",
            code: 'score = 70\nif score >= 90:\n    print("A")\nelif score >= 60:\n    print("B")\nelse:\n    print("C")',
          },
          {
            title: "for loops",
            body: "for visits each item in a sequence. range(3) produces 0, 1 and 2.",
            code: "for n in range(3):\n    print(n)",
          },
          {
            title: "while and break",
            body: "while repeats as long as its condition is true. break leaves the loop immediately.",
            code: "count = 0\nwhile count < 3:\n    count += 1\n    if count == 2:\n        break",
          },
        ],
        tasks: [
          {
            prompt: "What is printed?",
            code: 'if 5 > 3:\n    print("yes")',
            options: ["yes", "no", "5", "Nothing"],
            answer: 0,
            explanation: "5 > 3 is true, so the indented block runs.",
          },
          {
            prompt: "What letter is printed?",
            code: 'score = 70\nif score >= 90:\n    print("A")\nelif score >= 60:\n    print("B")\nelse:\n    print("C")',
            options: ["A", "B", "C", "Nothing"],
            answer: 1,
            explanation:
              "70 is below 90 but at least 60, so the elif branch prints B.",
          },
          {
            prompt: "What is printed?",
            code: "for n in range(3):\n    print(n)",
            options: ["1 2 3", "0 1 2", "0 1 2 3", "3"],
            answer: 1,
            explanation: "range(3) starts at 0 and stops before 3.",
          },
          {
            prompt: "What is the last number printed?",
            code: "for n in range(1, 5):\n    print(n)",
            options: ["1", "4", "5", "3"],
            answer: 1,
            explanation:
              "The end value 5 is excluded, so the sequence is 1, 2, 3, 4.",
          },
          {
            prompt: "What is the total?",
            code: "total = 0\nfor n in [1, 2, 3]:\n    total += n\nprint(total)",
            options: ["3", "5", "6", "123"],
            answer: 2,
            explanation: "The loop adds 1 + 2 + 3, which is 6.",
          },
          {
            prompt: "What is printed?",
            code: "x = 0\nwhile x < 2:\n    x += 1\nprint(x)",
            options: ["0", "1", "2", "3"],
            answer: 2,
            explanation:
              "x rises to 1, then 2. The condition then fails and the loop stops.",
          },
          {
            prompt: "Which numbers are printed?",
            code: "for i in range(5):\n    if i == 2:\n        break\n    print(i)",
            options: ["0 1 2", "0 1", "2", "Nothing"],
            answer: 1,
            explanation:
              "The loop prints 0 and 1, then breaks before printing 2.",
          },
          {
            prompt: "What is printed?",
            code: 'print("even" if 8 % 2 == 0 else "odd")',
            options: ["even", "odd", "8", "True"],
            answer: 0,
            explanation:
              "8 % 2 is 0, so the condition is true and even is chosen.",
          },
          {
            prompt: "What is printed?",
            code: 'count = 0\nfor letter in "loop":\n    count += 1\nprint(count)',
            options: ["0", "3", "4", "5"],
            answer: 2,
            explanation: "The string loop contains four characters.",
          },
          {
            prompt: "Which numbers are printed?",
            code: "for i in range(2, 7, 2):\n    print(i)",
            options: ["2 4 6", "2 3 4 5 6", "2 4", "3 5 7"],
            answer: 0,
            explanation: "The loop starts at 2, stops before 7 and steps by 2.",
          },
        ],
      },
      {
        id: "py-functions",
        title: "Functions & collections",
        summary: "Reuse logic and store groups of values.",
        theory: [
          {
            title: "Defining functions",
            body: "def creates a function. Parameters receive values, and return sends a result back to the caller.",
            code: "def double(n):\n    return n * 2\n\nprint(double(4))",
          },
          {
            title: "Lists",
            body: "A list keeps values in order. Indices start at 0, and append adds an item to the end.",
            code: 'skills = ["HTML", "CSS"]\nskills.append("Python")\nprint(skills[0])',
          },
          {
            title: "Dictionaries",
            body: "A dictionary stores key-value pairs. Look up a value with its key instead of a position.",
            code: 'user = {"name": "Ada", "level": 1}\nprint(user["name"])',
          },
        ],
        tasks: [
          {
            prompt: "What is printed?",
            code: 'def greet():\n    print("Hi")\n\ngreet()',
            options: ["Hi", "greet", "Nothing", "Error"],
            answer: 0,
            explanation: "Calling greet() runs the body and prints Hi.",
          },
          {
            prompt: "What is printed?",
            code: "def double(n):\n    return n * 2\n\nprint(double(4))",
            options: ["4", "6", "8", "44"],
            answer: 2,
            explanation: "n receives 4 and the function returns 4 * 2 = 8.",
          },
          {
            prompt:
              "What does a function return when it has no return statement?",
            options: ["0", "None", "null", "An error"],
            answer: 1,
            explanation: "Python functions return None by default.",
          },
          {
            prompt: "What is printed?",
            code: "print([10, 20, 30][1])",
            options: ["10", "20", "30", "1"],
            answer: 1,
            explanation: "Index 0 is 10 and index 1 is 20.",
          },
          {
            prompt: "What is printed?",
            code: "print(len([1, 2, 3]))",
            options: ["2", "3", "4", "6"],
            answer: 1,
            explanation: "len counts the three items in the list.",
          },
          {
            prompt: "What is printed?",
            code: "nums = [1, 2]\nnums.append(3)\nprint(nums)",
            options: ["[1, 2]", "[3]", "[1, 2, 3]", "[1, 3]"],
            answer: 2,
            explanation: "append adds 3 to the end of the list.",
          },
          {
            prompt: "What is printed?",
            code: 'data = {"a": 1, "b": 2}\nprint(data["b"])',
            options: ["a", "1", "2", "Error"],
            answer: 2,
            explanation: "The key b maps to the value 2.",
          },
          {
            prompt: "What is printed?",
            code: "def add(a, b=2):\n    return a + b\n\nprint(add(3))",
            options: ["3", "5", "6", "Error"],
            answer: 1,
            explanation:
              "b uses its default value 2, so the result is 3 + 2 = 5.",
          },
          {
            prompt: "What does this comprehension produce?",
            code: "print([n * n for n in [1, 2, 3]])",
            options: ["[1, 2, 3]", "[1, 4, 9]", "[2, 4, 6]", "[1, 4, 6]"],
            answer: 1,
            explanation: "Each number is squared: 1, 4 and 9.",
          },
          {
            prompt: "What is printed?",
            code: 'print("a" in {"a": 1, "b": 2})',
            options: ["True", "False", "1", "Error"],
            answer: 0,
            explanation:
              "The in operator checks dictionary keys, and a is present.",
          },
        ],
      },
    ],
  },
  {
    id: "javascript",
    name: "JavaScript",
    badge: "JS",
    tagline: "The language of the web.",
    description: "Build a foundation from values to functions and arrays.",
    lessons: [
      {
        id: "js-basics",
        title: "Values & variables",
        summary: "Work with let, const, types and template strings.",
        theory: [
          {
            title: "Variables",
            body: "let creates a value you can change later. const creates a binding that cannot be reassigned.",
            code: 'const name = "Ada";\nlet level = 1;\nlevel = level + 1;\nconsole.log(level);',
          },
          {
            title: "Types",
            body: "JavaScript has strings, numbers, booleans and more. The typeof operator tells you which type a value has.",
            code: 'console.log(typeof "code");\nconsole.log(typeof 42);',
          },
          {
            title: "Template literals",
            body: "Backticks create a template literal. Put an expression inside ${...} to insert its value.",
            code: 'const name = "Ada";\nconsole.log(`Hi, ${name}!`);',
          },
        ],
        tasks: [
          {
            prompt: "What is printed?",
            code: 'console.log("Hi");',
            options: ["Hi", "console.log", "Hi()", "Nothing"],
            answer: 0,
            explanation: "The string passed to console.log is printed as Hi.",
          },
          {
            prompt: "What is printed?",
            code: "const x = 4;\nconsole.log(x + 1);",
            options: ["4", "5", "x + 1", "Error"],
            answer: 1,
            explanation: "x holds 4, so 4 + 1 is 5.",
          },
          {
            prompt: "What does typeof return?",
            code: 'console.log(typeof "code");',
            options: ["number", "string", "text", "code"],
            answer: 1,
            explanation: "Text between quotes is a string.",
          },
          {
            prompt: "What is printed?",
            code: 'console.log(2 + "2");',
            options: ["4", "22", "2 2", "NaN"],
            answer: 1,
            explanation:
              "When one side is a string, + joins the values as text: 22.",
          },
          {
            prompt: "What is the final value?",
            code: "let n = 1;\nn += 2;\nconsole.log(n);",
            options: ["1", "2", "3", "12"],
            answer: 2,
            explanation: "n += 2 adds 2 to 1, so n becomes 3.",
          },
          {
            prompt: "What is printed?",
            code: 'const name = "Ada";\nconsole.log(`Hi ${name}`);',
            options: ["Hi Ada", "Hi ${name}", "Hi name", "Error"],
            answer: 0,
            explanation: "The template literal inserts the value of name.",
          },
          {
            prompt:
              "Which keyword creates a binding that cannot be reassigned?",
            options: ["let", "var", "const", "function"],
            answer: 2,
            explanation: "const prevents reassignment of the binding.",
          },
          {
            prompt: "What is printed?",
            code: "console.log(10 % 3);",
            options: ["0", "1", "3", "3.33"],
            answer: 1,
            explanation: "% returns the remainder. 10 divided by 3 leaves 1.",
          },
          {
            prompt: "What is printed?",
            code: 'console.log(3 === "3");',
            options: ["true", "false", "3", "Error"],
            answer: 1,
            explanation:
              "=== compares both value and type, and a number is not a string.",
          },
          {
            prompt: "What is printed?",
            code: "let a = 2;\nlet b = a;\nb = 5;\nconsole.log(a);",
            options: ["2", "5", "7", "undefined"],
            answer: 0,
            explanation:
              "b receives a copy of the value. Changing b does not change a.",
          },
        ],
      },
      {
        id: "js-control",
        title: "Logic & loops",
        summary: "Make choices and repeat work with confidence.",
        theory: [
          {
            title: "Conditions",
            body: "if runs a block when its condition is true. else handles every other case, and the ternary operator picks between two values.",
            code: 'const score = 70;\nif (score >= 60) {\n  console.log("Pass");\n} else {\n  console.log("Retry");\n}',
          },
          {
            title: "Loops",
            body: "A for loop repeats with a counter. for...of visits each value in an array directly.",
            code: "for (let i = 0; i < 3; i++) {\n  console.log(i);\n}\nfor (const n of [4, 5]) {\n  console.log(n);\n}",
          },
          {
            title: "Stopping early",
            body: "break leaves a loop immediately. continue skips the rest of the current round.",
            code: "for (let i = 0; i < 5; i++) {\n  if (i === 2) break;\n  console.log(i);\n}",
          },
        ],
        tasks: [
          {
            prompt: "What is printed?",
            code: 'if (2 > 1) console.log("yes");',
            options: ["yes", "no", "2", "Nothing"],
            answer: 0,
            explanation: "2 > 1 is true, so the message is printed.",
          },
          {
            prompt: "What is printed?",
            code: 'console.log(5 > 3 ? "big" : "small");',
            options: ["big", "small", "true", "5"],
            answer: 0,
            explanation: "The condition is true, so the ternary returns big.",
          },
          {
            prompt: "Which numbers are printed?",
            code: "for (let i = 0; i < 3; i++) {\n  console.log(i);\n}",
            options: ["1 2 3", "0 1 2", "0 1 2 3", "3"],
            answer: 1,
            explanation: "The counter starts at 0 and stops before 3.",
          },
          {
            prompt: "What is printed?",
            code: "for (const n of [4, 5]) {\n  console.log(n);\n}",
            options: ["0 1", "4 5", "45", "2"],
            answer: 1,
            explanation: "for...of visits each array value in order.",
          },
          {
            prompt: "What is the total?",
            code: "let total = 0;\nfor (const n of [1, 2, 3]) {\n  total += n;\n}\nconsole.log(total);",
            options: ["3", "5", "6", "123"],
            answer: 2,
            explanation: "The loop adds 1, 2 and 3 for a total of 6.",
          },
          {
            prompt: "What is printed?",
            code: "let x = 0;\nwhile (x < 2) {\n  x++;\n}\nconsole.log(x);",
            options: ["0", "1", "2", "3"],
            answer: 2,
            explanation: "x increases to 2, then the condition becomes false.",
          },
          {
            prompt: "Which numbers are printed?",
            code: "for (let i = 0; i < 5; i++) {\n  if (i === 2) break;\n  console.log(i);\n}",
            options: ["0 1 2", "0 1", "2", "Nothing"],
            answer: 1,
            explanation: "The loop prints 0 and 1 before breaking at 2.",
          },
          {
            prompt: "What is printed?",
            code: "console.log(!true);",
            options: ["true", "false", "1", "undefined"],
            answer: 1,
            explanation: "! negates a boolean, so true becomes false.",
          },
          {
            prompt: "What is printed?",
            code: "let x = 0;\nx++;\nconsole.log(x);",
            options: ["0", "1", "2", "undefined"],
            answer: 1,
            explanation: "x++ adds one, so x becomes 1.",
          },
          {
            prompt: "What is printed?",
            code: 'const n = 2;\nswitch (n) {\n  case 1:\n    console.log("one");\n    break;\n  case 2:\n    console.log("two");\n    break;\n  default:\n    console.log("other");\n}',
            options: ["one", "two", "other", "Nothing"],
            answer: 1,
            explanation: "n is 2, so the matching case prints two.",
          },
        ],
      },
      {
        id: "js-functions",
        title: "Functions & data",
        summary: "Return values and transform arrays and objects.",
        theory: [
          {
            title: "Functions",
            body: "A function receives parameters and can return a result. Arrow functions are a shorter way to write the same idea.",
            code: "function double(n) {\n  return n * 2;\n}\nconst square = (n) => n * n;",
          },
          {
            title: "Arrays",
            body: "Arrays keep values in order. push adds to the end, and length counts the items.",
            code: 'const skills = ["HTML", "CSS"];\nskills.push("JS");\nconsole.log(skills[0]);',
          },
          {
            title: "Objects and methods",
            body: "Objects group named values. map, filter and reduce transform arrays without changing the original.",
            code: 'const user = { name: "Ada", level: 1 };\nconsole.log(user.name);\nconsole.log([1, 2, 3].map((n) => n * 2));',
          },
        ],
        tasks: [
          {
            prompt: "What is printed?",
            code: 'function greet() {\n  console.log("Hi");\n}\ngreet();',
            options: ["Hi", "greet", "Nothing", "Error"],
            answer: 0,
            explanation: "Calling greet() runs the body and prints Hi.",
          },
          {
            prompt: "What is printed?",
            code: "function double(n) {\n  return n * 2;\n}\nconsole.log(double(4));",
            options: ["4", "6", "8", "44"],
            answer: 2,
            explanation: "double receives 4 and returns 8.",
          },
          {
            prompt: "What is printed?",
            code: "const square = (n) => n * n;\nconsole.log(square(3));",
            options: ["3", "6", "9", "undefined"],
            answer: 2,
            explanation: "The arrow function returns 3 * 3 = 9.",
          },
          {
            prompt: "What is printed?",
            code: "console.log([10, 20][1]);",
            options: ["10", "20", "1", "undefined"],
            answer: 1,
            explanation: "Array indices start at 0, so index 1 is 20.",
          },
          {
            prompt: "What is printed?",
            code: "console.log([1, 2].length);",
            options: ["1", "2", "3", "undefined"],
            answer: 1,
            explanation: "The array contains two items.",
          },
          {
            prompt: "What is printed?",
            code: "const items = [1, 2];\nitems.push(3);\nconsole.log(items);",
            options: ["[1, 2]", "[3]", "[1, 2, 3]", "[1, 3]"],
            answer: 2,
            explanation: "push adds 3 to the end of the array.",
          },
          {
            prompt: "What is printed?",
            code: 'const user = { name: "Ada" };\nconsole.log(user.name);',
            options: ["user", "Ada", "name", "undefined"],
            answer: 1,
            explanation: "Dot notation reads the name property.",
          },
          {
            prompt: "What is printed?",
            code: "console.log([1, 2, 3].map((n) => n * 2));",
            options: ["[1, 2, 3]", "[2, 4, 6]", "[1, 4, 9]", "[2, 3, 4]"],
            answer: 1,
            explanation: "map returns a new array where every item is doubled.",
          },
          {
            prompt: "What is printed?",
            code: "console.log([1, 2, 3, 4].filter((n) => n % 2 === 0));",
            options: ["[1, 3]", "[2, 4]", "[1, 2, 3, 4]", "[4]"],
            answer: 1,
            explanation: "filter keeps the even numbers, 2 and 4.",
          },
          {
            prompt: "What is printed?",
            code: "console.log([1, 2, 3].reduce((a, b) => a + b, 0));",
            options: ["3", "6", "[1, 2, 3]", "0"],
            answer: 1,
            explanation: "reduce adds the running total: 0 + 1 + 2 + 3 = 6.",
          },
        ],
      },
    ],
  },
  {
    id: "html",
    name: "HTML",
    badge: "HT",
    tagline: "Give content a clear structure.",
    description: "Learn elements, semantic layout and accessible forms.",
    lessons: [
      {
        id: "html-basics",
        title: "Elements & attributes",
        summary: "Build pages with headings, links and images.",
        theory: [
          {
            title: "Elements and tags",
            body: "HTML describes structure with elements. Most elements have an opening tag, content and a closing tag.",
            code: "<p>Hello, world!</p>",
          },
          {
            title: "Attributes",
            body: "Attributes add information inside the opening tag. Attribute values usually go inside quotes.",
            code: '<a href="https://example.com">Visit</a>',
          },
          {
            title: "Page structure",
            body: "Headings run from h1 to h6. Use one h1 for the main page title and keep heading levels in order.",
            code: "<h1>My page</h1>\n<p>Welcome to my corner of the web.</p>",
          },
        ],
        tasks: [
          {
            prompt: "Which element creates the largest heading?",
            options: ["<h6>", "<h1>", "<head>", "<title>"],
            answer: 1,
            explanation: "h1 is the highest-level heading.",
          },
          {
            prompt: "Which element creates a paragraph?",
            options: ["<p>", "<par>", "<text>", "<pg>"],
            answer: 0,
            explanation: "The p element represents a paragraph.",
          },
          {
            prompt: "Which link points to example.com?",
            options: [
              '<a src="https://example.com">Visit</a>',
              '<a href="https://example.com">Visit</a>',
              '<link href="https://example.com">Visit</link>',
              "<a>https://example.com</a>",
            ],
            answer: 1,
            explanation: "The a element uses href for the destination.",
          },
          {
            prompt: "Which attribute describes an image for screen readers?",
            options: ["title", "src", "alt", "caption"],
            answer: 2,
            explanation: "alt provides a text alternative for the image.",
          },
          {
            prompt: "Which element inserts a line break?",
            options: ["<lb>", "<break>", "<br>", "<newline>"],
            answer: 2,
            explanation: "br creates a line break inside text.",
          },
          {
            prompt: "Which pair creates a bulleted list?",
            options: [
              "<ol> and <li>",
              "<ul> and <li>",
              "<list> and <item>",
              "<dl> and <dt>",
            ],
            answer: 1,
            explanation: "ul is an unordered list and li is a list item.",
          },
          {
            prompt: "Which is correct attribute syntax?",
            options: [
              'class="card"',
              "class=card",
              "class: card",
              "class(card)",
            ],
            answer: 0,
            explanation:
              "Attribute names are followed by an equals sign and a quoted value.",
          },
          {
            prompt: "Which is a valid HTML comment?",
            options: ["// note", "/* note */", "<!-- note -->", "# note"],
            answer: 2,
            explanation: "HTML comments use the <!-- ... --> syntax.",
          },
          {
            prompt: "Which element sets the browser tab title?",
            options: ["<h1>", "<meta>", "<title>", "<header>"],
            answer: 2,
            explanation:
              "The title element belongs in head and names the page.",
          },
          {
            prompt: "Which nesting is valid?",
            options: [
              "<p><strong>Hi</strong></p>",
              "<p><strong>Hi</p></strong>",
              "<strong><p>Hi</strong></p>",
              "<p><div>Hi</p></div>",
            ],
            answer: 0,
            explanation:
              "The inner element must close before its parent closes.",
          },
        ],
      },
      {
        id: "html-semantics",
        title: "Semantic layout",
        summary: "Name page regions so people and tools understand them.",
        theory: [
          {
            title: "Landmarks",
            body: "header, nav, main and footer describe the major regions of a page. They help assistive technology jump between areas.",
            code: "<header>...</header>\n<nav>...</nav>\n<main>...</main>\n<footer>...</footer>",
          },
          {
            title: "Articles and sections",
            body: "An article stands on its own, such as a post or card. A section groups related content and should normally have a heading.",
            code: "<section>\n  <h2>Latest lessons</h2>\n  <article>...</article>\n</section>",
          },
          {
            title: "Why semantics matter",
            body: "A div has no meaning. Semantic elements communicate purpose to browsers, search engines and screen readers.",
            code: "<main>\n  <h1>World of Codes</h1>\n</main>",
          },
        ],
        tasks: [
          {
            prompt:
              "Which element is best for the top introduction and branding of a page?",
            options: ["<header>", "<top>", "<intro>", "<section>"],
            answer: 0,
            explanation:
              "header represents introductory content for a page or section.",
          },
          {
            prompt: "Which element groups navigation links?",
            options: ["<menu>", "<nav>", "<links>", "<aside>"],
            answer: 1,
            explanation: "nav is the semantic element for navigation.",
          },
          {
            prompt:
              "Which element should wrap the unique main content of a page?",
            options: ["<body>", "<content>", "<main>", "<div>"],
            answer: 2,
            explanation: "main identifies the primary content of the document.",
          },
          {
            prompt: "Which element fits a self-contained blog post?",
            options: ["<section>", "<article>", "<aside>", "<div>"],
            answer: 1,
            explanation: "article is for content that makes sense on its own.",
          },
          {
            prompt:
              "Which element is best for copyright and contact information at the bottom?",
            options: ["<bottom>", "<footer>", "<end>", "<main>"],
            answer: 1,
            explanation:
              "footer contains closing information for a page or section.",
          },
          {
            prompt:
              "Which element fits related side content such as a tip box?",
            options: ["<aside>", "<side>", "<extra>", "<nav>"],
            answer: 0,
            explanation:
              "aside is for content related to but separate from the main flow.",
          },
          {
            prompt: "What should a section normally include?",
            options: ["A heading", "An image", "A link", "A form"],
            answer: 0,
            explanation: "A heading gives the section a topic and structure.",
          },
          {
            prompt: "What does a div communicate?",
            options: [
              "It is a navigation area",
              "It has no inherent meaning",
              "It is the main content",
              "It is a self-contained article",
            ],
            answer: 1,
            explanation: "div is a generic container with no semantic meaning.",
          },
          {
            prompt: "Which heading order is best?",
            options: ["h1 then h2", "h1 then h4", "h3 then h1", "h2 then h1"],
            answer: 0,
            explanation: "Keep heading levels in order and do not skip levels.",
          },
          {
            prompt: "Which element creates a landmark for the primary content?",
            options: ["<main>", "<div>", "<span>", "<p>"],
            answer: 0,
            explanation: "main is the landmark for the page's primary content.",
          },
        ],
      },
      {
        id: "html-forms",
        title: "Forms & media",
        summary: "Collect input and describe images accessibly.",
        theory: [
          {
            title: "Inputs and labels",
            body: "The input type controls the kind of value entered. A label connected with for and id describes the field.",
            code: '<label for="email">Email</label>\n<input id="email" type="email" required>',
          },
          {
            title: "Choices",
            body: "select and option create a dropdown. checkbox lets a user pick several options.",
            code: '<select name="topic">\n  <option>Arrays</option>\n  <option>Strings</option>\n</select>',
          },
          {
            title: "Accessible media",
            body: "alt describes an image's meaning. Use an empty alt for decorative images so screen readers skip them.",
            code: '<figure>\n  <img src="chart.png" alt="Scores by week">\n  <figcaption>Weekly progress</figcaption>\n</figure>',
          },
        ],
        tasks: [
          {
            prompt: "Which input type is best for an email address?",
            options: [
              'type="text"',
              'type="email"',
              'type="mail"',
              'type="string"',
            ],
            answer: 1,
            explanation:
              "type=email gives the browser useful validation and keyboard hints.",
          },
          {
            prompt: "How do you connect a label to an input?",
            options: [
              'label for="email" and input id="email"',
              'label id="email" and input for="email"',
              'label name="email" and input name="email"',
              "Place the input in a div",
            ],
            answer: 0,
            explanation: "The label's for value must match the input's id.",
          },
          {
            prompt: "Which input hides typed characters?",
            options: [
              'type="secret"',
              'type="hidden"',
              'type="password"',
              'type="private"',
            ],
            answer: 2,
            explanation: "type=password masks the characters on screen.",
          },
          {
            prompt: "Which button submits a form by default?",
            options: [
              '<button type="submit">Send</button>',
              '<button type="button">Send</button>',
              '<button type="reset">Send</button>',
              '<input type="text">',
            ],
            answer: 0,
            explanation: "A submit button sends the form data.",
          },
          {
            prompt: "Which input lets a user select several choices?",
            options: [
              'type="checkbox"',
              'type="radio"',
              'type="select"',
              'type="toggle"',
            ],
            answer: 0,
            explanation: "Checkboxes are independent and can be combined.",
          },
          {
            prompt: "Which pair creates a dropdown list?",
            options: [
              "<select> and <option>",
              "<input> and <label>",
              "<ul> and <li>",
              "<dropdown> and <item>",
            ],
            answer: 0,
            explanation:
              "select wraps the list and option defines each choice.",
          },
          {
            prompt: "What is placeholder text for?",
            options: [
              "A visible hint, not a replacement for a label",
              "The only accessible name of a field",
              "A permanent value",
              "A password rule",
            ],
            answer: 0,
            explanation:
              "Placeholders disappear after typing, so fields still need labels.",
          },
          {
            prompt: "Which attribute makes a field mandatory?",
            options: ["needed", "required", "must", "valid"],
            answer: 1,
            explanation:
              "required prevents submission while the field is empty.",
          },
          {
            prompt: "Which element adds a caption to an image?",
            options: ["<figcaption>", "<caption>", "<label>", "<legend>"],
            answer: 0,
            explanation:
              "figcaption describes a figure that contains the image.",
          },
          {
            prompt: "What alt text fits a purely decorative image?",
            options: [
              'alt=""',
              'alt="image"',
              'alt="decorative image here"',
              "No alt attribute",
            ],
            answer: 0,
            explanation:
              "An empty alt tells assistive technology to skip the image.",
          },
        ],
      },
    ],
  },
  {
    id: "css",
    name: "CSS",
    badge: "CSS",
    tagline: "Turn structure into visual language.",
    description:
      "Style with selectors, control the box model and build flexible layouts.",
    lessons: [
      {
        id: "css-basics",
        title: "Selectors & style",
        summary: "Target elements and set colors, type and spacing.",
        theory: [
          {
            title: "Selectors",
            body: "A class selector begins with a dot and can be reused. An id selector begins with a hash and should be unique.",
            code: ".card { padding: 20px; }\n#hero { background: #f4efe5; }",
          },
          {
            title: "Text and color",
            body: "color sets text color, background-color sets the surface, and font-size controls type size.",
            code: "h1 {\n  color: #173e31;\n  font-size: 32px;\n  font-weight: 700;\n}",
          },
          {
            title: "The cascade",
            body: "When rules compete, more specific selectors win. An id rule beats a class rule, which beats an element rule.",
            code: "/* This comment explains the rule */\n.card { color: #333; }",
          },
        ],
        tasks: [
          {
            prompt: "Which selector targets elements with class card?",
            options: [".card", "#card", "card", "*card"],
            answer: 0,
            explanation: "A leading dot selects a class.",
          },
          {
            prompt: "Which selector targets the element with id hero?",
            options: [".hero", "#hero", "hero", "@hero"],
            answer: 1,
            explanation: "A leading hash selects an id.",
          },
          {
            prompt: "Which property changes text color?",
            options: ["background", "font", "color", "text-style"],
            answer: 2,
            explanation: "color applies to the text itself.",
          },
          {
            prompt: "Which property changes the surface behind an element?",
            options: ["background-color", "color", "border", "fill"],
            answer: 0,
            explanation: "background-color paints the element's background.",
          },
          {
            prompt: "Which property sets the size of text?",
            options: ["text-size", "font-size", "type-size", "letter-size"],
            answer: 1,
            explanation: "font-size controls text size.",
          },
          {
            prompt: "Which rule wins when an id and a class both set color?",
            options: [
              "The id rule",
              "The class rule",
              "The last rule in the file",
              "Neither applies",
            ],
            answer: 0,
            explanation:
              "An id selector has higher specificity than a class selector.",
          },
          {
            prompt: "Which is valid inline CSS?",
            options: [
              'style="color: red"',
              'css="color: red"',
              "style: color red",
              'color="red"',
            ],
            answer: 0,
            explanation: "Inline styles go in the style attribute.",
          },
          {
            prompt: "Which selector targets paragraphs inside .card?",
            options: [".card p", "p.card", ".card + p", "p > .card"],
            answer: 0,
            explanation: "A space selects descendants of .card.",
          },
          {
            prompt: "Which value makes text bold?",
            options: [
              "font-weight: 700",
              "text-weight: bold",
              "font: bold",
              "weight: 700",
            ],
            answer: 0,
            explanation: "font-weight controls the thickness of text.",
          },
          {
            prompt: "Which is a CSS comment?",
            options: ["// note", "<!-- note -->", "/* note */", "# note"],
            answer: 2,
            explanation: "CSS comments use /* ... */.",
          },
        ],
      },
      {
        id: "css-box",
        title: "The box model",
        summary: "Control inner space, outer space and element size.",
        theory: [
          {
            title: "Padding and margin",
            body: "Padding is space inside an element's border. Margin is space outside it, between neighbours.",
            code: ".card {\n  padding: 24px;\n  margin-bottom: 16px;\n}",
          },
          {
            title: "Borders and sizing",
            body: "border draws the edge. box-sizing: border-box makes width include padding and border.",
            code: ".card {\n  border: 1px solid #ddd;\n  box-sizing: border-box;\n}",
          },
          {
            title: "Display and centering",
            body: "Block elements take a full line. margin: 0 auto centers a block with a set width.",
            code: ".container {\n  width: 100%;\n  max-width: 720px;\n  margin: 0 auto;\n}",
          },
        ],
        tasks: [
          {
            prompt: "Which property adds space inside an element?",
            options: ["margin", "padding", "gap", "outline"],
            answer: 1,
            explanation: "Padding is the inner space around content.",
          },
          {
            prompt: "Which property adds space outside an element?",
            options: ["padding", "border", "margin", "inset"],
            answer: 2,
            explanation: "Margin is the outer space between elements.",
          },
          {
            prompt: "Which sets a one-pixel solid border?",
            options: [
              "border: 1px solid #ccc",
              "border: solid 1px",
              "outline: 1px #ccc",
              "edge: 1px solid",
            ],
            answer: 0,
            explanation: "The border shorthand sets width, style and color.",
          },
          {
            prompt: "What does box-sizing: border-box do?",
            options: [
              "Adds a border automatically",
              "Includes padding and border in the width",
              "Removes all margins",
              "Makes the element circular",
            ],
            answer: 1,
            explanation:
              "The declared width then covers content, padding and border.",
          },
          {
            prompt: "What is the default display value of a div?",
            options: ["inline", "block", "flex", "grid"],
            answer: 1,
            explanation: "A div is a block-level element by default.",
          },
          {
            prompt:
              "How do you center a block with a fixed width horizontally?",
            options: [
              "margin: 0 auto",
              "padding: 0 auto",
              "text-align: center",
              "align: center",
            ],
            answer: 0,
            explanation: "Equal automatic side margins center the block.",
          },
          {
            prompt: "Which display value lays children out in a row?",
            options: ["flex", "none", "inline", "table"],
            answer: 0,
            explanation: "display: flex creates a flex container.",
          },
          {
            prompt: "Which property adds space between flex items?",
            options: ["margin", "padding", "gap", "space"],
            answer: 2,
            explanation: "gap sets the space between flex or grid items.",
          },
          {
            prompt: "Which property rounds an element's corners?",
            options: ["corner-radius", "border-radius", "round", "radius"],
            answer: 1,
            explanation: "border-radius controls corner rounding.",
          },
          {
            prompt: "Why use max-width on a container?",
            options: [
              "To stop it growing too wide on large screens",
              "To hide overflow",
              "To center text",
              "To add a border",
            ],
            answer: 0,
            explanation: "max-width keeps long lines comfortable to read.",
          },
        ],
      },
      {
        id: "css-flex",
        title: "Flexbox & responsive",
        summary: "Arrange items and adapt to any screen.",
        theory: [
          {
            title: "Flex basics",
            body: "display: flex places children in a row. justify-content aligns along the main axis, and align-items aligns across it.",
            code: ".row {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}",
          },
          {
            title: "Wrapping and growth",
            body: "flex-wrap lets items move onto new lines. flex: 1 makes an item grow to share the available space.",
            code: ".grid {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 16px;\n}\n.grid > * { flex: 1; }",
          },
          {
            title: "Media queries",
            body: "A media query applies rules at a chosen viewport width. Mobile-first CSS starts with small screens and adds min-width rules.",
            code: "@media (min-width: 760px) {\n  .grid { grid-template-columns: repeat(3, 1fr); }\n}",
          },
        ],
        tasks: [
          {
            prompt: "Which declaration creates a flex container?",
            options: [
              "display: flex",
              "position: flex",
              "flex: row",
              "layout: flex",
            ],
            answer: 0,
            explanation:
              "display: flex turns the element into a flex container.",
          },
          {
            prompt: "Which property aligns items along the main axis?",
            options: [
              "align-items",
              "justify-content",
              "place-items",
              "flex-align",
            ],
            answer: 1,
            explanation:
              "justify-content distributes items along the main axis.",
          },
          {
            prompt: "Which property aligns items across the main axis?",
            options: ["align-items", "justify-content", "flex-wrap", "gap"],
            answer: 0,
            explanation: "align-items controls alignment on the cross axis.",
          },
          {
            prompt: "Which declaration stacks flex items vertically?",
            options: [
              "flex-direction: column",
              "flex-wrap: wrap",
              "align-items: column",
              "display: block",
            ],
            answer: 0,
            explanation: "A column direction makes the main axis vertical.",
          },
          {
            prompt: "Which value pushes flex items apart at the edges?",
            options: [
              "justify-content: center",
              "justify-content: space-between",
              "align-items: stretch",
              "flex: 1",
            ],
            answer: 1,
            explanation: "space-between places remaining space between items.",
          },
          {
            prompt: "Which property lets flex items move to a new line?",
            options: [
              "flex-wrap: wrap",
              "flex-break: on",
              "overflow: wrap",
              "display: wrap",
            ],
            answer: 0,
            explanation: "flex-wrap allows multiple flex lines.",
          },
          {
            prompt: "Which pair centers items in both directions?",
            options: [
              "justify-content: center and align-items: center",
              "justify-content: start and align-items: stretch",
              "flex: 1 and gap: 0",
              "display: block and margin: auto",
            ],
            answer: 0,
            explanation: "Both axes need to be centered explicitly.",
          },
          {
            prompt: "Which is a valid media query?",
            options: [
              "@media (max-width: 600px) { ... }",
              "media(max-width:600px) { ... }",
              "@screen 600px { ... }",
              "if (max-width: 600px) { ... }",
            ],
            answer: 0,
            explanation: "Media queries use @media followed by a condition.",
          },
          {
            prompt: "What does mobile-first CSS mean?",
            options: [
              "Base styles target small screens, then min-width rules add complexity",
              "Only design for phones",
              "Use max-width queries for every rule",
              "Hide content on desktop",
            ],
            answer: 0,
            explanation: "Mobile-first builds up from the smallest layout.",
          },
          {
            prompt: "Which declaration lets an item share the available space?",
            options: [
              "flex: 1",
              "width: auto",
              "margin: auto",
              "display: inline",
            ],
            answer: 0,
            explanation: "flex: 1 makes the item grow into free space.",
          },
        ],
      },
    ],
  },
  {
    id: "java",
    name: "Java",
    badge: "JV",
    tagline: "Structured code for real systems.",
    description: "From your first class to methods and arrays.",
    lessons: [
      {
        id: "java-basics",
        title: "Classes & types",
        summary: "Write a main method and work with typed values.",
        theory: [
          {
            title: "The entry point",
            body: "Java programs start in the main method. Every statement ends with a semicolon.",
            code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hi");\n    }\n}',
          },
          {
            title: "Types",
            body: "A variable declares its type. int stores whole numbers, double stores decimals, and String stores text.",
            code: 'int level = 1;\ndouble price = 4.5;\nString name = "Ada";',
          },
          {
            title: "Constants",
            body: "final marks a value that cannot change after it is assigned.",
            code: "final int MAX_LEVEL = 10;",
          },
        ],
        tasks: [
          {
            prompt: "Which is the correct main method signature?",
            options: [
              "public static void main(String[] args)",
              "public void main(String args)",
              "static main(String[] args)",
              "public static main()",
            ],
            answer: 0,
            explanation:
              "Java starts from public static void main(String[] args).",
          },
          {
            prompt: "Which line prints text followed by a newline?",
            options: [
              'System.out.print("Hi");',
              'System.out.println("Hi");',
              'console.log("Hi");',
              'print("Hi");',
            ],
            answer: 1,
            explanation: "println writes the value and moves to a new line.",
          },
          {
            prompt: "Which type stores a whole number?",
            options: ["String", "double", "int", "boolean"],
            answer: 2,
            explanation: "int stores whole numbers.",
          },
          {
            prompt: "Which line declares a String correctly?",
            options: [
              'String name = "Ada";',
              "string name = Ada;",
              "String name = Ada;",
              'name = "Ada";',
            ],
            answer: 0,
            explanation:
              "Java type names are case-sensitive and String uses double quotes.",
          },
          {
            prompt: "What is printed?",
            code: "System.out.println(2 + 3 * 4);",
            options: ["20", "14", "24", "9"],
            answer: 1,
            explanation: "Multiplication runs first: 12, then 2 + 12 = 14.",
          },
          {
            prompt: "What is printed?",
            code: "System.out.println(7 / 2);",
            options: ["3.5", "3", "4", "1"],
            answer: 1,
            explanation:
              "Both values are ints, so division keeps the whole number 3.",
          },
          {
            prompt: "What is printed?",
            code: 'System.out.println("5" + 2);',
            options: ["7", "52", "5 2", "Error"],
            answer: 1,
            explanation: "String concatenation joins 5 and 2 as text.",
          },
          {
            prompt: "Which symbol ends a Java statement?",
            options: [".", ":", ";", ","],
            answer: 2,
            explanation: "Java statements end with a semicolon.",
          },
          {
            prompt: "How do you declare a constant?",
            options: [
              "const int MAX = 10;",
              "final int MAX = 10;",
              "static int MAX = 10;",
              "readonly int MAX = 10;",
            ],
            answer: 1,
            explanation: "final prevents reassignment in Java.",
          },
          {
            prompt: "Which type stores true or false?",
            options: ["int", "String", "boolean", "char"],
            answer: 2,
            explanation: "boolean holds true or false.",
          },
        ],
      },
      {
        id: "java-control",
        title: "Control flow",
        summary: "Branch, loop and switch through a program.",
        theory: [
          {
            title: "Conditions",
            body: "if and else check boolean conditions. Use else if for additional checks.",
            code: 'int score = 70;\nif (score >= 90) {\n    System.out.println("A");\n} else if (score >= 60) {\n    System.out.println("B");\n}',
          },
          {
            title: "Loops",
            body: "for repeats with a counter. while repeats while its condition remains true.",
            code: "for (int i = 0; i < 3; i++) {\n    System.out.println(i);\n}",
          },
          {
            title: "Switch",
            body: "switch compares one value against case labels. break stops execution from falling into the next case.",
            code: 'switch (n) {\n    case 1:\n        System.out.println("one");\n        break;\n    default:\n        System.out.println("other");\n}',
          },
        ],
        tasks: [
          {
            prompt: "What is printed?",
            code: 'if (5 > 3) {\n    System.out.println("yes");\n}',
            options: ["yes", "no", "5", "Nothing"],
            answer: 0,
            explanation: "5 > 3 is true, so the block runs.",
          },
          {
            prompt: "What is printed?",
            code: 'int score = 70;\nif (score >= 90) {\n    System.out.println("A");\n} else if (score >= 60) {\n    System.out.println("B");\n} else {\n    System.out.println("C");\n}',
            options: ["A", "B", "C", "Nothing"],
            answer: 1,
            explanation: "70 fails the first check but passes the second.",
          },
          {
            prompt: "Which numbers are printed?",
            code: "for (int i = 0; i < 3; i++) {\n    System.out.println(i);\n}",
            options: ["1 2 3", "0 1 2", "0 1 2 3", "3"],
            answer: 1,
            explanation: "The loop starts at 0 and stops before 3.",
          },
          {
            prompt: "What is the total?",
            code: "int total = 0;\nfor (int n = 1; n <= 3; n++) {\n    total += n;\n}\nSystem.out.println(total);",
            options: ["3", "5", "6", "123"],
            answer: 2,
            explanation: "The loop adds 1, 2 and 3 for a total of 6.",
          },
          {
            prompt: "What is printed?",
            code: "int x = 0;\nwhile (x < 2) {\n    x++;\n}\nSystem.out.println(x);",
            options: ["0", "1", "2", "3"],
            answer: 2,
            explanation: "x reaches 2, then the while condition fails.",
          },
          {
            prompt: "Which numbers are printed?",
            code: "for (int i = 0; i < 5; i++) {\n    if (i == 2) break;\n    System.out.println(i);\n}",
            options: ["0 1 2", "0 1", "2", "Nothing"],
            answer: 1,
            explanation: "break stops the loop before 2 is printed.",
          },
          {
            prompt: "What is printed?",
            code: 'System.out.println(5 > 3 ? "big" : "small");',
            options: ["big", "small", "true", "5"],
            answer: 0,
            explanation: "The ternary picks big because the condition is true.",
          },
          {
            prompt: "What is printed?",
            code: 'int n = 2;\nswitch (n) {\n    case 1:\n        System.out.println("one");\n        break;\n    case 2:\n        System.out.println("two");\n        break;\n}',
            options: ["one", "two", "one two", "Nothing"],
            answer: 1,
            explanation: "The case matching 2 prints two and then breaks.",
          },
          {
            prompt: "What does i++ do?",
            options: [
              "Adds 1 to i",
              "Subtracts 1 from i",
              "Doubles i",
              "Compares i with 1",
            ],
            answer: 0,
            explanation: "The increment operator adds one.",
          },
          {
            prompt: "Which operator is true only when both sides are true?",
            options: ["||", "&&", "!", "=="],
            answer: 1,
            explanation: "&& is logical AND.",
          },
        ],
      },
      {
        id: "java-methods",
        title: "Methods & arrays",
        summary: "Break work into methods and store lists of values.",
        theory: [
          {
            title: "Methods",
            body: "A method groups reusable logic. Its return type says what it sends back; void means nothing.",
            code: "static int doubleIt(int n) {\n    return n * 2;\n}",
          },
          {
            title: "Arrays",
            body: "An array stores a fixed number of values of one type. Indices start at 0 and length reports the size.",
            code: "int[] nums = {1, 2, 3};\nSystem.out.println(nums[1]);",
          },
          {
            title: "Enhanced for",
            body: "The enhanced for loop visits every value in an array without managing an index.",
            code: "for (int n : nums) {\n    System.out.println(n);\n}",
          },
        ],
        tasks: [
          {
            prompt: "Which method returns an int?",
            options: [
              "static void doubleIt(int n) { return n * 2; }",
              "static int doubleIt(int n) { return n * 2; }",
              "static doubleIt(int n) { return n * 2; }",
              "int doubleIt(int n) { n * 2; }",
            ],
            answer: 1,
            explanation:
              "The return type int must appear before the method name.",
          },
          {
            prompt: "How do you call doubleIt with 4?",
            options: [
              "doubleIt(4)",
              "doubleIt = 4",
              "call doubleIt(4)",
              "new doubleIt(4)",
            ],
            answer: 0,
            explanation: "A method call uses its name followed by arguments.",
          },
          {
            prompt: "What does void mean in a method signature?",
            options: [
              "It returns 0",
              "It returns nothing",
              "It is private",
              "It is static",
            ],
            answer: 1,
            explanation: "void methods do not return a value.",
          },
          {
            prompt: "Which line creates an int array?",
            options: [
              "int nums[] = (1, 2, 3);",
              "int[] nums = {1, 2, 3};",
              "array nums = {1, 2, 3};",
              "int nums = [1, 2, 3];",
            ],
            answer: 1,
            explanation: "Java uses braces for array literals.",
          },
          {
            prompt: "What is nums[1] for {10, 20, 30}?",
            options: ["10", "20", "30", "1"],
            answer: 1,
            explanation: "Arrays are zero-indexed, so index 1 is 20.",
          },
          {
            prompt: "How do you read the size of an array?",
            options: ["nums.size()", "nums.length", "nums.count", "len(nums)"],
            answer: 1,
            explanation: "Arrays expose a length field.",
          },
          {
            prompt: "Which is an enhanced for loop?",
            options: [
              "for (int i = 0; i < nums.length; i++)",
              "for (int n : nums)",
              "for (nums as n)",
              "foreach (n in nums)",
            ],
            answer: 1,
            explanation: "for (type name : array) visits every value.",
          },
          {
            prompt: "How do you read a String's length?",
            options: [
              "name.length",
              "name.length()",
              "name.size",
              "name.count()",
            ],
            answer: 1,
            explanation: "String length is a method, so it needs parentheses.",
          },
          {
            prompt: "What is method overloading?",
            options: [
              "Two methods with the same name but different parameters",
              "A method that returns twice",
              "Replacing a method at runtime",
              "Calling a method from itself",
            ],
            answer: 0,
            explanation:
              "Overloaded methods share a name but differ in their parameter lists.",
          },
          {
            prompt: "What is printed?",
            code: "int[] nums = {1, 2, 3};\nint total = 0;\nfor (int n : nums) {\n    total += n;\n}\nSystem.out.println(total);",
            options: ["3", "5", "6", "123"],
            answer: 2,
            explanation: "The enhanced for adds 1, 2 and 3 for a total of 6.",
          },
        ],
      },
    ],
  },
  {
    id: "cpp",
    name: "C++",
    badge: "C++",
    tagline: "Close to the machine, still expressive.",
    description: "Learn streams, control flow, functions and vectors.",
    lessons: [
      {
        id: "cpp-basics",
        title: "First program",
        summary: "Include iostream and write output with cout.",
        theory: [
          {
            title: "Headers and main",
            body: "cout lives in the iostream header. Every C++ program starts in main, which returns an int.",
            code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hi" << endl;\n    return 0;\n}',
          },
          {
            title: "Variables",
            body: "C++ variables have a type, such as int, double, char or bool. A statement ends with a semicolon.",
            code: "int level = 1;\ndouble price = 4.5;\nbool ready = true;",
          },
          {
            title: "Output",
            body: "The << operator sends values into cout. endl starts a new line.",
            code: 'cout << "Score: " << 10 << endl;',
          },
        ],
        tasks: [
          {
            prompt: "Which header provides cout?",
            options: ["<stdio>", "<iostream>", "<console>", "<stream>"],
            answer: 1,
            explanation:
              "iostream defines the standard input and output streams.",
          },
          {
            prompt: "Which line lets you write cout without std::?",
            options: [
              "using namespace std;",
              "import std;",
              "include std;",
              "using cout;",
            ],
            answer: 0,
            explanation:
              "using namespace std brings standard names into scope.",
          },
          {
            prompt: "What type does main return?",
            options: ["void", "string", "int", "bool"],
            answer: 2,
            explanation:
              "The standard main function returns an int status code.",
          },
          {
            prompt: "What is printed?",
            code: 'cout << "Hi";',
            options: ["Hi", "cout", "Nothing", "Error"],
            answer: 0,
            explanation: "The string is sent to standard output.",
          },
          {
            prompt: "Which declares an integer named level?",
            options: [
              "int level = 5;",
              "level int = 5;",
              "integer level = 5;",
              "var level = 5;",
            ],
            answer: 0,
            explanation: "The type comes before the variable name.",
          },
          {
            prompt: "What is printed?",
            code: "cout << 2 + 3 * 4;",
            options: ["20", "14", "24", "9"],
            answer: 1,
            explanation: "Multiplication happens first: 12, then 2 + 12 = 14.",
          },
          {
            prompt: "What is printed?",
            code: 'cout << "5" << 2;',
            options: ["7", "52", "5 2", "Error"],
            answer: 1,
            explanation:
              "The first value is text, so the output is joined as 52.",
          },
          {
            prompt: "Which symbol ends a C++ statement?",
            options: [".", ":", ";", ","],
            answer: 2,
            explanation: "C++ statements end with a semicolon.",
          },
          {
            prompt: "Which is a single-line comment?",
            options: ["// note", "# note", "<!-- note -->", "/* note"],
            answer: 0,
            explanation: "Two slashes start a single-line comment.",
          },
          {
            prompt: "What does endl do?",
            options: [
              "Ends the program",
              "Adds a newline",
              "Clears the screen",
              "Deletes output",
            ],
            answer: 1,
            explanation: "endl inserts a newline and flushes the stream.",
          },
        ],
      },
      {
        id: "cpp-control",
        title: "Control flow",
        summary: "Branch and repeat with C++ syntax.",
        theory: [
          {
            title: "Conditions",
            body: "if runs a block when a condition is true. else if adds more checks and else catches the rest.",
            code: 'int score = 70;\nif (score >= 90) {\n    cout << "A";\n} else if (score >= 60) {\n    cout << "B";\n}',
          },
          {
            title: "Loops",
            body: "for repeats with a counter, while repeats while a condition holds, and break exits early.",
            code: "for (int i = 0; i < 3; i++) {\n    cout << i;\n}",
          },
          {
            title: "Switch",
            body: "switch compares a value against case labels. break prevents fall-through.",
            code: 'switch (n) {\n    case 1:\n        cout << "one";\n        break;\n    default:\n        cout << "other";\n}',
          },
        ],
        tasks: [
          {
            prompt: "What is printed?",
            code: 'if (5 > 3) cout << "yes";',
            options: ["yes", "no", "5", "Nothing"],
            answer: 0,
            explanation: "5 > 3 is true, so the statement runs.",
          },
          {
            prompt: "What is printed?",
            code: 'int score = 70;\nif (score >= 90) {\n    cout << "A";\n} else if (score >= 60) {\n    cout << "B";\n} else {\n    cout << "C";\n}',
            options: ["A", "B", "C", "Nothing"],
            answer: 1,
            explanation: "70 passes the second condition, so B is printed.",
          },
          {
            prompt: "Which numbers are printed?",
            code: "for (int i = 0; i < 3; i++) {\n    cout << i;\n}",
            options: ["123", "012", "0123", "3"],
            answer: 1,
            explanation: "The loop prints 0, 1 and 2 without spaces.",
          },
          {
            prompt: "What is the total?",
            code: "int total = 0;\nfor (int n = 1; n <= 3; n++) {\n    total += n;\n}\ncout << total;",
            options: ["3", "5", "6", "123"],
            answer: 2,
            explanation: "The loop adds 1, 2 and 3 for 6.",
          },
          {
            prompt: "What is printed?",
            code: "int x = 0;\nwhile (x < 2) {\n    x++;\n}\ncout << x;",
            options: ["0", "1", "2", "3"],
            answer: 2,
            explanation: "x reaches 2, then the condition fails.",
          },
          {
            prompt: "Which numbers are printed?",
            code: "for (int i = 0; i < 5; i++) {\n    if (i == 2) break;\n    cout << i;\n}",
            options: ["012", "01", "2", "Nothing"],
            answer: 1,
            explanation: "The loop prints 0 and 1 before breaking at 2.",
          },
          {
            prompt: "What is printed?",
            code: 'cout << (5 > 3 ? "big" : "small");',
            options: ["big", "small", "true", "5"],
            answer: 0,
            explanation: "The condition is true, so the ternary returns big.",
          },
          {
            prompt: "What is printed?",
            code: 'int n = 2;\nswitch (n) {\n    case 1:\n        cout << "one";\n        break;\n    case 2:\n        cout << "two";\n        break;\n}',
            options: ["one", "two", "onetwo", "Nothing"],
            answer: 1,
            explanation: "The matching case prints two and breaks.",
          },
          {
            prompt: "What does i++ do?",
            options: [
              "Adds 1 to i",
              "Subtracts 1 from i",
              "Doubles i",
              "Compares i with 1",
            ],
            answer: 0,
            explanation: "The increment operator adds one.",
          },
          {
            prompt: "Which operator is true only when both sides are true?",
            options: ["||", "&&", "!", "=="],
            answer: 1,
            explanation: "&& is logical AND.",
          },
        ],
      },
      {
        id: "cpp-functions",
        title: "Functions & vectors",
        summary: "Reuse logic and grow collections at runtime.",
        theory: [
          {
            title: "Functions",
            body: "A function declares a return type, a name and parameters. void means it returns nothing.",
            code: "int doubleIt(int n) {\n    return n * 2;\n}",
          },
          {
            title: "Vectors",
            body: "vector is a resizable array from the vector header. push_back adds an item and size reports the count.",
            code: "#include <vector>\nvector<int> nums = {1, 2, 3};\nnums.push_back(4);",
          },
          {
            title: "Range-based for",
            body: "A range-based loop visits every value in a vector without an index.",
            code: "for (int n : nums) {\n    cout << n << endl;\n}",
          },
        ],
        tasks: [
          {
            prompt: "Which defines a function that returns an int?",
            options: [
              "void doubleIt(int n) { return n * 2; }",
              "int doubleIt(int n) { return n * 2; }",
              "doubleIt(int n) { return n * 2; }",
              "int doubleIt(n) { n * 2; }",
            ],
            answer: 1,
            explanation: "The return type int comes before the function name.",
          },
          {
            prompt: "How do you call doubleIt with 4?",
            options: [
              "doubleIt(4)",
              "doubleIt = 4",
              "call doubleIt(4)",
              "new doubleIt(4)",
            ],
            answer: 0,
            explanation: "A function call uses its name followed by arguments.",
          },
          {
            prompt: "What does void mean in a function signature?",
            options: [
              "It returns 0",
              "It returns nothing",
              "It is private",
              "It is constant",
            ],
            answer: 1,
            explanation: "void functions do not return a value.",
          },
          {
            prompt: "Which header provides vector?",
            options: ["<array>", "<vector>", "<list>", "<collection>"],
            answer: 1,
            explanation: "The vector class is declared in the vector header.",
          },
          {
            prompt: "Which line creates a vector of ints?",
            options: [
              "vector<int> nums = {1, 2, 3};",
              "vector nums<int> = {1, 2, 3};",
              "int vector nums = {1, 2, 3};",
              "array<int> nums = {1, 2, 3};",
            ],
            answer: 0,
            explanation: "The type goes inside angle brackets after vector.",
          },
          {
            prompt: "Which call adds 4 to the end of nums?",
            options: [
              "nums.add(4)",
              "nums.push_back(4)",
              "nums.append(4)",
              "nums.push(4)",
            ],
            answer: 1,
            explanation: "push_back adds an element at the end of a vector.",
          },
          {
            prompt: "How do you read the number of items in a vector?",
            options: [
              "nums.length",
              "nums.size()",
              "nums.count()",
              "len(nums)",
            ],
            answer: 1,
            explanation: "vector provides a size() method.",
          },
          {
            prompt: "What is nums[1] for {10, 20, 30}?",
            options: ["10", "20", "30", "1"],
            answer: 1,
            explanation: "Index 1 is the second item, 20.",
          },
          {
            prompt: "Which is a range-based for loop?",
            options: [
              "for (int i = 0; i < nums.size(); i++)",
              "for (int n : nums)",
              "for (n in nums)",
              "foreach (int n in nums)",
            ],
            answer: 1,
            explanation: "for (type name : container) visits each value.",
          },
          {
            prompt: "What is printed?",
            code: "vector<int> nums = {1, 2, 3};\nint total = 0;\nfor (int n : nums) {\n    total += n;\n}\ncout << total;",
            options: ["3", "5", "6", "123"],
            answer: 2,
            explanation: "The loop adds 1, 2 and 3 for a total of 6.",
          },
        ],
      },
    ],
  },
];

export function getLanguage(id?: string): Language | undefined {
  return languages.find((language) => language.id === id);
}

export function getLesson(language: Language, id?: string): Lesson | undefined {
  return language.lessons.find((lesson) => lesson.id === id);
}

export function lessonKey(languageId: string, lessonId: string) {
  return `${languageId}:${lessonId}`;
}

export function correctFor(
  practice: Record<string, number[]>,
  languageId: string,
  lesson: Lesson,
) {
  return uniqueCorrect(
    practice[lessonKey(languageId, lesson.id)],
    lesson.tasks.length,
  );
}

export function isLessonPassed(
  practice: Record<string, number[]>,
  languageId: string,
  lesson: Lesson,
) {
  return lessonPassed(correctFor(practice, languageId, lesson), PASS_MARK);
}

export function trackProgress(
  practice: Record<string, number[]>,
  language: Language,
) {
  return language.lessons.filter((lesson) =>
    isLessonPassed(practice, language.id, lesson),
  ).length;
}

export function firstUnfinished(
  practice: Record<string, number[]>,
  language: Language,
) {
  return (
    language.lessons.find(
      (lesson) => !isLessonPassed(practice, language.id, lesson),
    ) || language.lessons[language.lessons.length - 1]
  );
}

export function difficultyFor(index: number) {
  if (index < 3) return "Warm-up";
  if (index < 7) return "Core";
  return "Challenge";
}

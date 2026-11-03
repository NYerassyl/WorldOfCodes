export type Lesson = {
  id: string;
  title: string;
  description: string;
  theory: string;
  code: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
};
export const lessons: Lesson[] = [
  {
    id: "variables",
    title: "Variables & types",
    description: "Your first step in working with data",
    theory:
      "A variable gives a value a name. In JavaScript, const prevents reassignment, while let allows you to change the value later. Strings use quotation marks; numbers do not.",
    code: 'const name = "Arlan";\nlet level = 1;\nlevel = level + 1;\nconsole.log(level);',
    question: "What number does this code print?",
    choices: ["1", "2", '"level"', "An error"],
    answer: 1,
    explanation:
      "level starts at 1. Adding 1 and assigning it back makes the new value 2.",
  },
  {
    id: "conditions",
    title: "Conditions: if / else",
    description: "Teach your code to make decisions",
    theory:
      "When the if condition is true, its block runs. Otherwise, the else block runs. The >= operator means greater than or equal to.",
    code: 'const coins = 50;\nif (coins >= 50) {\n  console.log("Unlocked");\n} else {\n  console.log("Not enough");\n}',
    question: "What does the console print?",
    choices: ["Not enough", "Both messages", "Unlocked", "Nothing"],
    answer: 2,
    explanation: "50 >= 50 is true, so the first block prints Unlocked.",
  },
  {
    id: "loops",
    title: "Loops",
    description: "Make repetitive work effortless",
    theory:
      "A for loop has an initial value, a condition and an update step. The condition is checked before each iteration. i++ increases i by 1.",
    code: "let total = 0;\nfor (let i = 1; i <= 3; i++) {\n  total += i;\n}\nconsole.log(total);",
    question: "What is the final value of total?",
    choices: ["3", "4", "5", "6"],
    answer: 3,
    explanation: "The loop adds 1, 2 and 3: 0 + 1 + 2 + 3 = 6.",
  },
  {
    id: "functions",
    title: "Functions",
    description: "Write it once. Use it again.",
    theory:
      "A function performs a specific task. Parameters let it receive data, and return sends back a result. The function stops when return runs.",
    code: "function reward(level) {\n  return level * 10;\n}\nconst coins = reward(3);",
    question: "What value is stored in coins?",
    choices: ["10", "3", "30", "0"],
    answer: 2,
    explanation:
      "Calling reward(3) sets level to 3. The result is 3 × 10 = 30.",
  },
  {
    id: "arrays",
    title: "Arrays",
    description: "Keep related values together",
    theory:
      "An array is an ordered collection of values. Indices start at 0. The length property gives the number of items. The last index is length - 1.",
    code: 'const skills = ["HTML", "CSS", "JS"];\nconsole.log(skills[1]);',
    question: "Which value does skills[1] return?",
    choices: ["HTML", "CSS", "JS", "1"],
    answer: 1,
    explanation:
      "Index 0 contains HTML, index 1 contains CSS, and index 2 contains JS.",
  },
  {
    id: "methods",
    title: "Array methods",
    description: "Transform data with map and filter",
    theory:
      "map transforms each item and returns a new array. filter keeps only items that pass a condition. These methods do not automatically modify the original array.",
    code: "const numbers = [1, 2, 3, 4];\nconst result = numbers\n  .filter(n => n % 2 === 0)\n  .map(n => n * 2);",
    question: "What does the result array contain?",
    choices: ["[2, 4]", "[1, 3]", "[4, 8]", "[2, 4, 6, 8]"],
    answer: 2,
    explanation:
      "filter keeps the even numbers: [2, 4]. map then doubles them: [4, 8].",
  },
];
export type Problem = {
  id: string;
  title: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  input: string;
  output: string;
  starter: string;
};
export const problems: Problem[] = [
  {
    id: "sum",
    title: "Array sum",
    topic: "Arrays",
    difficulty: "easy",
    description:
      "Return the sum of all numbers in an array. Return 0 for an empty array.",
    input: "[2, 4, 6]",
    output: "12",
    starter: "function solve(numbers) {\n  // Write your solution here\n  \n}",
  },
  {
    id: "palindrome",
    title: "Valid palindrome",
    topic: "Strings",
    difficulty: "easy",
    description:
      "Return true if a string of lowercase English letters reads the same forward and backward. Otherwise, return false.",
    input: '"level"',
    output: "true",
    starter: "function solve(text) {\n  \n}",
  },
  {
    id: "search",
    title: "Binary search",
    topic: "Search",
    difficulty: "medium",
    description:
      "Find the index of target in an ascending array of unique numbers. Return -1 if it is missing. Your solution should run in O(log n) time.",
    input: "[1, 3, 5, 7, 9], target = 7",
    output: "3",
    starter: "function solve(numbers, target) {\n  \n}",
  },
  {
    id: "two-sum",
    title: "Two sum",
    topic: "Arrays",
    difficulty: "medium",
    description:
      "Return the indices of two elements that add up to target. Do not use the same element twice. Assume exactly one solution exists.",
    input: "[2, 7, 11, 15], target = 9",
    output: "[0, 1]",
    starter: "function solve(numbers, target) {\n  \n}",
  },
  {
    id: "merge",
    title: "Merge sorted arrays",
    topic: "Sorting",
    difficulty: "medium",
    description:
      "Merge two sorted arrays into one ascending array. Keep duplicate values.",
    input: "[1, 4], [2, 3]",
    output: "[1, 2, 3, 4]",
    starter: "function solve(first, second) {\n  \n}",
  },
  {
    id: "window",
    title: "Longest unique substring",
    topic: "Strings",
    difficulty: "hard",
    description:
      "For a string of lowercase English letters, return the length of the longest contiguous substring without repeating characters.",
    input: '"abcabcbb"',
    output: "3",
    starter: "function solve(text) {\n  \n}",
  },
];
export const difficultyNames = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};
export const snippets = [
  {
    id: "hello",
    title: "Your first function",
    language: "JavaScript",
    code: 'function greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("WorldOfCodes"));',
  },
  {
    id: "array",
    title: "Transform an array",
    language: "JavaScript",
    code: "const numbers = [1, 2, 3, 4, 5];\n\nconst squares = numbers.map(number => {\n  return number * number;\n});\n\nconsole.log(squares);",
  },
  {
    id: "card",
    title: "A profile card",
    language: "HTML",
    code: '<article class="profile">\n  <h2>Arlan</h2>\n  <p>Beginner developer</p>\n  <button>View profile</button>\n</article>',
  },
];

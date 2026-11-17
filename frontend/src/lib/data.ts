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

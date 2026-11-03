import type { Lesson, LessonExtras } from "../curriculum";

export const newLessons: Lesson[] = [
  {
    id: "py-collections",
    title: "Lists, tuples, sets & dicts",
    summary: "Store groups of data and pick the collection that fits the job.",
    theory: [
      {
        title: "Lists keep order and can change",
        body: 'The list is the collection you will reach for most: an ordered sequence written with square brackets, where every item sits in a numbered slot called an index that starts at 0. Because the order is fixed, the first item is always at index 0, and index -1 counts back from the end, so it always reaches the last item. A slice such as items[1:4] copies a range: it includes the start index and stops before the end index, the same half-open rule that range() follows. Lists are mutable, which means their contents can change after creation. append adds to the end, insert places an item at a position, pop removes and returns one, and assignment through an index such as items[0] = "new" replaces a slot. len() reports how many items there are. When a list is passed into a function and the function calls append, the caller sees the change, because both names point at the same list rather than at a copy.',
        code: 'items = ["red", "green", "blue"]\nprint(items[1])      # green\nprint(items[-1])     # blue\nitems[1] = "lime"    # lists are mutable\nprint(items[1:3])    # ["lime", "blue"]\nprint(len(items))    # 3',
      },
      {
        title: "Tuples are fixed, sets are unique",
        body: "Round brackets create a tuple, an ordered sequence that cannot be changed after it is built. Immutable means its slots are locked: you can read point[0] or take a slice, but there is no append and no assignment through an index. Tuples suit values that belong together and should stay fixed, such as a coordinate, and Python can unpack one into several names in a single line. A set uses curly braces without colons and keeps only unique values, forgetting the order they arrived in, so printing a set rarely matches the order you typed. Duplicates are removed silently, which makes set(items) a quick way to drop repeats from a list. Sets answer membership questions quickly and combine with operators: | is union, & is intersection and - is difference. The trade-off is that a set has no index, because no item owns a position. Choose a list when order matters, a tuple when the values must not change, and a set when you only care about uniqueness and presence.",
        code: "point = (3, 5)\nx, y = point\n\nseen = {1, 2, 2, 3}\nprint(len(seen))              # 3\nprint({1, 2, 3} & {2, 3, 4})  # {2, 3}",
      },
      {
        title: "Dictionaries map keys to values",
        body: 'A dictionary stores pairs, where a key identifies a value, so lookup happens by key instead of by position. The literal uses braces with colons, as in scores = {"Ada": 10}. Reading a missing key with square brackets raises KeyError, while get returns None instead, or a fallback when you pass a second argument, which makes scores.get("Bo", 0) safe. Dictionaries are mutable: assigning to an existing key replaces the value, assigning to a new key creates it, and pop removes a key and hands back its value. The keys, values and items methods expose views over the contents, and items is the usual loop target because each step yields the key and the value together. Keys must be immutable, which is why strings, numbers and tuples work while lists do not. Lookup is fast because Python hashes the key instead of scanning every entry in turn.',
        code: 'scores = {"Ada": 10, "Bo": 7}\nprint(scores.get("Cy", 0))  # 0\nscores["Cy"] = 12\n\nfor name, score in scores.items():\n    print(f"{name}: {score}")',
      },
    ],
    tasks: [
      {
        prompt: "What is printed?",
        code: 'colors = ["red", "green", "blue"]\nprint(colors[1])',
        options: ["red", "green", "blue", "Error"],
        answer: 1,
        explanation:
          "Index 0 holds red, so index 1 reaches the second item, green.",
      },
      {
        prompt:
          "Which collection keeps only unique values and silently drops duplicates?",
        options: ["list", "tuple", "set", "dict"],
        answer: 2,
        explanation:
          "A set compares each new value with what it already holds, so a repeat is never stored twice.",
      },
      {
        prompt: "Which literal creates an empty dictionary?",
        options: ["{}", "[]", "()", "dict[]"],
        answer: 0,
        explanation:
          "Empty braces are the dictionary literal, while [] is a list and () is a tuple.",
      },
      {
        prompt: "What is printed?",
        code: "nums = [0, 1, 2, 3, 4]\nprint(nums[1:4])",
        options: ["[1, 2, 3]", "[1, 2, 3, 4]", "[2, 3, 4]", "[0, 1, 2, 3]"],
        answer: 0,
        explanation:
          "A slice keeps the start index and stops before the end index, so it copies 1, 2 and 3.",
      },
      {
        prompt: "Which statement about tuples is correct?",
        options: [
          "A tuple can be changed after it is created",
          "A tuple cannot be changed, but a list stored inside it can still be modified",
          "A tuple can only hold numbers",
          "A tuple has no length",
        ],
        answer: 1,
        explanation:
          "The tuple locks its own slots, and that lock does not reach the objects it points at.",
      },
      {
        prompt:
          'The dictionary scores has no key called level. What does scores.get("level") return?',
        options: ["0", "KeyError", "None", "An empty string"],
        answer: 2,
        explanation:
          "get returns None for a missing key, which is why it is safer than square brackets.",
      },
      {
        prompt: "Which loop prints every key together with its value?",
        options: [
          "for key in data.items():",
          "for key, value in data.items():",
          "for key, value in data:",
          "for key in data.values():",
        ],
        answer: 1,
        explanation:
          "items() yields a pair per entry, so two loop names unpack the key and the value.",
      },
      {
        prompt:
          "Set a contains 1, 2, 3 and set b contains 2, 3, 4. What does a & b contain?",
        options: ["{1, 2, 3, 4}", "{2, 3}", "{1, 4}", "{1, 2, 3}"],
        answer: 1,
        explanation:
          "The & operator keeps only the values that appear in both sets, which are 2 and 3.",
      },
      {
        prompt: "What is printed?",
        code: 'data = {"scores": [10, 20, 30]}\ndata["scores"].append(40)\nprint(data["scores"][-1])',
        options: ["10", "30", "40", "Error"],
        answer: 2,
        explanation:
          "append grows the list stored under the key, and -1 then reads its last item, 40.",
      },
      {
        prompt:
          "This runs: a = [1, 2], then b = a, then b.append(3). What is a now?",
        options: ["[1, 2]", "[1, 2, 3]", "[3]", "Its value is undefined"],
        answer: 1,
        explanation:
          "b = a copies the reference rather than the list, so one append is visible through both names.",
      },
    ],
  },
  {
    id: "py-project",
    title: "Build a small program",
    summary:
      "Combine input, validation, errors and functions into one working program.",
    theory: [
      {
        title: "Reading input and converting it",
        body: 'input() pauses the program, shows an optional prompt, and returns whatever the user typed as text. It is always a string, even when the user typed 42, so comparing it with a number or adding it to one fails. Type conversion fixes that: int(text) produces a whole number, float(text) produces a decimal number, and str(value) travels the other way. Conversion only succeeds when the text really looks like a number, so int("42") works while int("forty two") raises ValueError and stops the program unless something catches it. f-strings then format the result for a reader, replacing each pair of braces with the value of the expression inside, so you never glue strings together by hand. A small program is therefore three steps: read text with input(), convert it to the type you need, and print a sentence built with an f-string. Keeping the steps separate makes it obvious which one failed when the output looks wrong.',
        code: 'text = input("How old are you? ")\nage = int(text)\nprint(f"Next year you will be {age + 1}.")',
      },
      {
        title: "Validating what arrives",
        body: "Users type unexpected things, so a program that trusts input breaks as soon as someone presses Enter too early. Validation means checking the text before you use it. strip() removes surrounding spaces so a stray space does not count as content, isdigit() returns True only when every character is a digit, and a chained comparison such as 1 <= age <= 120 rejects values outside a sensible range. A validator decides what is acceptable and reports a clear message when a rule fails instead of crashing. For repeated input, a while loop that keeps asking until the value is valid is the usual shape, because a single if handles only one attempt. The order matters: read, validate, then convert. Converting first and hoping for the best defeats the purpose, since conversion is exactly the step that fails on bad text. Messages matter too, because telling the user what the program expects is far more useful than a generic complaint.",
        code: 'text = input("Level (1-10): ").strip()\nif text.isdigit() and 1 <= int(text) <= 10:\n    level = int(text)\nelse:\n    print("Enter a number from 1 to 10.")',
      },
      {
        title: "Try, except and a menu loop",
        body: "Errors are not always preventable, so Python offers try and except for the ones you can predict. Code inside the try block runs normally; if it raises an exception that a matching except names, the program jumps there instead of stopping. Wrapping int(text) in try and catching ValueError is the standard way to survive bad number text, and catching ZeroDivisionError protects a division. Name the exception you expect, because a bare except catches everything, including typos in your own code, and hides the real bug. An except can be paired with else, which runs when no exception happened, and finally, which always runs. A menu loop ties the pieces together: show the options, read a choice, validate it, call a function for that action, and break when the user asks to quit. Each action lives in its own function so the loop stays short and the program is easy to extend.",
        code: 'while True:\n    choice = input("Choose 1-3 or q to quit: ")\n    if choice == "q":\n        break\n    try:\n        action = int(choice)\n    except ValueError:\n        print("Please type a number.")\n        continue\n    print(f"You chose {action}.")',
      },
    ],
    tasks: [
      {
        prompt:
          "The user types 42 when the program calls input(). What type is the value the program receives?",
        options: ["int", "str", "float", "bool"],
        answer: 1,
        explanation:
          'input() always returns text, so the program holds the string "42" and must convert it before any arithmetic.',
      },
      {
        prompt:
          "The variable raw holds text typed by the user. Which expression turns it into a whole number?",
        options: ["int(raw)", "str(raw)", "raw.int()", "number(raw)"],
        answer: 0,
        explanation:
          "int() parses numeric text into an integer, while str() goes the other direction and the other two names do not exist.",
      },
      {
        prompt: "Which line prints Total: 12 when total holds 12?",
        options: [
          'print(f"Total: {total}")',
          'print("Total: {total}")',
          'print(f"Total: total")',
          'print("Total: " + total)',
        ],
        answer: 0,
        explanation:
          "Only the f-string replaces the braces with the value; the last option raises TypeError by adding text to a number.",
      },
      {
        prompt: 'What happens when int("abc") runs?',
        options: [
          "It returns 0",
          "It returns None",
          "It raises ValueError",
          "It prints a warning and continues",
        ],
        answer: 2,
        explanation:
          "int() cannot read letters as a number, so it raises ValueError, the error a validation block should catch.",
      },
      {
        prompt:
          "Why check text.isdigit() before calling int(text) on user input?",
        options: [
          "It converts the text into a number",
          "It returns True only when every character is a digit, so bad text is rejected before conversion",
          "It removes spaces from the text",
          "It raises ValueError for you",
        ],
        answer: 1,
        explanation:
          "Checking first keeps the program in control of the message instead of letting the conversion end the run.",
      },
      {
        prompt: "The user types 7 when asked. What is printed?",
        code: 'while True:\n    text = input("Number: ")\n    if text.isdigit():\n        break\nprint(int(text) * 2)',
        options: ["7", "14", "77", "Error"],
        answer: 1,
        explanation:
          "isdigit() accepts 7, break leaves the loop, and the stored text is then converted and doubled.",
      },
      {
        prompt:
          "You want a menu to keep appearing until the user chooses 0. Which loop shape fits?",
        options: [
          "while True: ... if choice == 0: break",
          "for choice in range(0): ...",
          "if choice == 0: ... break",
          "while False: ...",
        ],
        answer: 0,
        explanation:
          "while True repeats without a counter, and the break inside handles the quit choice.",
      },
      {
        prompt: "What is printed?",
        code: 'try:\n    n = int("12a")\nexcept ValueError:\n    print("bad")\nelse:\n    print("ok")',
        options: ["ok", "bad", "Nothing", "12"],
        answer: 1,
        explanation:
          'int("12a") raises ValueError, so the except block runs and the else block is skipped.',
      },
      {
        prompt: "What is printed?",
        code: 'def ask_age(text):\n    if not text.isdigit():\n        return None\n    return int(text)\n\nprint(ask_age("x") is None)',
        options: ["True", "False", "None", "Error"],
        answer: 0,
        explanation:
          'The text "x" is not all digits, so the function returns None early and the comparison is True.',
      },
      {
        prompt: "Why is a bare except with no exception name risky?",
        options: [
          "It is a syntax error",
          "It catches every exception, including mistakes in your own code, so real bugs stay hidden",
          "It only works inside a function",
          "It runs the try block twice",
        ],
        answer: 1,
        explanation:
          "A named exception documents what you expect, while a bare except also swallows typos and genuine errors you should fix.",
      },
    ],
  },
];

export const extras: Record<string, LessonExtras> = {
  "py-basics": {
    objectives: [
      "By the end you can print text and numbers and explain why the two behave differently.",
      "By the end you can choose a readable variable name and convert a value between str, int and float.",
      "By the end you can format a line of output with an f-string instead of gluing strings with +.",
    ],
    terms: [
      {
        term: "Binding",
        meaning:
          "A binding is the link an assignment creates between a name and the object the name refers to.",
      },
      {
        term: "Dynamic typing",
        meaning:
          "Dynamic typing means the value carries the type, so a name may hold a different type later without being redeclared.",
      },
      {
        term: "F-string",
        meaning:
          "An f-string is a text literal prefixed with f whose braces are replaced by the value of the expression inside.",
      },
      {
        term: "Type conversion",
        meaning:
          'Type conversion is the explicit act of building a new value of another type, as int("7") builds an integer from text.',
      },
    ],
    deepDive: {
      title: "What a variable really is",
      body: 'Now that printing and storing values feel routine, it helps to know what a variable actually does. Assignment binds a name to an object: level = 7 does not put 7 into a box called level, it makes the name point at an integer object that already exists. Rebinding with level = level + 1 creates a new object and points the name at it, leaving the old one untouched. That is why two names can share one object, and why a change made to a mutable value through one name is visible through the other. Python reads the type from the object, never from the name, so the same name can hold text today and a decimal number tomorrow; type(value) tells you what you have right now. Conversion is always explicit, so "7" + 1 raises TypeError because Python refuses to guess your intention. Floats need care as well, since 0.1 + 0.2 is not exactly 0.3. When output surprises you, print the value and its type side by side: most early bugs are a string where a number was expected, or the reverse.',
      code: 'level = 7\nprint(type(level))\nlevel = "seven"\nprint(type(level))',
    },
    pitfall:
      'A very common slip is adding a number to text, as in print("Score: " + score), which raises TypeError because Python will not convert the number for you. Beginners also reuse one name for two different types and then wonder why later arithmetic fails. Convert deliberately with str(), or let an f-string do the formatting, and the error disappears.',
    lab: {
      id: "py-basics-lab",
      title: "Print a player card",
      brief:
        "Create basics.py with two variables: name holding text and level holding a whole number. Then print one line that uses an f-string to include both values. The checks are a structure check on your code, so spacing and quote style do not matter.",
      file: "basics.py",
      starter:
        '# TODO: store a player name and a level, then print them in one f-string.\n# Replace the placeholder values below.\nname = "Player"\nlevel = 1',
      checks: [
        {
          label: "Creates a name variable holding text",
          test: (code) => /\bname\s*=\s*["']/.test(code),
        },
        {
          label: "Stores a whole number in a level variable",
          test: (code) => /\blevel\s*=\s*\d+/.test(code),
        },
        {
          label: "Prints a line with an f-string",
          test: (code) => /print\s*\(\s*f["']/.test(code),
        },
        {
          label: "One f-string inserts both name and level",
          test: (code) =>
            /f["'][^"'\n]*\{\s*name\s*\}[^"'\n]*\{\s*level\s*\}|f["'][^"'\n]*\{\s*level\s*\}[^"'\n]*\{\s*name\s*\}/.test(
              code,
            ),
        },
      ],
      hint: "The f-string starts with f before the quote, and every value you want to insert goes inside its own pair of curly braces.",
      explanation:
        "An f-string evaluates each expression inside braces and inserts the result, so fixed text and variables can share one readable line. Naming the two values before printing keeps the statement short and makes the program easy to extend.",
    },
  },
  "py-control": {
    objectives: [
      "By the end you can send a value down the right branch with if, elif and else.",
      "By the end you can repeat work with for and while and stop it deliberately with break.",
      "By the end you can predict how many times a loop runs before you run it.",
    ],
    terms: [
      {
        term: "Condition",
        meaning:
          "A condition is any expression that Python reduces to true or false to decide whether a block runs.",
      },
      {
        term: "Iteration",
        meaning:
          "An iteration is one complete pass through the body of a loop.",
      },
      {
        term: "Off-by-one error",
        meaning:
          "An off-by-one error is a result of stopping a range one item too early or one item too late.",
      },
      {
        term: "Infinite loop",
        meaning:
          "An infinite loop is a repetition whose condition never becomes false, so the program never moves on.",
      },
    ],
    deepDive: {
      title: "Loops as changing state",
      body: "The blocks you have just met are really about state changing over time. A while loop is a condition plus a body, and the body has to move the program closer to making that condition false; if it does not, the loop runs forever, which is the usual reason a program seems to freeze. Before writing the body, ask which variable the condition reads and which line changes it. A for loop hides that bookkeeping: range(start, stop, step) generates numbers on demand, and the stop value itself is never produced, so range(1, 5) yields 1 through 4. Iterating a string or a list visits values rather than indices, which is usually what you want. break leaves the whole loop, continue skips only the rest of the current round, and both express intent more clearly than a flag variable. A loop may also carry an else block that runs only when no break happened, which is handy for search code. When loops nest, remember that the inner loop finishes completely for every single step of the outer one, so the work multiplies fast.",
      code: 'for n in range(1, 6):\n    if n == 4:\n        break\n    print(n)\nelse:\n    print("no break")',
    },
    pitfall:
      "Forgetting to update the variable a while condition reads creates an infinite loop, so the page seems to hang. Beginners also expect range(1, 5) to include 5. Write down the first and last value of a loop before running it, and make sure the body changes whatever the condition tests.",
    lab: {
      id: "py-control-lab",
      title: "Total the even numbers",
      brief:
        "Write control.py that loops over the numbers 1 to 10, tests each one with if and the modulo operator, and prints only the even ones. Keep a running total in a variable named total and print it with an f-string. This is a structure check on the code you write, not a recording of its output.",
      file: "control.py",
      starter:
        "# TODO: loop over 1 to 10, print the even numbers and add them to a total.\ntotal = 0",
      checks: [
        {
          label: "Loops over a range with for",
          test: (code) => /for\s+[A-Za-z_]\w*\s+in\s+range\s*\(/.test(code),
        },
        {
          label: "Tests each number with an if condition",
          test: (code) => /if\s+[^\n:]+:/.test(code),
        },
        {
          label: "Tests parity with the modulo operator",
          test: (code) => /%\s*2\s*[!=]=\s*0/.test(code),
        },
        {
          label: "Adds each matching number to a running total",
          test: (code) => /\b[A-Za-z_]\w*\s*\+=\s*[A-Za-z_]\w*/.test(code),
        },
        {
          label: "Prints the total with an f-string",
          test: (code) =>
            /print\s*\(\s*f["'][^"'\n]*\{\s*total\s*\}/.test(code),
        },
      ],
      hint: "A number is even when the remainder after dividing by 2 is 0, and the accumulation belongs inside the same if block that prints.",
      explanation:
        "The loop creates each number, the condition filters it, and the total carries state from one round to the next. Keeping the update inside the if block is what makes the total match the numbers printed.",
    },
  },
  "py-functions": {
    objectives: [
      "By the end you can define a function with parameters and send a value back with return.",
      "By the end you can explain why a function that returns is easier to test than one that only prints.",
      "By the end you can split a long block of code into small functions with clear names.",
    ],
    terms: [
      {
        term: "Parameter",
        meaning:
          "A parameter is the name listed in a function definition that receives a value when the function is called.",
      },
      {
        term: "Argument",
        meaning:
          "An argument is the actual value supplied to a function at the moment it is called.",
      },
      {
        term: "Return value",
        meaning:
          "A return value is the result a function hands back to the code that called it.",
      },
      {
        term: "Scope",
        meaning:
          "Scope is the region of a program where a name can be used, which for a parameter is only its own function body.",
      },
    ],
    deepDive: {
      title: "Functions as contracts",
      body: "The three blocks above describe the parts; the useful mental model is that a function is a contract. Its name says what it does, its parameters say what it needs, and its return value says what the caller receives. print is not a return: printing shows a value to a human, returning hands it to the program, so a function that only prints cannot be dropped into an expression. Parameters are local names, which is why the same parameter name in two functions never clashes; arguments are the values you pass in. Defaults make optional behaviour easy, but they are evaluated once when the function is defined, so never use a list or a dictionary as a default and then append to it, because every call would share that one object. Aim for functions that take input, return a result and leave global state alone: those are easy to test and reason about. Small functions compose, so the program reads like a list of steps. When a function grows past roughly one screen, look for the piece that deserves its own name.",
      code: "def total(scores):\n    return sum(scores)\n\nprint(total([4, 6]))  # 10",
    },
    pitfall:
      "Getting None back usually means print was used where return was intended, or the return statement sits inside a branch that never ran. Another trap is a list used as a default parameter, which then collects values across every call. Return from the normal path, and use None as a default only when the function must not keep anything.",
    lab: {
      id: "py-functions-lab",
      title: "Average with a guard",
      brief:
        "Write functions.py with a function named average that takes one list of numbers and returns their mean. Return 0 when the list is empty so the division never runs on zero items, then call the function and print the result with an f-string. The checks read the structure of your code only.",
      file: "functions.py",
      starter:
        "# TODO: define average(numbers) that returns the mean, then print a call to it.\ndef average(numbers):\n    return 0",
      checks: [
        {
          label: "Defines a function named average with one parameter",
          test: (code) =>
            /def\s+average\s*\(\s*[A-Za-z_]\w*\s*\)\s*:/.test(code),
        },
        {
          label: "Returns a value from inside the function",
          test: (code) => /return\s+[^\n]+/.test(code),
        },
        {
          label: "Handles an empty list before dividing",
          test: (code) =>
            /if\s+(not\s+[A-Za-z_]\w*|len\s*\(\s*[A-Za-z_]\w*\s*\)\s*==\s*0)\s*:/.test(
              code,
            ),
        },
        {
          label: "Divides a total by the number of items",
          test: (code) =>
            /sum\s*\([^)]*\)\s*\/\s*len\s*\(|\/\s*len\s*\(/.test(code),
        },
        {
          label: "Calls average and prints the result",
          test: (code) => /print\s*\([^\n]*average\s*\(/.test(code),
        },
      ],
      hint: "Put the guard before the division, and remember that len(numbers) is the count you divide by.",
      explanation:
        "A guard clause handles the awkward case first and lets the normal path stay a single readable expression. Returning a value instead of printing inside the function lets the caller decide how the result is shown.",
    },
  },
  "py-collections": {
    objectives: [
      "By the end you can pick a list, tuple, set or dict for a given job and say why it fits.",
      "By the end you can slice and index a sequence without off-by-one surprises.",
      "By the end you can loop over a dictionary and update its entries safely.",
    ],
    terms: [
      {
        term: "Mutable",
        meaning:
          "Mutable means the contents of a value can change in place after the value has been created.",
      },
      {
        term: "Hashable",
        meaning:
          "Hashable means a value has a stable hash, which is what allows it to be a dictionary key or a set member.",
      },
      {
        term: "Slice",
        meaning:
          "A slice is a new sequence copied from a start index up to but not including an end index.",
      },
      {
        term: "Shallow copy",
        meaning:
          "A shallow copy is a new outer collection that still shares the inner objects with the original.",
      },
    ],
    deepDive: {
      title: "Choosing the right collection",
      body: "Picking a collection is a design decision more than a syntax one. Ask three questions: does order matter, will the contents change, and do you find things by position or by name. A list answers position, a tuple locks a record, a set answers presence, and a dictionary answers identity. The difference is practical: checking membership in a list scans items one by one, while a set or a dictionary hashes the value and jumps almost straight to the answer, so large lookups belong in one of those. Copying hides its own trap. b = a creates a second name for the same list, while b = a[:] or list(a) creates a shallow copy whose items are still shared, which matters as soon as the list holds other lists. Methods differ too: sort changes a list in place and returns None, whereas sorted returns a new list and leaves the original alone. Dictionary keys must be hashable, so tuples qualify and lists do not. Real programs nest these types, for example a list of dictionaries, so read the brackets from the outside in.",
      code: 'rows = [{"name": "Ada", "score": 10}]\nrows[0]["score"] += 5\nprint(rows[0]["score"])  # 15',
    },
    pitfall:
      "Changing a list while looping over it skips items, because the indices shift underneath the loop. Copy the list with list(items) when you must remove entries, or build a new list instead. And remember that b = a never copies anything, so an update through b changes what a shows.",
    lab: {
      id: "py-collections-lab",
      title: "Track prices in a dictionary",
      brief:
        "Write collections.py that stores three fruit names and their prices in one dictionary literal. Add a fourth fruit by assigning to a new key, raise one existing price by 1, then loop over the dictionary with items() and print each fruit and price with an f-string. The checks verify the structure of the code rather than running it.",
      file: "collections.py",
      starter:
        "# TODO: build a price dictionary, add one fruit, raise one price, print every pair.\nprices = {}",
      checks: [
        {
          label: "Builds a dictionary with key-value entries",
          test: (code) => /\w+\s*=\s*\{[^{}]*:\s*[^,{}]+[,}]/.test(code),
        },
        {
          label: "Adds a new entry by assigning to a quoted key",
          test: (code) => /\[\s*["'][^"']+["']\s*\]\s*=\s*[^=\s]/.test(code),
        },
        {
          label: "Raises an existing price with +=",
          test: (code) => /\[\s*["'][^"']+["']\s*\]\s*\+=\s*[\d.]+/.test(code),
        },
        {
          label: "Loops over the pairs with items()",
          test: (code) =>
            /for\s+[A-Za-z_]\w*\s*,\s*[A-Za-z_]\w*\s+in\s+[A-Za-z_]\w*\s*\.\s*items\s*\(\s*\)/.test(
              code,
            ),
        },
        {
          label: "Prints each pair with an f-string",
          test: (code) => /print\s*\(\s*f["'][^"'\n]*\{/.test(code),
        },
      ],
      hint: "Subscript assignment with a new key creates the entry, and += updates an existing one; items() gives you both halves in the loop.",
      explanation:
        "A dictionary is the right tool when each value needs a name instead of a position. Updating by key works for new and existing entries alike, and items() turns the mapping into pairs you can format.",
    },
  },
  "py-project": {
    objectives: [
      "By the end you can read input, convert it to the right type and print a formatted result.",
      "By the end you can reject bad input with a loop instead of letting the program crash.",
      "By the end you can organise a small program into functions with a menu loop.",
    ],
    terms: [
      {
        term: "Validation",
        meaning:
          "Validation is the check that decides whether a value is acceptable before the program uses it.",
      },
      {
        term: "Exception",
        meaning:
          'An exception is the object Python creates when an operation cannot complete, such as int("abc").',
      },
      {
        term: "Traceback",
        meaning:
          "A traceback is the report Python prints when an exception is not handled, listing the calls that led to it.",
      },
      {
        term: "Refactor",
        meaning:
          "Refactoring is rearranging working code into clearer pieces without changing what it does.",
      },
    ],
    deepDive: {
      title: "The shape of a finished program",
      body: "A finished program is more than correct lines; it has a shape. The usual shape is a few small functions that do pure work, one function that talks to the user, and a starting point that calls it. Keeping input and printing in one place means the logic can be tested without a keyboard, and it keeps the validation rules from scattering across the file. Validation should fail fast and say why: check a value as soon as it arrives, and never continue with a half-valid value. try and except belong at the boundary where bad input enters, not around the whole program, because a wide try block makes it impossible to tell which step broke. Whenever you catch an exception, either repair the situation, ask again, or explain it in words a user understands. Menus stay readable when each choice maps to a function and the loop only decides what to call next. Finally, walk through the unhappy paths on purpose: empty input, letters where numbers belong, zero, and the quit option.",
      code: 'def read_number(prompt):\n    while True:\n        text = input(prompt)\n        try:\n            return int(text)\n        except ValueError:\n            print("Numbers only, please.")',
    },
    pitfall:
      "Catching every error with a bare except hides typos and logic mistakes, because the handler runs for problems you never expected. Catch ValueError or ZeroDivisionError by name, and print a message that tells the user what to do next. A handler that silently continues is worse than an honest crash during development.",
    lab: {
      id: "py-project-lab",
      title: "Ask again until the number is valid",
      brief:
        "Write project.py that asks the user for a whole number and keeps asking until the text can be converted. Use input() for reading, int() inside try, and except ValueError to print a friendly message, all inside a function that returns the number. Then print the square of that number with an f-string; the checks are a structure check on your code.",
      file: "project.py",
      starter:
        "# TODO: write a function that asks until int(text) succeeds, then print its square.\ndef ask_number():\n    pass",
      checks: [
        {
          label: "Calls input() to read from the user",
          test: (code) => /input\s*\(/.test(code),
        },
        {
          label: "Converts text with int() inside a try block",
          test: (code) => /try\s*:[\s\S]*?int\s*\(/.test(code),
        },
        {
          label: "Catches ValueError specifically",
          test: (code) => /except\s+ValueError\s*:/.test(code),
        },
        {
          label: "Keeps asking inside a while loop",
          test: (code) => /while\s+[^\n]*:/.test(code),
        },
        {
          label: "Prints the result with an f-string",
          test: (code) => /print\s*\(\s*f["']/.test(code),
        },
      ],
      hint: "Return the converted number from inside the try block; the loop only repeats when ValueError sends control to the matching except.",
      explanation:
        "Retrying inside the function keeps the validation loop in one place instead of spreading it across the program. Catching ValueError by name means only conversion failures are retried while genuine bugs still surface.",
    },
  },
};

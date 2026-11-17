import type { Lesson, LessonExtras } from "../curriculum";

export const newLessons: Lesson[] = [
  {
    id: "cpp-structs",
    title: "Structs & classes",
    summary:
      "Group data and behaviour with structs, classes, constructors and access control.",
    theory: [
      {
        title: "Grouping data with struct",
        body: "A struct is a way to define your own type by grouping named values. Each value inside the definition is called a member, or field, and every object you create from the struct gets its own copy of those members. Write the keyword struct, a name, and a body in braces followed by a semicolon. Everything declared inside is a member of that new type. In a struct, members are public by default, which means any code that can see the object may read or change them. A class is the same idea with one difference: its members are private by default, so only the class's own functions may touch them. Access control is the rule that decides who may use a member, and the labels public and private switch that rule on for everything below them. Most C++ guides use struct for small bundles of data and class for types that protect their state, but the compiler treats both as class types.",
        code: "struct Point {\n    int x;\n    int y;\n};\n\nclass Player {\n    int score;   // private by default\npublic:\n    int scoreValue() const { return score; }\n};",
      },
      {
        title: "Constructors set up an object",
        body: "A constructor is a special member function that runs automatically when an object is created. It has the same name as the type and no return type, not even void. Its job is to put the object into a valid starting state. The member initializer list is the part after the colon: it names each member and the value used to build it. Members are built in the order they are declared, not the order you list them, so keep the list in declaration order to avoid confusion. A member function is a function declared inside the type. You call it with dot notation, such as counter.add(2), and it works on that particular object. Inside a member function the members are in scope directly, so you may write value instead of this->value. Constructors can take parameters, which lets each object start with different data, and a type may offer more than one constructor as long as their parameter lists differ.",
        code: "class Counter {\npublic:\n    Counter(int start) : value(start) {}\n    void add(int n) { value += n; }\n    int get() const { return value; }\nprivate:\n    int value;\n};",
      },
      {
        title: "const methods and this",
        body: "Marking a member function const promises that calling it will not change the object. The keyword goes after the parameter list, as in int get() const. A const member function may read members but not assign to them, and it is the only kind of member function you may call on an object declared const. This is why getters, which only report a value, are usually const, while setters and mutators, which change state, are not. The compiler enforces the promise, so an accidental assignment inside a const function becomes a compile error instead of a silent bug. Inside every non-static member function there is a hidden pointer called this that points at the object the function was called on. Writing this->value is the same as writing value, and this helps when a parameter shares a name with a member: this->value = value copies the argument into the member. Access control, constructors and const all exist to keep an object's state predictable.",
        code: "struct Wallet {\n    int coins = 0;\n    void add(int coins) { this->coins += coins; }\n    int balance() const { return coins; }\n};",
      },
    ],
    tasks: [
      {
        prompt: "What is the default access level for members of a struct?",
        options: [
          "public",
          "private",
          "protected",
          "It depends on the member type",
        ],
        answer: 0,
        explanation:
          "A struct keeps its members public unless you add an access label, so any code that can see the object may use them.",
      },
      {
        prompt:
          "A class declares int hp; before any access label. Which code may read hp directly?",
        options: [
          "Any function in the same file",
          "Only member functions of that class",
          "Only main",
          "Any code that includes the header",
        ],
        answer: 1,
        explanation:
          "In a class, members are private by default, so only the class's own member functions may touch them.",
      },
      {
        prompt:
          "Which line creates one object of type Point, which is defined above?",
        code: "struct Point {\n    int x;\n    int y;\n};",
        options: ["Point p;", "Point p();", "p Point;", "new Point p;"],
        answer: 0,
        explanation:
          "Point p; builds one object on the stack. Point p(); would declare a function named p that returns a Point.",
      },
      {
        prompt:
          "Player has a private int member named hp. Which constructor receives a starting value and stores it in hp?",
        options: [
          "Player(int start) : hp(start) {}",
          "void Player(int start) { hp = start; }",
          "Player(int start) { return hp; }",
          "public Player(int start) : hp(start) {}",
        ],
        answer: 0,
        explanation:
          "A constructor has no return type and uses the member initializer list after the colon to build hp from the argument.",
      },
      {
        prompt: "What does marking a member function const promise?",
        options: [
          "It will not modify the object's members",
          "It always returns the same value",
          "It can be called only once per object",
          "It hides the members from other functions",
        ],
        answer: 0,
        explanation:
          "The compiler rejects any assignment to a member inside a const function, so callers can rely on the object staying unchanged.",
      },
      {
        prompt: "Inside a member function, what does this point to?",
        options: [
          "The object the function was called on",
          "The class definition",
          "A copy of the object",
          "The most recently created object of that type",
        ],
        answer: 0,
        explanation:
          "this is a hidden pointer to the current object, which is why this->value and value name the same member.",
      },
      {
        prompt:
          "A class stores int hp privately and provides int hpLeft() const and void heal(int n). The object is declared const Player p;. Which call compiles?",
        options: ["p.hpLeft()", "p.heal(5)", "p.hp", "p.hp = 10"],
        answer: 0,
        explanation:
          "A const object allows only const member functions, and hpLeft is the only one marked const.",
      },
      {
        prompt: "What is printed?",
        code: "struct Counter {\n    int value;\n    Counter(int start) : value(start) {}\n    void add(int n) { value += n; }\n};\n\nint main() {\n    Counter c(2);\n    c.add(3);\n    cout << c.value;\n}",
        options: ["2", "3", "5", "23"],
        answer: 2,
        explanation:
          "The constructor starts value at 2, and add(3) increases it to 5.",
      },
      {
        prompt:
          "Why is the member initializer list, as in : value(start), usually better than assigning inside the constructor body?",
        options: [
          "It builds each member directly with the value instead of default-constructing it first",
          "It makes the member public",
          "It removes the need for a constructor",
          "It copies the object twice as fast",
        ],
        answer: 0,
        explanation:
          "Members listed after the colon are constructed once with the given value, and some members, such as const ones, can only be set that way.",
      },
      {
        prompt: "What happens when this struct is compiled?",
        code: "struct Box {\n    int size;\n    int grow() const {\n        size += 1;\n        return size;\n    }\n};",
        options: [
          "It compiles and grow returns 1",
          "A compile error: a const function modifies size",
          "It compiles but grow returns 0",
          "A runtime error when grow is called",
        ],
        answer: 1,
        explanation:
          "A const member function may not assign to members, so the compiler rejects size += 1.",
      },
    ],
  },
  {
    id: "cpp-stl",
    title: "The STL",
    summary:
      "Use vector, map, set and standard algorithms instead of hand-written loops.",
    theory: [
      {
        title: "Containers hold your data",
        body: "The standard template library, usually shortened to the STL, is the part of C++ that ships ready-made containers and algorithms. A container is a type that stores a collection of other values, and the element type goes in angle brackets, so vector<int> is a vector of ints. A vector is a resizable array: push_back appends an item, size() reports how many items it holds, and square brackets read an item by index starting at 0. A map stores key-value pairs sorted by key, so map<string, int> can hold a score per player name. A set stores unique values in sorted order, so inserting the same number twice leaves one copy. Each container lives in its own header: vector, map and set. A range-based loop such as for (int n : nums) visits every element in order without an index. Containers allocate their storage on the heap, so they can grow at runtime, and they free that memory when they go out of scope.",
        code: '#include <vector>\n#include <map>\n#include <set>\n#include <string>\n\nstd::vector<int> scores = {10, 20};\nstd::map<std::string, int> levels = {{"Ada", 3}};\nstd::set<int> ids = {4, 5, 4};   // holds 4 and 5',
      },
      {
        title: "Algorithms and iterators",
        body: "The algorithm header provides functions that work on ranges of elements. A range is described by two iterators: a beginning position and an end position. An iterator is a small object that marks a place in a container and can move to the next place, much like an index that knows about its container. The range is half-open, meaning it includes begin() but stops before end(). The call sort(nums.begin(), nums.end()) arranges a vector from smallest to largest, and count_if(begin, end, predicate) counts the elements for which the predicate returns true. A predicate here is just a function or lambda that takes one element and returns a bool, so [](int s) { return s >= 10; } is an unnamed function checking a threshold. Algorithms do not know about vectors specifically: they only use iterators, so the same sort call also works on a plain array or a deque. Expressing a loop as an algorithm usually removes the bookkeeping that causes off-by-one errors.",
        code: "#include <algorithm>\n#include <vector>\n\nstd::vector<int> scores = {30, 10, 20};\nstd::sort(scores.begin(), scores.end());\nint high = std::count_if(scores.begin(), scores.end(),\n                         [](int s) { return s >= 20; });",
      },
      {
        title: "Looking up keys in a map",
        body: 'A map keeps its elements ordered by key and offers fast lookup, so you rarely need to search the whole container yourself. insert takes a pair and adds it only when the key is not already present, which makes it safe for data you do not want to overwrite. The operator[] is different: writing levels["Ada"] creates the entry with a default value if the key is missing, then returns a reference to the value, so it can silently add keys, and on a const map it does not compile at all. find returns an iterator to the matching element, or end() when nothing matches, so comparing against end() is the standard test. count reports how many elements match a key: 0 or 1 for a map or set, because keys are unique. Once you have an iterator, it->first is the key and it->second is the value. Looking up with find before touching a value avoids inventing default entries by accident.',
        code: 'std::map<std::string, int> levels = {{"Ada", 3}};\nlevels.insert({"Grace", 5});\n\nauto it = levels.find("Ada");\nif (it != levels.end()) {\n    std::cout << it->first << " " << it->second << std::endl;\n}\nstd::cout << levels.count("Zoe") << std::endl;   // 0',
      },
    ],
    tasks: [
      {
        prompt: "Which header declares std::map?",
        options: ["<map>", "<dictionary>", "<unordered>", "<table>"],
        answer: 0,
        explanation:
          "Each standard container lives in a header with the same name, so map comes from the map header.",
      },
      {
        prompt: "What is printed?",
        code: "vector<int> scores;\nscores.push_back(4);\nscores.push_back(9);\ncout << scores.size();",
        options: ["1", "2", "4", "9"],
        answer: 1,
        explanation:
          "size() reports how many elements the vector holds, and the two push_back calls added two.",
      },
      {
        prompt: "Which expression reads the third element of vector<int> nums?",
        options: ["nums[3]", "nums[2]", "nums(2)", "nums.at(3)"],
        answer: 1,
        explanation: "Indices start at 0, so the third element has index 2.",
      },
      {
        prompt:
          "nums is a vector<int>. Which loop doubles every element inside nums?",
        options: [
          "for (int& n : nums) { n *= 2; }",
          "for (int n : nums) { n *= 2; }",
          "for (int n : nums) { nums[n] *= 2; }",
          "for (auto n : nums) { n = n * 2; }",
        ],
        answer: 0,
        explanation:
          "A reference in a range-based loop binds to the actual element, while a plain int receives a copy that disappears each round.",
      },
      {
        prompt:
          "levels is a map<string, int>. Which call inserts Grace with value 5 and leaves an existing Grace value untouched?",
        options: [
          'levels.insert({"Grace", 5});',
          'levels["Grace"] = 5;',
          'levels.emplace_back("Grace", 5);',
          'levels.append("Grace", 5);',
        ],
        answer: 0,
        explanation:
          "insert does nothing when the key already exists, while operator[] overwrites the old value.",
      },
      {
        prompt:
          'levels.count("Zoe") returns 0. What does that result tell you?',
        options: [
          "No element has the key Zoe",
          "Zoe maps to the value 0",
          "The map is empty",
          "Zoe is stored at index 0",
        ],
        answer: 0,
        explanation:
          "count reports how many elements match the key, and map keys are unique, so 0 means the key is absent.",
      },
      {
        prompt: "What number does ids.size() produce here?",
        code: "set<int> ids = {4, 5, 4};\nids.insert(5);\ncout << ids.size();",
        options: ["2", "3", "4", "5"],
        answer: 0,
        explanation:
          "A set keeps each value once, so the duplicate 4 and the repeated 5 leave only 4 and 5.",
      },
      {
        prompt:
          "scores holds {30, 10, 20}. What order does sort(scores.begin(), scores.end()) produce?",
        options: [
          "10, 20, 30",
          "30, 20, 10",
          "10, 30, 20",
          "The order never changes",
        ],
        answer: 0,
        explanation:
          "sort without a second argument orders elements with <, which is ascending for ints.",
      },
      {
        prompt:
          "count_if is called on the values {12, 5, 20, 8} with the predicate [](int s) { return s >= 10; }. What does it return?",
        options: ["1", "2", "3", "4"],
        answer: 1,
        explanation:
          "The predicate is true for 12 and 20 only, and count_if returns how many elements passed the test.",
      },
      {
        prompt:
          "it is a valid iterator into map<string, int>, obtained from find. Which expression reads the value stored at it?",
        options: ["it->second", "it->value", "*it.first", "it[1]"],
        answer: 0,
        explanation:
          "A map iterator points at a pair whose first member is the key and whose second member is the value.",
      },
    ],
  },
];

export const extras: Record<string, LessonExtras> = {
  "cpp-basics": {
    objectives: [
      "Build a complete program with the iostream header and an int main.",
      "Declare int, double, char and bool variables with starting values.",
      "Print several values in one statement with cout and endl.",
    ],
    terms: [
      {
        term: "Header",
        meaning:
          "A file such as iostream that declares names the compiler needs before your own code can use them.",
      },
      {
        term: "main",
        meaning:
          "The function where every C++ program starts, returning an int status code to the operating system.",
      },
      {
        term: "Variable",
        meaning:
          "A named box of a fixed type that stores a value you can read or change.",
      },
      {
        term: "endl",
        meaning:
          "A stream manipulator that writes a newline and flushes the output buffer.",
      },
    ],
    deepDive: {
      title: "Deep dive: from source to program",
      body: "Before anything runs, your file passes through three stages. The preprocessor handles lines that start with a hash, so include literally copies the contents of a header such as iostream into your file. The compiler then turns that expanded text into an object file, checking types as it goes; a type error stops the build here, before any program exists. Finally the linker joins your object file with the compiled standard library to produce an executable. That is why a missing header is a compile error while a missing function definition is usually a link error, and the two messages look different. The types you choose describe how many bytes each value occupies: int is typically four bytes, double is eight and holds a decimal, char is a single character, and bool is true or false. A variable is a named box of that size, and its type tells the compiler how to read the bits inside. cout uses that same type to decide how to format each value, so an int prints as digits while a char prints as a letter.",
    },
    pitfall:
      "Beginners often forget the semicolon at the end of a statement, then chase an error reported on the following line. Another common slip is writing cout without including iostream or without using namespace std, which turns the name into an unknown identifier. Read the first error message first, because later errors are usually fallout from the first one.",
    lab: {
      id: "cpp-basics-lab",
      title: "Print a typed player profile",
      brief:
        "Inside main, declare a string called name, an int called level and a double called price, then read all three from std::cin in that order: the name first, the level second, the price third. Print each value on its own line with cout and endl, so the name, the number and the price come out one per line. Include iostream for cin and cout and string for the name, and keep the usual int main skeleton. Your program is executed against more than one input, and every printed line must match exactly.",
      file: "basics.cpp",
      starter:
        "#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string name;\n    int level = 0;\n    double price = 0.0;\n\n    // TODO: read name, level and price from cin, then print each value\n    // on its own line with cout and endl.\n    cout << name << endl;\n    return 0;\n}",
      tests: [
        {
          label: "Input Ada / 3 / 4.5 prints three lines",
          stdin: "Ada\n3\n4.5\n",
          expectedStdout: "Ada\n3\n4.5",
        },
        {
          label: "Input Grace / 12 / 19.99 prints three lines",
          stdin: "Grace\n12\n19.99\n",
          expectedStdout: "Grace\n12\n19.99",
        },
      ],
      hint: "One statement such as cin >> name >> level >> price fills all three variables, and each cout statement sends one value to its own line with endl.",
      explanation:
        "Each declaration reserves a box of the named type and cin fills those boxes from the input in the order you list them. cout uses the type to format the value, so the int prints as digits while the double keeps its decimal digits, and endl finishes the line so the next print starts fresh.",
    },
  },
  "cpp-control": {
    objectives: [
      "Write an if / else if / else chain that prints exactly one message.",
      "Repeat work with a for loop whose counter you control.",
      "Explain when break and continue change a loop's behaviour.",
    ],
    terms: [
      {
        term: "Condition",
        meaning:
          "An expression that evaluates to true or false and decides which branch runs.",
      },
      {
        term: "Loop body",
        meaning:
          "The block of statements that repeats on every round of a loop.",
      },
      {
        term: "break",
        meaning:
          "A statement that leaves the nearest enclosing loop or switch immediately.",
      },
      {
        term: "continue",
        meaning:
          "A statement that skips the rest of the current round and starts the next one.",
      },
    ],
    deepDive: {
      title: "Deep dive: how conditions and loops really run",
      body: "Conditions are evaluated top to bottom and stop at the first true branch, which is why the order of an if / else if chain matters: a broad check placed first hides every narrower one below it. The operators && and || short-circuit, meaning the right side is not evaluated at all when the left side already decides the result. Code such as if (count != 0 && total / count > 2) is therefore safe, while swapping the two tests would divide by zero. Each loop introduces a scope, so a counter declared in the for header exists only inside that loop and disappears when the loop ends. A while loop is the better tool when the number of rounds is unknown and the condition depends on data, while a for loop documents a counter you control. break leaves the nearest enclosing loop or switch, and continue jumps to the next round while skipping the rest of the body. Neither should jump across two levels: reach for a helper function instead, because nested breaks are hard to read.",
    },
    pitfall:
      "A classic mistake is writing if (x = 5) when you meant ==, which assigns 5 and is always true. Compilers warn about this, so read the warning instead of silencing it. Another is forgetting that a while loop needs something inside to change the condition, otherwise it never ends.",
    lab: {
      id: "cpp-control-lab",
      title: "Print even and odd numbers",
      brief:
        "Read two whole numbers from std::cin: a start and an end. Write a for loop that counts from start to end, including both ends. Inside the loop use if / else to print whether the current number is even or odd, for example 2 even, one line per number, finishing every line with endl. Include iostream and keep the work inside main. Your program is executed with different ranges, so the loop must really use the two numbers it reads.",
      file: "control.cpp",
      starter:
        "#include <iostream>\nusing namespace std;\n\nint main() {\n    int start = 0;\n    int end = 0;\n    cin >> start >> end;\n\n    // TODO: loop from start to end and print whether each number is even or odd.\n    return 0;\n}",
      tests: [
        {
          label: "Range 1 to 5 labels every number",
          stdin: "1 5\n",
          expectedStdout: "1 odd\n2 even\n3 odd\n4 even\n5 odd",
        },
        {
          label: "Range 6 to 9 starts on an even number",
          stdin: "6 9\n",
          expectedStdout: "6 even\n7 odd\n8 even\n9 odd",
        },
      ],
      hint: "A counter from start to end gives you each number; the remainder operator % tells you whether it divides evenly by 2, and the else branch handles the rest.",
      explanation:
        "The loop supplies each number in turn, and the if / else decides which message fits it. Only one branch runs per round, so every number produces exactly one line, and the count depends on the range you read rather than a fixed list.",
    },
  },
  "cpp-functions": {
    objectives: [
      "Declare a function with a return type, a name and two parameters.",
      "Return a value and use it at the call site inside cout.",
      "Contrast a value parameter with a reference parameter.",
    ],
    terms: [
      {
        term: "Parameter",
        meaning:
          "A named input in a function's definition that receives a value on each call.",
      },
      {
        term: "Argument",
        meaning:
          "The actual value or variable you pass when you call a function.",
      },
      {
        term: "Return type",
        meaning:
          "The type of value a function sends back to its caller, written before its name.",
      },
      {
        term: "void",
        meaning:
          "A return type meaning the function performs work but produces no value.",
      },
    ],
    deepDive: {
      title: "Deep dive: how a function call works",
      body: "A function definition gives the compiler a body to compile, while a declaration, which ends with a semicolon, only promises that the function exists somewhere and lets the linker resolve the name later. That split is why you can declare a helper at the top of a file and define it below main. When you call a function, C++ passes each argument by value unless the parameter says otherwise: the parameter is a new object built from a copy, so changing it leaves the caller's variable untouched. Adding an ampersand makes the parameter a reference, so the function works on the original object, and adding const in front keeps it read-only while still avoiding the copy. Each call gets its own stack frame holding the parameters and local variables, and the frame disappears when the function returns, which is why a pointer to a local must never escape. The return type is part of that contract: a non-void function must return a value on every path, while void promises nothing comes back.",
    },
    pitfall:
      "A frequent beginner mistake is declaring a function with a return type but forgetting the return statement, which the compiler reports as a missing return on some paths. Another is assuming the function changed the caller's variable when the parameter was passed by value. Add an ampersand to the parameter if the function must modify the original.",
    lab: {
      id: "cpp-functions-lab",
      title: "Write a sum function",
      brief:
        "Define a function called sum that takes two int parameters and returns their total. In main read two whole numbers from std::cin, call sum with them, and print the result with cout and endl. Include iostream and do the printing in main, not inside the function. Your program is executed with different pairs of numbers, so the sum must come from the values that were read.",
      file: "functions.cpp",
      starter:
        "#include <iostream>\nusing namespace std;\n\n// TODO: define a function that adds two ints and returns the total.\n\nint main() {\n    int a = 0;\n    int b = 0;\n    cin >> a >> b;\n\n    // TODO: call sum with a and b, then print the result with cout.\n    return 0;\n}",
      tests: [
        {
          label: "3 plus 4 prints 7",
          stdin: "3 4\n",
          expectedStdout: "7",
        },
        {
          label: "10 plus 25 prints 35",
          stdin: "10 25\n",
          expectedStdout: "35",
        },
      ],
      hint: "Two int parameters become two local boxes inside the function; return a + b sends their sum back to main, and cin >> a >> b fills the values before the call.",
      explanation:
        "A function turns a repeated calculation into one named step. main passes the values it read into it, the function returns the result, and the caller decides what to do with it, here printing it.",
    },
  },
  "cpp-structs": {
    objectives: [
      "Compare default access in a struct with default access in a class.",
      "Initialise members through a constructor's member initializer list.",
      "Mark read-only member functions const and call them on a const object.",
    ],
    terms: [
      {
        term: "Struct",
        meaning:
          "A type that groups named members and keeps them public by default.",
      },
      {
        term: "Constructor",
        meaning:
          "A member function with the type's name and no return type that runs when an object is created.",
      },
      {
        term: "Member function",
        meaning:
          "A function declared inside a type that works on one object of that type.",
      },
      {
        term: "const method",
        meaning:
          "A member function that promises not to modify the object and may be called on const objects.",
      },
    ],
    deepDive: {
      title: "Deep dive: objects as values",
      body: "A C++ object of a struct or class type is a value, not a reference. Writing Player b = a copies every member of a into b, and the two objects then live independent lives: changing b does not touch a, and destroying b leaves a alone. This is called value semantics, and it is the opposite of languages where a variable holds a pointer to a shared object. The copy is made member by member, in declaration order, which is cheap for a few ints but expensive for a large vector. Because copying can cost real time, functions usually take big objects by const reference, as in void print(const Player& p). The ampersand means the function borrows the caller's object, and const means it may only read it. A local object such as Player p inside a function normally lives on the stack, so it is destroyed automatically at the closing brace of its scope, and that automatic cleanup is one of C++'s main safety nets. Use struct when the members are meant to be read and written directly, and class when you want to protect an invariant behind member functions. Neither keyword changes performance: both compile to the same layout in memory.",
    },
    pitfall:
      "A common beginner mistake is forgetting the semicolon after the closing brace of a struct or class definition, which produces a confusing error on the next line. Another is putting const before the function name instead of after the parameter list. Read the definition as a whole: the type ends with a semicolon, and const describes the function after its parameters.",
    lab: {
      id: "cpp-structs-lab",
      title: "Model a score with a const getter",
      brief:
        "Define a struct called Score with an int member named points. Give it a constructor that takes a starting value and initialises points through the member initializer list, a const member function value() that returns points, and a member function add(int n) that increases points. In main read two whole numbers from std::cin, a starting score and a bonus. Create a Score from the starting score, print its value with cout and endl, call add with the bonus, then print the value again. Include iostream. Your program is executed with different pairs of numbers, so both printed lines must follow the input.",
      file: "structs.cpp",
      starter:
        "#include <iostream>\nusing namespace std;\n\n// TODO: define a Score type with an int points member, a constructor that\n// initialises it, a const value() getter and an add(int) mutator.\n\nint main() {\n    int start = 0;\n    int bonus = 0;\n    cin >> start >> bonus;\n\n    // TODO: create a Score, print value(), add the bonus, print value() again.\n    return 0;\n}",
      tests: [
        {
          label: "Start 42 with bonus 8 prints 42 then 50",
          stdin: "42 8\n",
          expectedStdout: "42\n50",
        },
        {
          label: "Start 7 with bonus 3 prints 7 then 10",
          stdin: "7 3\n",
          expectedStdout: "7\n10",
        },
      ],
      hint: "Put points after the colon in the constructor, write const after the empty parameter list of value(), and let add do points += n.",
      explanation:
        "The constructor builds points as soon as the object exists, so no object can start with garbage. The const on value() lets the getter be called on objects you promise not to change, while add is deliberately not const because it mutates points, and the two printed lines show the state before and after that change.",
    },
  },
  "cpp-stl": {
    objectives: [
      "Store values in a vector and visit them with size, indexing and a range-based loop.",
      "Look up and count keys in a map without inventing missing entries.",
      "Replace a counting loop with sort or count_if and explain the iterators involved.",
    ],
    terms: [
      {
        term: "Container",
        meaning:
          "A standard type such as vector, map or set that stores a collection of elements.",
      },
      {
        term: "Iterator",
        meaning:
          "A small object that marks a position in a container and can move to the next element.",
      },
      {
        term: "Algorithm",
        meaning:
          "A standard function from algorithm that works on an iterator range instead of one container type.",
      },
      {
        term: "Predicate",
        meaning:
          "A function or lambda that takes one element and returns true or false.",
      },
    ],
    deepDive: {
      title: "Deep dive: choosing a container",
      body: "Each STL container trades memory and speed differently, so the choice is a design decision, not a detail. A vector stores its elements in one contiguous block, which makes indexing instant and iteration cache-friendly, but push_back occasionally reallocates the whole block and copies everything when capacity runs out. That reallocation is also why an iterator or reference into a vector can be invalidated by a later push_back: hold indices, not pointers, if the vector may grow. A map is usually a balanced tree, so each element sits in its own node and lookups cost logarithmic time instead of constant time; it keeps keys sorted, which is what you pay for. A set is a map without values and enforces uniqueness by key. All of this is decided at compile time: the angle brackets are templates, so the compiler generates a separate specialised type for every element type you use, which is why vector<int> and vector<string> behave the same way yet share no runtime code. Reach for vector first, map when you need lookup by key, and set when duplicates must disappear, and only then measure.",
    },
    pitfall:
      "A frequent beginner mistake is using map operator[] to check whether a key exists, because that creates the key with a default value as a side effect. Use find and compare with end(), or count, when you only want to look. Another common slip is calling sort without including algorithm, or passing the container itself instead of its begin() and end() iterators.",
    lab: {
      id: "cpp-stl-lab",
      title: "Sort, count and summarise with the STL",
      brief:
        'Read a count n from std::cin, then n whole numbers into a vector<int>. Sort it with sort(scores.begin(), scores.end()) and print the values from smallest to largest on one line, separated by single spaces. Count how many values are 10 or more with count_if and a lambda, store that count in a map<string, int> under the key "high", and print the map entry with a range-based loop as high: followed by the count. Include iostream, vector, map, algorithm and string. Your program is executed with different workloads, so everything must be derived from the numbers it reads.',
      file: "stl.cpp",
      starter:
        '#include <iostream>\n#include <vector>\n#include <map>\n#include <algorithm>\n#include <string>\nusing namespace std;\n\nint main() {\n    int n = 0;\n    cin >> n;\n    vector<int> scores(n);\n    for (int i = 0; i < n; i++) {\n        cin >> scores[i];\n    }\n\n    // TODO: sort the vector, print the sorted values on one line, count how\n    // many reach 10 with count_if, store that count in a map under "high"\n    // and print the map entry.\n    return 0;\n}',
      tests: [
        {
          label: "Five scores sort and count three high values",
          stdin: "5\n12 5 20 8 30\n",
          expectedStdout: "5 8 12 20 30\nhigh: 3",
        },
        {
          label: "Four small scores sort and count none high",
          stdin: "4\n1 2 3 4\n",
          expectedStdout: "1 2 3 4\nhigh: 0",
        },
      ],
      hint: "Sort first so the printed order is predictable, let the lambda decide what counts as high, then store the total under a string key and let the range-based loop print it.",
      explanation:
        "sort rearranges the vector in place through its iterators, and count_if walks the same range asking a predicate about each element, so the number it returns depends only on the values that were read. The map then keeps the summary by name, which is easier to read than a second plain variable.",
    },
  },
};

import type { Lesson, LessonExtras } from "../curriculum";

export const newLessons: Lesson[] = [
  {
    id: "java-oop",
    title: "Classes & objects",
    summary:
      "Model data and behavior with classes, constructors and encapsulation.",
    theory: [
      {
        title: "Classes and objects",
        body: "A class is a blueprint for a kind of thing, and an object is one concrete copy built from that blueprint. The blueprint lists fields, which are variables that live inside each object and hold its data, and methods, which describe what the object can do. You create an object with the new keyword followed by the class name and parentheses, as in new Person(). The result is a reference, a value that points at the object in memory, and you usually store it in a variable. Dot notation then reaches inside: person.name reads a field and person.greet() calls a method. Each object keeps its own copy of the instance fields, so two Person objects can hold different names. The class itself is only the description and holds no data until an object exists.",
        code: 'class Person {\n    String name;\n    int age;\n}\n\nPerson ada = new Person();\nada.name = "Ada";\nSystem.out.println(ada.name);',
      },
      {
        title: "Constructors and this",
        body: "A constructor is a special method that runs once when new creates an object, and its job is to put that object into a valid starting state. It has the same name as the class and no return type at all, not even void, so Person(String name) is a constructor while void Person(String name) is an ordinary method. Constructor parameters are the values the caller passes in, and they often share a name with the field they should fill. That collision is exactly why this exists: this.name means the field on the current object, while name alone means the parameter. Writing this.name = name copies the argument into the field. If you declare no constructor, Java supplies an empty default one, but as soon as you write your own, that default disappears. A constructor can also validate input before storing it.",
        code: 'class Person {\n    String name;\n\n    Person(String name) {\n        this.name = name;\n    }\n}\n\nPerson ada = new Person("Ada");',
      },
      {
        title: "Encapsulation and static",
        body: "Encapsulation means hiding an object's data behind methods so the class controls how it changes. A private field can only be read or written by code inside the same class, so other classes cannot put it into a broken state. Public getters return the value, and setters update it after checking the new value; naming them getScore and setScore is the usual Java convention. The toString method returns a text description of an object, and System.out.println calls it automatically, which is why overriding toString makes debugging output readable instead of a memory address. A static member belongs to the class itself rather than to any one object: there is exactly one copy, shared by every instance, and it is reached through the class name such as Player.count. An instance member, by contrast, needs an object and has one copy per object.",
        code: 'class Player {\n    private int score;\n    static int count = 0;\n\n    Player(int score) {\n        this.score = score;\n        count++;\n    }\n\n    int getScore() {\n        return score;\n    }\n\n    public String toString() {\n        return "Score: " + score;\n    }\n}',
      },
    ],
    tasks: [
      {
        prompt: "Which keyword creates a new object from a class?",
        options: ["new", "class", "this", "static"],
        answer: 0,
        explanation:
          "new asks the JVM to allocate an object of that class and run its constructor.",
      },
      {
        prompt: "Which statement about a class is correct?",
        options: [
          "It is a blueprint that describes fields and methods",
          "It stores the data of one specific object",
          "It must contain a main method to compile",
          "It can only hold static fields",
        ],
        answer: 0,
        explanation:
          "The class is only the description; each object created from it holds the actual data.",
      },
      {
        prompt: "Which declaration gives every object its own piece of data?",
        options: [
          "private int score;",
          "static int score;",
          "void score() { }",
          "new int score;",
        ],
        answer: 0,
        explanation:
          "A non-static field declared inside the class is copied into each object, so every instance keeps its own value.",
      },
      {
        prompt: "Which is a valid constructor for a class named Book?",
        options: [
          "Book(String title) { this.title = title; }",
          "void Book(String title) { this.title = title; }",
          "book(String title) { this.title = title; }",
          "Book void(String title) { this.title = title; }",
        ],
        answer: 0,
        explanation:
          "A constructor uses the class name exactly and declares no return type, not even void.",
      },
      {
        prompt: "Inside a constructor, what does this refer to?",
        options: [
          "The object currently being created",
          "The class itself",
          "The method's return value",
          "The main method",
        ],
        answer: 0,
        explanation:
          "this is a reference to the current object, which is how this.title selects the field rather than the parameter.",
      },
      {
        prompt: "What is printed?",
        code: "class Score {\n    private int points;\n\n    Score(int points) {\n        this.points = points;\n    }\n\n    int getPoints() {\n        return points;\n    }\n}\n\nScore s = new Score(7);\nSystem.out.println(s.getPoints());",
        options: ["7", "0", "points", "Error: points is private"],
        answer: 0,
        explanation:
          "The constructor stores 7 in the private field, and the getter reads it back, so printing works even though the field is hidden.",
      },
      {
        prompt: "What is the usual purpose of a setter?",
        options: [
          "To validate and update a private field",
          "To create a second constructor",
          "To print the object as text",
          "To make a field static",
        ],
        answer: 0,
        explanation:
          "A setter is a public method that changes a private field, which lets the class check the new value first.",
      },
      {
        prompt: "What is printed?",
        code: 'class Player {\n    static int created = 0;\n    String name;\n\n    Player(String name) {\n        this.name = name;\n        created++;\n    }\n}\n\nnew Player("Ada");\nnew Player("Linus");\nSystem.out.println(Player.created);',
        options: ["0", "1", "2", "Error: created is private"],
        answer: 2,
        explanation:
          "created is static, so both objects share one counter and each constructor call adds 1.",
      },
      {
        prompt:
          'A class overrides toString to return "Player: Ada". What does System.out.println(player) show?',
        options: [
          "Player: Ada",
          "The class name only",
          "A memory address",
          "A compile error",
        ],
        answer: 0,
        explanation:
          "println calls the object's toString method, so the overridden version supplies the text.",
      },
      {
        prompt: "What is printed?",
        code: "class Box {\n    private int size = 1;\n\n    Box(int size) {\n        size = size;\n    }\n\n    int getSize() {\n        return size;\n    }\n}\n\nSystem.out.println(new Box(5).getSize());",
        options: ["1", "5", "0", "A compile error"],
        answer: 0,
        explanation:
          "Without this, the assignment copies the parameter onto itself, so the field keeps the value 1 from its initializer.",
      },
    ],
  },
  {
    id: "java-collections",
    title: "Collections & generics",
    summary:
      "Store groups of objects with ArrayList and HashMap, typed by generics.",
    theory: [
      {
        title: "ArrayList",
        body: "An ArrayList is a resizable list from the java.util package. Unlike an array, whose length is fixed when it is created, an ArrayList grows and shrinks as you add and remove items. You declare it with a type in angle brackets, such as ArrayList<String> names, then create it with new ArrayList<>(). The add method appends an item to the end, get reads the item at an index, size reports how many items are stored, and remove deletes either an index or a value. Indices still start at 0, so get(0) is the first item and get(size() - 1) is the last. Because the list changes size, you normally loop with an enhanced for loop or with an index that stops before size() rather than at a fixed number. ArrayList is the everyday choice when you need an ordered group of values and do not know the final count in advance.",
        code: 'import java.util.ArrayList;\n\nArrayList<String> names = new ArrayList<>();\nnames.add("Ada");\nnames.add("Linus");\nSystem.out.println(names.get(0));\nSystem.out.println(names.size());',
      },
      {
        title: "Generics and wrappers",
        body: "Generics let a class or method state which type it works with, and the compiler enforces that choice. In ArrayList<String>, the part inside angle brackets is a type parameter: it says every element must be a String. Adding an Integer then becomes a compile error instead of a surprise at runtime, and get returns a String without a cast. The type in angle brackets must be a reference type, so Java forbids ArrayList<int> and you write ArrayList<Integer> instead. Integer, Double, Boolean and Character are wrapper classes, object versions of the primitive types. Java converts automatically between int and Integer, a process called autoboxing when a primitive becomes a wrapper and unboxing when it goes back. That convenience is why lists of numbers still feel natural, although the wrappers are objects and carry a small cost compared with raw primitives.",
        code: "ArrayList<Integer> levels = new ArrayList<>();\nlevels.add(3);\nint first = levels.get(0);\nSystem.out.println(first);",
      },
      {
        title: "HashMap",
        body: "A HashMap stores pairs: each key is mapped to exactly one value. You put an entry with map.put(key, value), read it back with map.get(key), and test whether a key exists with map.containsKey(key). Keys are unique, so putting a second value under an existing key replaces the first, and get on an unknown key returns null rather than throwing an error. The type parameters name both sides, as in HashMap<String, Integer>, where String is the key type and Integer is the value type. To walk the entries, iterate over keySet() to visit keys, values() to visit values, or entrySet() to visit both together. HashMap does not keep insertion order, so never rely on the order you see when printing. A LinkedHashMap preserves insertion order and a TreeMap sorts by key when order matters.",
        code: 'import java.util.HashMap;\n\nHashMap<String, Integer> scores = new HashMap<>();\nscores.put("Ada", 10);\nscores.put("Linus", 7);\nSystem.out.println(scores.get("Ada"));\nSystem.out.println(scores.containsKey("Ada"));',
      },
    ],
    tasks: [
      {
        prompt: "Which method adds an item to the end of an ArrayList?",
        options: ["add", "push", "append", "put"],
        answer: 0,
        explanation:
          "ArrayList calls its append operation add; put belongs to maps.",
      },
      {
        prompt: "How do you read the number of items in an ArrayList?",
        options: [
          "list.size()",
          "list.length",
          "list.length()",
          "list.count()",
        ],
        answer: 0,
        explanation:
          "ArrayList exposes a size() method, while arrays use the length field.",
      },
      {
        prompt: "What is printed?",
        code: 'ArrayList<String> names = new ArrayList<>();\nnames.add("Ada");\nnames.add("Linus");\nSystem.out.println(names.get(1));',
        options: ["Ada", "Linus", "1", "Error"],
        answer: 1,
        explanation:
          "Index 0 holds Ada, so index 1 holds the second item, Linus.",
      },
      {
        prompt: "Which line declares a list of whole numbers correctly?",
        options: [
          "ArrayList<Integer> nums = new ArrayList<>();",
          "ArrayList<int> nums = new ArrayList<>();",
          "ArrayList nums = new ArrayList<Integer>;",
          "ArrayList(Integer) nums = new ArrayList<>();",
        ],
        answer: 0,
        explanation:
          "Type arguments belong in angle brackets, and generics require the wrapper Integer instead of int.",
      },
      {
        prompt: "What does get return when a HashMap has no entry for the key?",
        options: ["null", "0", "An empty String", "A runtime error"],
        answer: 0,
        explanation:
          "A missing key yields null, which is why containsKey exists for a safe check.",
      },
      {
        prompt: "What is printed?",
        code: 'HashMap<String, Integer> scores = new HashMap<>();\nscores.put("Ada", 10);\nscores.put("Ada", 20);\nSystem.out.println(scores.get("Ada"));',
        options: ["10", "20", "30", "null"],
        answer: 1,
        explanation:
          "A map keeps one value per key, so the second put replaces the first.",
      },
      {
        prompt: "Which method checks for a key without returning its value?",
        options: ["containsKey", "has", "get", "find"],
        answer: 0,
        explanation:
          "containsKey reports true or false, so you avoid a null result from get.",
      },
      {
        prompt: "What is printed?",
        code: "ArrayList<Integer> nums = new ArrayList<>();\nnums.add(3);\nnums.add(4);\nint total = 0;\nfor (int n : nums) {\n    total += n;\n}\nSystem.out.println(total);",
        options: ["3", "4", "7", "34"],
        answer: 2,
        explanation:
          "The enhanced for visits both elements, and unboxing turns each Integer into an int, so 3 + 4 is 7.",
      },
      {
        prompt:
          "For a HashMap<String, Integer>, what type is each item of keySet()?",
        options: ["String", "Integer", "Map.Entry", "Object"],
        answer: 0,
        explanation:
          "keySet returns the keys, whose type is the first type argument.",
      },
      {
        prompt: "What does queue.remove(0) do on an ArrayList<String>?",
        options: [
          "Removes the item at index 0 and shifts later items left",
          'Removes the String whose value is "0"',
          "Clears the whole list",
          "Returns the first item without removing it",
        ],
        answer: 0,
        explanation:
          "An int argument selects the index overload, so the first element is deleted and the rest move down.",
      },
    ],
  },
];

export const extras: Record<string, LessonExtras> = {
  "java-basics": {
    objectives: [
      "Write a complete class with a main method that compiles.",
      "Choose int, double, String or boolean for a given value.",
      "Print readable output that mixes text with variables.",
    ],
    terms: [
      {
        term: "Class",
        meaning:
          "A named block of code that groups fields and methods and gives the file its structure.",
      },
      {
        term: "main method",
        meaning: "The entry point the JVM calls first when a program starts.",
      },
      {
        term: "Primitive type",
        meaning:
          "A basic built-in type such as int, double or boolean that stores a simple value directly.",
      },
      {
        term: "String concatenation",
        meaning:
          "Joining text and other values with + to build one longer string.",
      },
    ],
    deepDive: {
      title: "Under the hood",
      body: "Zoom out and look at what actually happens when you run a Java file. The compiler, javac, reads your source and produces bytecode in a .class file, a compact set of instructions for a machine that does not exist yet. The JVM then loads that bytecode and translates it for the real processor underneath, which is why one compiled program can run on Windows, macOS and Linux without changes. This is also why Java is called statically typed: every variable's type is fixed and checked at compile time, so a String can never quietly hold a number and whole categories of bugs are caught before the program starts. The language splits values into primitives, which store the value itself such as int, double, boolean and char, and reference types such as String and arrays, which store an address to an object elsewhere in memory. In practice, choose a primitive for a single number or flag you will compute with, and a reference type when you need text or something with methods. Compile often, because the compiler is the cheapest reviewer you will ever have.",
    },
    pitfall:
      "A common slip is using System.out.print when you meant println, so the next output lands on the same line and everything runs together. Another is expecting 7 / 2 to give 3.5: both operands are int, so the decimal part is discarded. Write 7 / 2.0 whenever you need a fractional result.",
    lab: {
      id: "java-basics-lab",
      title: "Print your profile",
      brief:
        "In Basics.java, create a public class named Basics with a main method. Declare an int for a level, a double for a price and a String for a name, then print at least two lines with System.out.println. This is a structure check: it looks for the class, the main method, the declarations and a println call, not at your exact wording.",
      file: "Basics.java",
      starter:
        "public class Basics {\n    public static void main(String[] args) {\n        // TODO: declare an int, a double and a String, then print them\n    }\n}\n",
      checks: [
        {
          label: "Declares a class named Basics",
          test: (code) => /\bclass\s+Basics\b/.test(code),
        },
        {
          label: "Defines a main method",
          test: (code) =>
            /\bstatic\s+void\s+main\s*\(\s*String\s*\[\s*\]\s*\w+\s*\)/.test(
              code,
            ),
        },
        {
          label: "Declares an int and a double variable",
          test: (code) => /\bint\s+\w+\s*=[\s\S]*\bdouble\s+\w+\s*=/.test(code),
        },
        {
          label: "Declares a String variable",
          test: (code) => /\bString\s+\w+\s*=/.test(code),
        },
        {
          label: "Prints output with println",
          test: (code) => /System\s*\.\s*out\s*\.\s*println\s*\(/.test(code),
        },
      ],
      hint: "Inside main, start with int level = 3; then add the double and String lines before your println calls.",
      explanation:
        "Java needs a type in front of every variable, and println accepts text joined with +. Different types live happily in one program because each declaration fixes its own type.",
    },
  },
  "java-control": {
    objectives: [
      "Write if / else if / else chains that match a score band.",
      "Set loop bounds so a count runs the intended number of times.",
      "Decide between for, while and switch for a given job.",
    ],
    terms: [
      {
        term: "Condition",
        meaning:
          "A boolean expression whose true or false result decides which block runs.",
      },
      {
        term: "Loop body",
        meaning: "The block of statements repeated on every pass of a loop.",
      },
      {
        term: "break",
        meaning:
          "A statement that leaves the nearest loop or switch immediately.",
      },
      {
        term: "Fall-through",
        meaning:
          "The behaviour where a switch case without break continues into the next case.",
      },
    ],
    deepDive: {
      title: "Reading control flow",
      body: "Think of control flow as the shape of execution rather than a list of keywords. Java evaluates conditions strictly: an if needs a boolean, and unlike some languages it will not accept a number or an object as a stand-in for true. The operators && and || short-circuit, meaning the right side is skipped as soon as the answer is already known, which is why a null check on the left can protect a method call on the right. Variables declared inside a block disappear when that block ends, so a counter you need afterwards must be declared before the loop. Off-by-one mistakes are the most common loop bug: for (int i = 0; i <= 5; i++) runs six times, while i < 5 runs five. Choose for when you know the count, while when you are waiting for a condition, and switch when one value selects among several fixed labels. After writing any loop, state out loud which values it visits first and last; if that matches your intent, the rest usually follows.",
    },
    pitfall:
      "Putting a semicolon right after a condition, as in if (x > 3) ;, creates an empty body, so the block below always runs. A while loop can also hang forever when the variable it tests is never updated inside the body. Read the condition and the body together and confirm something changes on every pass.",
    lab: {
      id: "java-control-lab",
      title: "Label numbers even or odd",
      brief:
        "In Control.java, create a public class named Control with a main method. Use a for loop that counts from 1 to 5 inclusive, and inside it use if / else with i % 2 to print whether each number is even or odd. This is a structure check for the loop, the condition and the else branch.",
      file: "Control.java",
      starter:
        "public class Control {\n    public static void main(String[] args) {\n        // TODO: loop from 1 to 5 and print even or odd for each number\n    }\n}\n",
      checks: [
        {
          label: "Declares a class named Control",
          test: (code) => /\bclass\s+Control\b/.test(code),
        },
        {
          label: "Counts from 1 to 5 with a for loop",
          test: (code) =>
            /\bfor\s*\(\s*int\s+\w+\s*=\s*1\s*;\s*\w+\s*<=\s*5\s*;/.test(code),
        },
        {
          label: "Tests even numbers with if",
          test: (code) => /if\s*\([^)]*%\s*2\s*==\s*0\s*\)/.test(code),
        },
        {
          label: "Adds an else branch",
          test: (code) => /\}\s*else\s*\{/.test(code),
        },
        {
          label: "Prints with println",
          test: (code) => /System\s*\.\s*out\s*\.\s*println\s*\(/.test(code),
        },
      ],
      hint: "Let i run from 1 while it is less than or equal to 5, then branch on i % 2 == 0 and let else handle the odd numbers.",
      explanation:
        "A for loop handles a known count, and the remainder operator separates even from odd. The else branch guarantees that every number prints exactly one label.",
    },
  },
  "java-methods": {
    objectives: [
      "Define a static method with parameters and a declared return type.",
      "Use a returned value at the call site instead of printing inside the method.",
      "Walk an array with an enhanced for loop and accumulate a total.",
    ],
    terms: [
      {
        term: "Parameter",
        meaning:
          "A named input in a method signature that receives a value when the method is called.",
      },
      {
        term: "Argument",
        meaning: "The actual value the caller supplies for a parameter.",
      },
      {
        term: "Return type",
        meaning:
          "The type of value a method sends back, or void when it sends nothing.",
      },
      {
        term: "Call stack",
        meaning:
          "The ordered list of methods currently running, with the newest call on top.",
      },
    ],
    deepDive: {
      title: "Calls, frames and copies",
      body: "Picture the call stack as a stack of plates. When main calls add, Java pushes a new frame holding that call's parameters and local variables, runs the body, and pops the frame when the method returns. A return statement hands a value back to the caller and ends the method immediately, which is why code after it in the same branch never runs. Java passes arguments by value: for a primitive, the method receives a copy of the number, so changing the parameter cannot touch the caller's variable; for an array or an object, the copy is the reference, so the method can still change the object's contents even though it cannot reassign the caller's variable. Overloading lets several methods share a name, and the compiler picks one from the argument types and count, never from the return type. Keep methods small and honest: a method named add should add and return, not also print. When a method grows past a screen, extract the part that answers a separate question and give it a clear name.",
    },
    pitfall:
      "Forgetting the return statement in a method declared to return a value is a compile error, and beginners often hit it by printing the result inside the method instead. A related slip is calling a method and ignoring the returned value when the whole point was that value. Match the return type and store or print what the method hands back.",
    lab: {
      id: "java-methods-lab",
      title: "Add with a helper method",
      brief:
        "In Methods.java, create a public class named Methods. Add a static method named add that takes two int parameters and returns their sum, then call it from main with two numbers and print the result. This is a structure check for the method signature, the return statement, the call and the println.",
      file: "Methods.java",
      starter:
        "public class Methods {\n    // TODO: add a static add method with two int parameters\n\n    public static void main(String[] args) {\n        // TODO: call add with two numbers and print the result\n    }\n}\n",
      checks: [
        {
          label: "Declares a class named Methods",
          test: (code) => /\bclass\s+Methods\b/.test(code),
        },
        {
          label: "Defines a static method with two int parameters",
          test: (code) =>
            /\bstatic\s+int\s+\w+\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*\)/.test(
              code,
            ),
        },
        {
          label: "Returns a value",
          test: (code) => /\breturn\b/.test(code),
        },
        {
          label: "Calls the method with two numbers",
          test: (code) => /\w+\s*\(\s*\d+\s*,\s*\d+\s*\)/.test(code),
        },
        {
          label: "Prints the result",
          test: (code) => /System\s*\.\s*out\s*\.\s*println\s*\(/.test(code),
        },
      ],
      hint: "The method goes above main, looks like static int add(int a, int b), and its body is a single return.",
      explanation:
        "A return type and a parameter list form the method's contract, and main is just another caller. Keeping the calculation in add means you can reuse it without copying the arithmetic.",
    },
  },
  "java-oop": {
    objectives: [
      "Build an object with new and pass arguments to its constructor.",
      "Hide fields behind private and expose them through getters.",
      "Explain when a member should be static rather than per object.",
    ],
    terms: [
      {
        term: "Instance",
        meaning:
          "One object created from a class, with its own copy of the instance fields.",
      },
      {
        term: "Constructor",
        meaning:
          "A method named after its class, with no return type, that initializes a new object.",
      },
      {
        term: "Getter",
        meaning: "A public method that returns the value of a private field.",
      },
      {
        term: "Static member",
        meaning:
          "A field or method that belongs to the class and is shared by every object.",
      },
    ],
    deepDive: {
      title: "References, invariants and static",
      body: "Here is a mental model worth keeping. A variable of a class type does not hold the object; it holds a reference, an address pointing to an object on the heap. new reserves space, runs the constructor, and returns that address. Assigning one reference to another copies the address, so two variables can point at the same object and see each other's changes, while a primitive assignment copies the value itself. Encapsulation protects the object's invariant, the rule that its fields always make sense together: private fields plus a setter that validates keep that rule in one place instead of scattered across callers. Static members belong to the class and exist once, which suits counters, constants and factory methods, while instance members describe one object. Reach for a class when data and behavior travel together, and stay with primitives and simple values when they do not. Small classes with clear constructors are easier to test than large ones, so model one idea per class.",
    },
    pitfall:
      "A common slip is treating a class as if it were already an object, writing Person.name when no Person exists. Fields without static belong to instances, so you must create one with new and reach the field through that variable. If a value really is shared by every object, mark it static and read it through the class name.",
    lab: {
      id: "java-oop-lab",
      title: "Model a person",
      brief:
        "In Oop.java, create a class named Person with the private fields name (String) and age (int), a constructor that takes both, and public getters getName() and getAge(). In main, build one Person and print its details. This is a structure check for the class, the private fields, the constructor and the getters.",
      file: "Oop.java",
      starter:
        "public class Oop {\n    public static void main(String[] args) {\n        // TODO: create a Person with new and print its details\n    }\n}\n\nclass Person {\n    // TODO: add private fields, a constructor and getters\n}\n",
      checks: [
        {
          label: "Declares a class named Person",
          test: (code) => /\bclass\s+Person\b/.test(code),
        },
        {
          label: "Keeps name and age private",
          test: (code) =>
            /private\s+String\s+\w+\s*;[\s\S]*private\s+int\s+\w+\s*;/.test(
              code,
            ),
        },
        {
          label: "Defines a constructor taking a String and an int",
          test: (code) =>
            /Person\s*\(\s*String\s+\w+\s*,\s*int\s+\w+\s*\)/.test(code),
        },
        {
          label: "Assigns fields with this",
          test: (code) => /this\s*\.\s*\w+\s*=/.test(code),
        },
        {
          label: "Provides a String getter for the name",
          test: (code) => /String\s+getName\s*\(\s*\)/.test(code),
        },
      ],
      hint: "The constructor parameters can share the field names, as long as you write this.name = name and this.age = age.",
      explanation:
        "Private fields keep the object in charge of its own data, and the constructor is the one place that fills them at birth. Getters expose values for reading without letting callers change them directly.",
    },
  },
  "java-collections": {
    objectives: [
      "Create and change an ArrayList with add, get, size and remove.",
      "Store key-value data in a HashMap and look it up safely.",
      "Pick the right type arguments and iteration style for a collection.",
    ],
    terms: [
      {
        term: "Generic",
        meaning:
          "A type parameter in angle brackets that fixes what a collection may hold.",
      },
      {
        term: "Wrapper class",
        meaning:
          "An object form of a primitive, such as Integer for int, used where an object type is required.",
      },
      {
        term: "Autoboxing",
        meaning:
          "The automatic conversion of a primitive into its wrapper class when an object is needed.",
      },
      {
        term: "Key",
        meaning:
          "The unique label in a map that is used to store and look up a value.",
      },
    ],
    deepDive: {
      title: "Erasure and the right shape",
      body: "Two ideas explain most collection behaviour. First, generics are checked by the compiler and then largely erased: ArrayList<String> becomes a plain list at runtime, and the compiler inserts the casts for you. That is why type arguments must be reference types and why ArrayList<int> is illegal; the wrapper Integer exists so the type system has an object to name. Second, collections store references, so a list of a thousand elements holds a thousand addresses, not a thousand copies. Autoboxing hides the boundary between int and Integer, but it is not free, and comparing two Integer values with == compares addresses rather than numbers, so unbox first or call equals. Choose by the shape of your data: List when order and duplicates matter, Map when you look values up by key, Set when uniqueness matters. Prefer the interface type in declarations, such as List<String>, and name the concrete class only in the constructor call. HashMap finds keys by hashing, so lookups are fast but unordered.",
    },
    pitfall:
      "Calling get on a HashMap for a key that was never added returns null, and unboxing that null into an int throws a NullPointerException. Check containsKey first or supply a default. Another frequent surprise is expecting HashMap order to match the order of your put calls, which it does not.",
    lab: {
      id: "java-collections-lab",
      title: "Track skills and scores",
      brief:
        "In Collections.java, create a public class named Collections with a main method. Build an ArrayList<String> of at least two skills and print each one in a loop, then store two entries in a HashMap<String, Integer> and read one back with get. This is a structure check for both declarations, an add call and a get call.",
      file: "Collections.java",
      starter:
        "import java.util.ArrayList;\nimport java.util.HashMap;\n\npublic class Collections {\n    public static void main(String[] args) {\n        // TODO: add skills to an ArrayList and scores to a HashMap\n    }\n}\n",
      checks: [
        {
          label: "Declares a class named Collections",
          test: (code) => /\bclass\s+Collections\b/.test(code),
        },
        {
          label: "Creates an ArrayList of String",
          test: (code) => /ArrayList\s*<\s*String\s*>\s+\w+\s*=/.test(code),
        },
        {
          label: "Creates a HashMap of String to Integer",
          test: (code) =>
            /HashMap\s*<\s*String\s*,\s*Integer\s*>\s+\w+\s*=/.test(code),
        },
        {
          label: "Adds an item to the list",
          test: (code) => /\.\s*add\s*\(/.test(code),
        },
        {
          label: "Reads a map value with get",
          test: (code) => /\.\s*get\s*\(/.test(code),
        },
      ],
      hint: "Declare both collections with their type arguments, then call add twice on the list and put twice on the map before a final get.",
      explanation:
        "The angle brackets tell the compiler what may enter each collection, so mistakes surface early. A list keeps order for looping, while a map trades order for fast lookup by key.",
    },
  },
};

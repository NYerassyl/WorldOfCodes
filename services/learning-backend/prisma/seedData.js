export const syllabus = [
  {
    "id": "variables",
    "title": "Variables",
    "theory": "# Variables\n\nVariables store values. Python's basic types include int, float, str and bool. Arithmetic operators include +, -, *, /, // and %. Example:\n```python\nprice = 12\nquantity = 3\ntotal = price * quantity\n```\nA function must return the required value instead of printing it.",
    "problems": [
      {
        "id": "py-double",
        "title": "Double n",
        "difficulty": "EASY",
        "functionName": "double",
        "statement": "Return n multiplied by 2.",
        "cases": [
          [
            [
              4
            ],
            8
          ],
          [
            [
              -3
            ],
            -6
          ],
          [
            [
              0
            ],
            0
          ]
        ]
      },
      {
        "id": "py-area",
        "title": "Area",
        "difficulty": "MEDIUM",
        "functionName": "rectangle_area",
        "statement": "Return width multiplied by height.",
        "cases": [
          [
            [
              3,
              4
            ],
            12
          ],
          [
            [
              0,
              5
            ],
            0
          ],
          [
            [
              11,
              9
            ],
            99
          ]
        ]
      }
    ]
  },
  {
    "id": "conditions",
    "title": "Conditions",
    "theory": "# Conditions\n\nif, elif and else handle conditional logic. Compare using ==, !=, >, <, >=, <=. Combine logical statements with and, or and not. Example:\n```python\nif score >= 90:\n    grade = 'A'\nelse:\n    grade = 'B'\n```\nTest score boundaries and order conditions from specific to general.",
    "problems": [
      {
        "id": "py-even",
        "title": "Is even",
        "difficulty": "EASY",
        "functionName": "is_even",
        "statement": "Return true if the integer is even.",
        "cases": [
          [
            [
              2
            ],
            true
          ],
          [
            [
              7
            ],
            false
          ],
          [
            [
              0
            ],
            true
          ]
        ]
      },
      {
        "id": "py-grade",
        "title": "Grade",
        "difficulty": "MEDIUM",
        "functionName": "grade",
        "statement": "Return A for >=90, B for >=75, C for >=60, D otherwise.",
        "cases": [
          [
            [
              95
            ],
            "A"
          ],
          [
            [
              82
            ],
            "B"
          ],
          [
            [
              60
            ],
            "C"
          ],
          [
            [
              45
            ],
            "D"
          ]
        ]
      }
    ]
  },
  {
    "id": "loops",
    "title": "Loops",
    "theory": "# Loops\n\nfor and while iterate through sequences or while conditions remain true. range(1,n+1) includes n, while range(n) starts at zero. Example:\n```python\ntotal = 0\nfor i in range(1, 6):\n    total += i\n```\nUse an accumulator and test zero and single-element cases.",
    "problems": [
      {
        "id": "py-sum",
        "title": "Sum from one to n",
        "difficulty": "EASY",
        "functionName": "sum_to_n",
        "statement": "Return 1+2+...+n for n>=0.",
        "cases": [
          [
            [
              4
            ],
            10
          ],
          [
            [
              0
            ],
            0
          ],
          [
            [
              10
            ],
            55
          ]
        ]
      },
      {
        "id": "py-multiples",
        "title": "Count multiples",
        "difficulty": "MEDIUM",
        "functionName": "count_multiples",
        "statement": "Return number of integers in 1..n divisible by k; k>0.",
        "cases": [
          [
            [
              10,
              3
            ],
            3
          ],
          [
            [
              12,
              4
            ],
            3
          ],
          [
            [
              2,
              5
            ],
            0
          ]
        ]
      }
    ]
  },
  {
    "id": "functions",
    "title": "Functions",
    "theory": "# Functions\n\nDeclare functions with def, pass arguments and return results with return. print sends output to the console and is not interchangeable with return. Example:\n```python\ndef add(a,b):\n    return a+b\n```\nBreak a complex procedure into named functions and test edge cases.",
    "problems": [
      {
        "id": "py-greet",
        "title": "Greeting",
        "difficulty": "EASY",
        "functionName": "greet",
        "statement": "Return the string Hello, {name}!.",
        "cases": [
          [
            [
              "Ada"
            ],
            "Hello, Ada!"
          ],
          [
            [
              "Tim"
            ],
            "Hello, Tim!"
          ],
          [
            [
              ""
            ],
            "Hello, !"
          ]
        ]
      },
      {
        "id": "py-max3",
        "title": "Maximum",
        "difficulty": "MEDIUM",
        "functionName": "max_of_three",
        "statement": "Return the largest of three numbers.",
        "cases": [
          [
            [
              1,
              3,
              2
            ],
            3
          ],
          [
            [
              -5,
              -2,
              -9
            ],
            -2
          ],
          [
            [
              7,
              7,
              4
            ],
            7
          ]
        ]
      }
    ]
  },
  {
    "id": "arrays",
    "title": "Lists",
    "theory": "# Lists\n\nPython lists are ordered sequences. Indexing starts at zero, negative index -1 refers to the last item. len(xs) returns length. Example:\n```python\nxs = [2,4,6]\nfirst = xs[0]\nlast = xs[-1]\n```\nCheck empty lists and list ordering.",
    "problems": [
      {
        "id": "py-edges",
        "title": "Edges",
        "difficulty": "EASY",
        "functionName": "first_and_last",
        "statement": "Return a list containing the first and last input elements.",
        "cases": [
          [
            [
              [
                4,
                5,
                6
              ]
            ],
            [
              4,
              6
            ]
          ],
          [
            [
              [
                9
              ]
            ],
            [
              9,
              9
            ]
          ],
          [
            [
              [
                0,
                -1
              ]
            ],
            [
              0,
              -1
            ]
          ]
        ]
      },
      {
        "id": "py-unique",
        "title": "Deduplicate",
        "difficulty": "MEDIUM",
        "functionName": "unique_in_order",
        "statement": "Remove duplicates while preserving first-occurrence order.",
        "cases": [
          [
            [
              [
                1,
                2,
                1,
                3
              ]
            ],
            [
              1,
              2,
              3
            ]
          ],
          [
            [
              []
            ],
            []
          ],
          [
            [
              [
                4,
                4,
                4
              ]
            ],
            [
              4
            ]
          ]
        ]
      }
    ]
  },
  {
    "id": "methods",
    "title": "Methods",
    "theory": "# Methods\n\nLists have append, pop and sort methods. Strings have upper, lower, strip and split methods. Some methods mutate a collection while others return a new value. Example:\n```python\nnames = []\nnames.append('Ada')\nupper = names[0].upper()\n```\nObserve returned values versus modified inputs.",
    "problems": [
      {
        "id": "py-uppercase",
        "title": "Uppercase",
        "difficulty": "EASY",
        "functionName": "upper_name",
        "statement": "Return the uppercase version of the input string.",
        "cases": [
          [
            [
              "ada"
            ],
            "ADA"
          ],
          [
            [
              "Alma"
            ],
            "ALMA"
          ],
          [
            [
              ""
            ],
            ""
          ]
        ]
      },
      {
        "id": "py-lengths",
        "title": "Word lengths",
        "difficulty": "MEDIUM",
        "functionName": "word_lengths",
        "statement": "Return the length of each word as a list.",
        "cases": [
          [
            [
              [
                "a",
                "hello"
              ]
            ],
            [
              1,
              5
            ]
          ],
          [
            [
              []
            ],
            []
          ],
          [
            [
              [
                "hi",
                "ok",
                "yes"
              ]
            ],
            [
              2,
              2,
              3
            ]
          ]
        ]
      }
    ]
  }
];
export const algorithms = [
  {
    "id": "algo-two-sum",
    "title": "Two Sum",
    "topicSlug": "arrays",
    "difficulty": "EASY",
    "functionName": "two_sum",
    "statement": "Return ascending indices of the unique pair summing to target.",
    "cases": [
      [
        [
          [
            2,
            7,
            11,
            15
          ],
          9
        ],
        [
          0,
          1
        ]
      ],
      [
        [
          [
            3,
            2,
            4
          ],
          6
        ],
        [
          1,
          2
        ]
      ],
      [
        [
          [
            3,
            3
          ],
          6
        ],
        [
          0,
          1
        ]
      ]
    ]
  },
  {
    "id": "algo-binary-search",
    "title": "Binary Search",
    "topicSlug": "search",
    "difficulty": "MEDIUM",
    "functionName": "binary_search",
    "statement": "Return index of target in sorted unique array, or -1.",
    "cases": [
      [
        [
          [
            -3,
            0,
            2,
            9
          ],
          2
        ],
        2
      ],
      [
        [
          [
            -3,
            0,
            2,
            9
          ],
          1
        ],
        -1
      ],
      [
        [
          [
            5
          ],
          5
        ],
        0
      ]
    ]
  },
  {
    "id": "algo-sort",
    "title": "Sort Numbers",
    "topicSlug": "sorting",
    "difficulty": "EASY",
    "functionName": "sort_numbers",
    "statement": "Return the input numbers sorted in ascending order.",
    "cases": [
      [
        [
          [
            5,
            1,
            3
          ]
        ],
        [
          1,
          3,
          5
        ]
      ],
      [
        [
          []
        ],
        []
      ],
      [
        [
          [
            0,
            -3,
            0
          ]
        ],
        [
          -3,
          0,
          0
        ]
      ]
    ]
  },
  {
    "id": "algo-brackets",
    "title": "Balanced Brackets",
    "topicSlug": "stack",
    "difficulty": "MEDIUM",
    "functionName": "valid_parentheses",
    "statement": "Return true for correctly nested (), [] and {} brackets.",
    "cases": [
      [
        [
          "([])"
        ],
        true
      ],
      [
        [
          "([)]"
        ],
        false
      ],
      [
        [
          ""
        ],
        true
      ],
      [
        [
          "{[()]}"
        ],
        true
      ]
    ]
  }
];
export const copyExercises = [
  {
    "id": "copy-if",
    "title": "Copy if statement",
    "description": "Preserve all spaces and newlines.",
    "templateCode": "score = 85\nif score >= 75:\n    print(\"Passed\")\n"
  },
  {
    "id": "copy-loop",
    "title": "Copy for loop",
    "description": "Preserve indentation.",
    "templateCode": "total = 0\nfor number in range(1, 6):\n    total += number\nprint(total)\n"
  },
  {
    "id": "copy-function",
    "title": "Copy function",
    "description": "Preserve final newline.",
    "templateCode": "def square(number):\n    return number * number\n\nprint(square(4))\n"
  }
];

import type { Hint } from '../models/Hint';

export interface Problem {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  starterCode: string;
  testCases: Array<{ input: string; output: string }>;
  concepts: string[];
  hints: Hint[];
  visualization?: string;
  functionName?: string; // optional: main function for automated tests
}

export const problemDatabase: Problem[] = [
  {
    id: 1,
    title: "Hello World",
    difficulty: "easy",
    description: "Write a program that prints 'Hello, World!' to the console.",
    starterCode: "# Write your code here\n",
    testCases: [{ input: "", output: "Hello, World!\n" }],
    concepts: ["print", "strings"],
    hints: [
      {
        id: 'hello-1',
        level: 'remember',
        scaffolding: 1,
        concept: 'print',
        content: 'Which function in Python shows text on the screen?'
      },
      {
        id: 'hello-2',
        level: 'understand',
        scaffolding: 2,
        concept: 'strings',
        content: "You need to pass a string (text in quotes) into print()."
      },
      {
        id: 'hello-3',
        level: 'apply',
        scaffolding: 3,
        concept: 'syntax',
        content: "Print exactly: Hello, World! including capital letters and punctuation."
      }
    ]
  },
  {
    id: 2,
    title: "Sum Two Numbers",
    difficulty: "easy",
    description: "Write a function that takes two numbers and returns their sum.",
    starterCode: "def sum_numbers(a, b):\n    # Write your code here\n    pass\n\nprint(sum_numbers(5, 3))",
    functionName: "sum_numbers",
    testCases: [
      { input: "5, 3", output: "8\n" },
      { input: "10, -2", output: "8\n" }
    ],
    concepts: ["functions", "parameters", "return"],
    hints: [
      {
        id: 'sum-1',
        level: 'remember',
        scaffolding: 1,
        concept: 'addition',
        content: 'Which operator in Python combines two numbers into their sum?'
      },
      {
        id: 'sum-2',
        level: 'understand',
        scaffolding: 2,
        concept: 'parameters',
        content: 'Your function receives a and b. How can you combine them with +?'
      },
      {
        id: 'sum-3',
        level: 'apply',
        scaffolding: 3,
        concept: 'return',
        content: 'Make sure you return a + b from the function instead of printing it inside.'
      }
    ]
  },
  {
    id: 3,
    title: "Find Maximum",
    difficulty: "medium",
    description: "Write a function that finds the maximum number in a list.",
    starterCode: "def find_max(numbers):\n    # Write your code here\n    pass\n\nprint(find_max([3, 7, 2, 9, 1]))",
    functionName: "find_max",
    testCases: [
      { input: "[3, 7, 2, 9, 1]", output: "9\n" },
      { input: "[-5, -2, -8]", output: "-2\n" }
    ],
    concepts: ["loops", "conditionals", "lists"],
    hints: [
      {
        id: 'max-1',
        level: 'remember',
        scaffolding: 1,
        concept: 'variables',
        content: 'How can you keep track of the biggest value you have seen so far in a loop?'
      },
      {
        id: 'max-2',
        level: 'understand',
        scaffolding: 2,
        concept: 'initialization',
        content: 'Try starting with the first element as your current maximum.'
      },
      {
        id: 'max-3',
        level: 'apply',
        scaffolding: 3,
        concept: 'comparison',
        content: 'Inside the loop, if the current number is bigger than max_so_far, update max_so_far.'
      }
    ]
  },
  {
    id: 4,
    title: "Reverse String",
    difficulty: "medium",
    description: "Write a function that reverses a string.",
    starterCode: "def reverse_string(text):\n    # Write your code here\n    pass\n\nprint(reverse_string('hello'))",
    functionName: "reverse_string",
    testCases: [
      { input: "'hello'", output: "olleh\n" },
      { input: "'Python'", output: "nohtyP\n" }
    ],
    concepts: ["strings", "slicing", "loops"],
    hints: [
      {
        id: 'rev-1',
        level: 'remember',
        scaffolding: 1,
        concept: 'indexing',
        content: 'How would you normally get characters from a string using []?'
      },
      {
        id: 'rev-2',
        level: 'understand',
        scaffolding: 2,
        concept: 'slicing',
        content: 'Python supports slicing: text[start:end:step]. What does a negative step mean?'
      },
      {
        id: 'rev-3',
        level: 'apply',
        scaffolding: 3,
        concept: 'reverse',
        content: 'You can reverse a string using text[::-1] and then return that value.'
      }
    ]
  },
  {
    id: 5,
    title: "Count Vowels",
    difficulty: "medium",
    description: "Count the number of vowels (a, e, i, o, u) in a string.",
    starterCode: "def count_vowels(text):\n    # Write your code here\n    pass\n\nprint(count_vowels('hello world'))",
    functionName: "count_vowels",
    testCases: [
      { input: "'hello world'", output: "3\n" },
      { input: "'Python'", output: "1\n" }
    ],
    concepts: ["strings", "loops", "conditionals"],
    hints: [
      {
        id: 'vowel-1',
        level: 'remember',
        scaffolding: 1,
        concept: 'membership',
        content: 'How can you test if a character is one of a, e, i, o, u?'
      },
      {
        id: 'vowel-2',
        level: 'understand',
        scaffolding: 2,
        concept: 'loops',
        content: 'You will need to look at each character in the string one by one.'
      },
      {
        id: 'vowel-3',
        level: 'apply',
        scaffolding: 3,
        concept: 'counting',
        content: 'Use a counter variable and increment it whenever the current character is a vowel.'
      }
    ]
  },
  {
    id: 6,
    title: "Factorial",
    difficulty: "medium",
    description: "Calculate the factorial of a number (n! = n × (n-1) × ... × 1).",
    starterCode: "def factorial(n):\n    # Write your code here\n    pass\n\nprint(factorial(5))",
    functionName: "factorial",
    testCases: [
      { input: "5", output: "120\n" },
      { input: "0", output: "1\n" }
    ],
    concepts: ["recursion", "loops", "math"],
    hints: [
      {
        id: 'fact-1',
        level: 'remember',
        scaffolding: 1,
        concept: 'definition',
        content: 'How is n! defined in terms of multiplication of numbers from 1 to n?'
      },
      {
        id: 'fact-2',
        level: 'understand',
        scaffolding: 2,
        concept: 'iteration',
        content: 'Think about starting with result = 1 and multiplying by 1, 2, ..., n.'
      },
      {
        id: 'fact-3',
        level: 'apply',
        scaffolding: 3,
        concept: 'base case',
        content: 'Remember that 0! should return 1 immediately.'
      }
    ],
    visualization: "factorial"
  },
  {
    id: 7,
    title: "Bubble Sort",
    difficulty: "hard",
    description: "Implement bubble sort to sort a list of numbers.",
    starterCode: "def bubble_sort(arr):\n    # Write your code here\n    pass\n\nprint(bubble_sort([64, 34, 25, 12, 22]))",
    functionName: "bubble_sort",
    testCases: [
      { input: "[64, 34, 25, 12, 22]", output: "[12, 22, 25, 34, 64]\n" }
    ],
    concepts: ["sorting", "nested loops", "swapping"],
    hints: [
      {
        id: 'bubble-1',
        level: 'remember',
        scaffolding: 1,
        concept: 'adjacent comparison',
        content: 'In bubble sort, which pairs of elements do you compare in each step?'
      },
      {
        id: 'bubble-2',
        level: 'understand',
        scaffolding: 2,
        concept: 'passes',
        content: 'Why do you need an outer loop counting how many passes have been done?'
      },
      {
        id: 'bubble-3',
        level: 'apply',
        scaffolding: 3,
        concept: 'swap',
        content: 'If arr[j] is greater than arr[j+1], swap them so larger values move to the right.'
      }
    ],
    visualization: "bubbleSort"
  },
  {
    id: 8,
    title: "Binary Search",
    difficulty: "hard",
    description: "Implement binary search on a sorted list.",
    starterCode: "def binary_search(arr, target):\n    # Write your code here\n    pass\n\nprint(binary_search([1, 3, 5, 7, 9], 5))",
    functionName: "binary_search",
    testCases: [
      { input: "[1, 3, 5, 7, 9], 5", output: "2\n" },
      { input: "[1, 3, 5, 7, 9], 10", output: "-1\n" }
    ],
    concepts: ["search", "divide-and-conquer", "algorithms"],
    hints: [
      {
        id: 'bin-1',
        level: 'remember',
        scaffolding: 1,
        concept: 'sorted array',
        content: 'Binary search only works correctly when the array is sorted. Is your input sorted?'
      },
      {
        id: 'bin-2',
        level: 'understand',
        scaffolding: 2,
        concept: 'mid index',
        content: 'At each step, you should look at the middle index between low and high.'
      },
      {
        id: 'bin-3',
        level: 'apply',
        scaffolding: 3,
        concept: 'shrinking range',
        content: 'If target < arr[mid], move high to mid-1; if target > arr[mid], move low to mid+1.'
      }
    ],
    visualization: "binarySearch"
  },
  {
    id: 9,
    title: "Fibonacci Sequence",
    difficulty: "medium",
    description: "Generate the first n numbers in the Fibonacci sequence.",
    starterCode: "def fibonacci(n):\n    # Write your code here\n    pass\n\nprint(fibonacci(7))",
    functionName: "fibonacci",
    testCases: [
      { input: "7", output: "[0, 1, 1, 2, 3, 5, 8]\n" }
    ],
    concepts: ["sequences", "loops", "math"],
    hints: [
      {
        id: 'fib-1',
        level: 'remember',
        scaffolding: 1,
        concept: 'definition',
        content: 'Each Fibonacci number is the sum of the previous two. What are the first two values?'
      },
      {
        id: 'fib-2',
        level: 'understand',
        scaffolding: 2,
        concept: 'state',
        content: 'You can keep track of the last two numbers and append their sum to a list.'
      },
      {
        id: 'fib-3',
        level: 'apply',
        scaffolding: 3,
        concept: 'loop',
        content: 'Use a loop to generate n elements, updating the last two numbers each time.'
      }
    ]
  },
  {
    id: 10,
    title: "Palindrome Check",
    difficulty: "easy",
    description: "Check if a string reads the same forwards and backwards.",
    starterCode: "def is_palindrome(text):\n    # Write your code here\n    pass\n\nprint(is_palindrome('radar'))",
    functionName: "is_palindrome",
    testCases: [
      { input: "'radar'", output: "True\n" },
      { input: "'hello'", output: "False\n" }
    ],
    concepts: ["strings", "comparison"],
    hints: [
      {
        id: 'pal-1',
        level: 'remember',
        scaffolding: 1,
        concept: 'definition',
        content: 'What does it mean for a word to be a palindrome?'
      },
      {
        id: 'pal-2',
        level: 'understand',
        scaffolding: 2,
        concept: 'reversal',
        content: 'How can you get the reverse of a string in Python using slicing?'
      },
      {
        id: 'pal-3',
        level: 'apply',
        scaffolding: 3,
        concept: 'comparison',
        content: 'Try returning the result of comparing the original string to its reversed version.'
      }
    ]
  }
];

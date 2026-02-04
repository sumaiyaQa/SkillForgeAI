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
      { id: 'hello-1', level: 'remember', scaffolding: 1, concept: 'print', content: 'Which function in Python shows text on the screen?' },
      { id: 'hello-2', level: 'understand', scaffolding: 2, concept: 'strings', content: "You need to pass a string (text in quotes) into print()." },
      { id: 'hello-3', level: 'apply', scaffolding: 3, concept: 'syntax', content: "Print exactly: Hello, World! including capital letters and punctuation." }
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
      { id: 'sum-1', level: 'remember', scaffolding: 1, concept: 'addition', content: 'Which operator in Python combines two numbers into their sum?' },
      { id: 'sum-2', level: 'understand', scaffolding: 2, concept: 'parameters', content: 'Your function receives a and b. How can you combine them with +?' },
      { id: 'sum-3', level: 'apply', scaffolding: 3, concept: 'return', content: 'Make sure you return a + b from the function instead of printing it inside.' }
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
      { id: 'max-1', level: 'remember', scaffolding: 1, concept: 'variables', content: 'How can you keep track of the biggest value you have seen so far in a loop?' },
      { id: 'max-2', level: 'understand', scaffolding: 2, concept: 'initialization', content: 'Try starting with the first element as your current maximum.' },
      { id: 'max-3', level: 'apply', scaffolding: 3, concept: 'comparison', content: 'Inside the loop, if the current number is bigger than max_so_far, update max_so_far.' }
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
      { id: 'rev-1', level: 'remember', scaffolding: 1, concept: 'indexing', content: 'How would you normally get characters from a string using []?' },
      { id: 'rev-2', level: 'understand', scaffolding: 2, concept: 'slicing', content: 'Python supports slicing: text[start:end:step]. What does a negative step mean?' },
      { id: 'rev-3', level: 'apply', scaffolding: 3, concept: 'reverse', content: 'You can reverse a string using text[::-1] and then return that value.' }
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
      { id: 'vowel-1', level: 'remember', scaffolding: 1, concept: 'membership', content: 'How can you test if a character is one of a, e, i, o, u?' },
      { id: 'vowel-2', level: 'understand', scaffolding: 2, concept: 'loops', content: 'You will need to look at each character in the string one by one.' },
      { id: 'vowel-3', level: 'apply', scaffolding: 3, concept: 'counting', content: 'Use a counter variable and increment it whenever the current character is a vowel.' }
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
      { id: 'fact-1', level: 'remember', scaffolding: 1, concept: 'definition', content: 'How is n! defined in terms of multiplication of numbers from 1 to n?' },
      { id: 'fact-2', level: 'understand', scaffolding: 2, concept: 'iteration', content: 'Think about starting with result = 1 and multiplying by 1, 2, ..., n.' },
      { id: 'fact-3', level: 'apply', scaffolding: 3, concept: 'base case', content: 'Remember that 0! should return 1 immediately.' }
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
      { id: 'bubble-1', level: 'remember', scaffolding: 1, concept: 'adjacent comparison', content: 'In bubble sort, which pairs of elements do you compare in each step?' },
      { id: 'bubble-2', level: 'understand', scaffolding: 2, concept: 'passes', content: 'Why do you need an outer loop counting how many passes have been done?' },
      { id: 'bubble-3', level: 'apply', scaffolding: 3, concept: 'swap', content: 'If arr[j] is greater than arr[j+1], swap them so larger values move to the right.' }
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
      { id: 'bin-1', level: 'remember', scaffolding: 1, concept: 'sorted array', content: 'Binary search only works correctly when the array is sorted. Is your input sorted?' },
      { id: 'bin-2', level: 'understand', scaffolding: 2, concept: 'mid index', content: 'At each step, you should look at the middle index between low and high.' },
      { id: 'bin-3', level: 'apply', scaffolding: 3, concept: 'shrinking range', content: 'If target < arr[mid], move high to mid-1; if target > arr[mid], move low to mid+1.' }
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
      { id: 'fib-1', level: 'remember', scaffolding: 1, concept: 'definition', content: 'Each Fibonacci number is the sum of the previous two. What are the first two values?' },
      { id: 'fib-2', level: 'understand', scaffolding: 2, concept: 'state', content: 'You can keep track of the last two numbers and append their sum to a list.' },
      { id: 'fib-3', level: 'apply', scaffolding: 3, concept: 'loop', content: 'Use a loop to generate n elements, updating the last two numbers each time.' }
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
      { id: 'pal-1', level: 'remember', scaffolding: 1, concept: 'definition', content: 'What does it mean for a word to be a palindrome?' },
      { id: 'pal-2', level: 'understand', scaffolding: 2, concept: 'reversal', content: 'How can you get the reverse of a string in Python using slicing?' },
      { id: 'pal-3', level: 'apply', scaffolding: 3, concept: 'comparison', content: 'Try returning the result of comparing the original string to its reversed version.' }
    ]
  },
  {
    id: 11,
    title: "FizzBuzz",
    difficulty: "easy",
    description: "Write a function that returns 'Fizz' if a number is divisible by 3, 'Buzz' if divisible by 5, and 'FizzBuzz' if divisible by both. Otherwise, return the number as a string.",
    starterCode: "def fizz_buzz(n):\n    # Write your code here\n    pass\n\nprint(fizz_buzz(15))",
    functionName: "fizz_buzz",
    testCases: [
      { input: "15", output: "FizzBuzz\n" },
      { input: "3", output: "Fizz\n" },
      { input: "5", output: "Buzz\n" },
      { input: "7", output: "7\n" }
    ],
    concepts: ["modulus", "conditionals"],
    hints: [
      { id: 'fb-1', level: 'remember', scaffolding: 1, concept: 'modulus', content: 'The % operator gives the remainder. What is 15 % 3?' },
      { id: 'fb-2', level: 'understand', scaffolding: 2, concept: 'order', content: 'Check for the "both" case (divisible by 15) first, otherwise one of the others will trigger too early.' },
      { id: 'fb-3', level: 'apply', scaffolding: 3, concept: 'logic', content: 'Use if n % 15 == 0 for FizzBuzz.' }
    ]
  },
  {
    id: 12,
    title: "Find Even Numbers",
    difficulty: "easy",
    description: "Given a list of numbers, return a new list containing only the even numbers.",
    starterCode: "def get_evens(numbers):\n    # Write your code here\n    pass\n\nprint(get_evens([1, 2, 3, 4, 5, 6]))",
    functionName: "get_evens",
    testCases: [{ input: "[1, 2, 3, 4, 5, 6]", output: "[2, 4, 6]\n" }],
    concepts: ["lists", "filtering", "modulus"],
    hints: [
      { id: 'ev-1', level: 'remember', scaffolding: 1, concept: 'parity', content: 'An even number has a remainder of 0 when divided by 2.' },
      { id: 'ev-2', level: 'understand', scaffolding: 2, concept: 'accumulation', content: 'Create an empty list and append numbers that pass your "even" test.' },
      { id: 'ev-3', level: 'apply', scaffolding: 3, concept: 'list-comp', content: 'You can use [num for num in numbers if num % 2 == 0].' }
    ]
  },
  {
    id: 13,
    title: "Dictionary Word Count",
    difficulty: "medium",
    description: "Count the occurrences of each word in a list and return a dictionary.",
    starterCode: "def word_count(words):\n    # Write your code here\n    pass\n\nprint(word_count(['apple', 'banana', 'apple']))",
    functionName: "word_count",
    testCases: [{ input: "['apple', 'banana', 'apple']", output: "{'apple': 2, 'banana': 1}\n" }],
    concepts: ["dictionaries", "loops"],
    hints: [
      { id: 'wc-1', level: 'remember', scaffolding: 1, concept: 'dict-access', content: 'How do you check if a key already exists in a dictionary?' },
      { id: 'wc-2', level: 'understand', scaffolding: 2, concept: 'logic', content: 'If word is in dict, increment; else, set to 1.' },
      { id: 'wc-3', level: 'apply', scaffolding: 3, concept: 'get-method', content: 'The .get(word, 0) method is very useful here.' }
    ]
  },
  {
    id: 14,
    title: "Leap Year Checker",
    difficulty: "easy",
    description: "Return True if a year is a leap year. (Divisible by 4, but not by 100 unless also divisible by 400).",
    starterCode: "def is_leap(year):\n    # Write your code here\n    pass\n\nprint(is_leap(2000))",
    functionName: "is_leap",
    testCases: [
      { input: "2000", output: "True\n" },
      { input: "1900", output: "False\n" }
    ],
    concepts: ["logic", "nested-conditions"],
    hints: [
      { id: 'lp-1', level: 'remember', scaffolding: 1, concept: 'rules', content: 'A year is leap if it is divisible by 4.' },
      { id: 'lp-2', level: 'understand', scaffolding: 2, concept: 'exceptions', content: 'But if it is divisible by 100, it is NOT leap, unless it is also divisible by 400.' },
      { id: 'lp-3', level: 'apply', scaffolding: 3, concept: 'boolean-logic', content: 'Try: (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0).' }
    ]
  },
  {
    id: 15,
    title: "Calculate Average",
    difficulty: "easy",
    description: "Return the average of a list of numbers. Return 0 if the list is empty.",
    starterCode: "def get_average(numbers):\n    # Write your code here\n    pass\n\nprint(get_average([10, 20, 30]))",
    functionName: "get_average",
    testCases: [{ input: "[10, 20, 30]", output: "20.0\n" }],
    concepts: ["math", "built-in-functions"],
    hints: [
      { id: 'avg-1', level: 'remember', scaffolding: 1, concept: 'formula', content: 'Average is the sum divided by the count.' },
      { id: 'avg-2', level: 'understand', scaffolding: 2, concept: 'built-ins', content: 'Python has sum() and len() functions.' },
      { id: 'avg-3', level: 'apply', scaffolding: 3, concept: 'edge-case', content: 'Check if len(numbers) == 0 first to avoid ZeroDivisionError.' }
    ]
  },
  {
    id: 16,
    title: "Remove Duplicates",
    difficulty: "medium",
    description: "Given a list, return a new list with duplicates removed, preserving order.",
    starterCode: "def remove_dupes(items):\n    # Write your code here\n    pass\n\nprint(remove_dupes([1, 2, 2, 3, 1]))",
    functionName: "remove_dupes",
    testCases: [{ input: "[1, 2, 2, 3, 1]", output: "[1, 2, 3]\n" }],
    concepts: ["sets", "lists", "membership"],
    hints: [
      { id: 'rd-1', level: 'remember', scaffolding: 1, concept: 'uniqueness', content: 'Which Python data type only allows unique elements?' },
      { id: 'rd-2', level: 'understand', scaffolding: 2, concept: 'order', content: 'Converting to a set() and back to a list loses order. Instead, use a "seen" set while looping.' },
      { id: 'rd-3', level: 'apply', scaffolding: 3, concept: 'logic', content: 'If item not in seen: add to result and seen.' }
    ]
  },
  {
    id: 17,
    title: "Prime Number Check",
    difficulty: "medium",
    description: "Return True if a number is prime, False otherwise.",
    starterCode: "def is_prime(n):\n    # Write your code here\n    pass\n\nprint(is_prime(11))",
    functionName: "is_prime",
    testCases: [
      { input: "11", output: "True\n" },
      { input: "4", output: "False\n" },
      { input: "1", output: "False\n" }
    ],
    concepts: ["loops", "math", "optimization"],
    hints: [
      { id: 'pr-1', level: 'remember', scaffolding: 1, concept: 'definition', content: 'A prime number is only divisible by 1 and itself.' },
      { id: 'pr-2', level: 'understand', scaffolding: 2, concept: 'looping', content: 'Try dividing n by every number from 2 up to the square root of n.' },
      { id: 'pr-3', level: 'apply', scaffolding: 3, concept: 'edge-case', content: 'Numbers less than 2 are not prime.' }
    ]
  },
  {
    id: 18,
    title: "Anagram Checker",
    difficulty: "medium",
    description: "Check if two strings are anagrams (contain the same letters in different order).",
    starterCode: "def are_anagrams(s1, s2):\n    # Write your code here\n    pass\n\nprint(are_anagrams('listen', 'silent'))",
    functionName: "are_anagrams",
    testCases: [{ input: "'listen', 'silent'", output: "True\n" }],
    concepts: ["strings", "sorting"],
    hints: [
      { id: 'an-1', level: 'remember', scaffolding: 1, concept: 'logic', content: 'If you sort the letters in both words, what should happen?' },
      { id: 'an-2', level: 'understand', scaffolding: 2, concept: 'built-ins', content: 'Use the sorted() function on both strings.' },
      { id: 'an-3', level: 'apply', scaffolding: 3, concept: 'comparison', content: 'return sorted(s1) == sorted(s2).' }
    ]
  },
  {
    id: 19,
    title: "Flatten a List",
    difficulty: "hard",
    description: "Convert a list of lists into a single flat list.",
    starterCode: "def flatten(nested_list):\n    # Write your code here\n    pass\n\nprint(flatten([[1, 2], [3, 4]]))",
    functionName: "flatten",
    testCases: [{ input: "[[1, 2], [3, 4]]", output: "[1, 2, 3, 4]\n" }],
    concepts: ["nested-loops", "lists"],
    hints: [
      { id: 'fl-1', level: 'remember', scaffolding: 1, concept: 'iteration', content: 'You need to loop through the outer list, and then loop through each sub-list.' },
      { id: 'fl-2', level: 'understand', scaffolding: 2, concept: 'methods', content: 'You can use .append() in the inner loop or .extend() in the outer loop.' },
      { id: 'fl-3', level: 'apply', scaffolding: 3, concept: 'comp', content: 'List comprehension: [item for sublist in nested_list for item in sublist].' }
    ]
  },
  {
    id: 20,
    title: "Find Intersection",
    difficulty: "medium",
    description: "Return a list of elements that are common to two lists.",
    starterCode: "def intersect(list1, list2):\n    # Write your code here\n    pass\n\nprint(intersect([1, 2, 3], [2, 3, 4]))",
    functionName: "intersect",
    testCases: [{ input: "[1, 2, 3], [2, 3, 4]", output: "[2, 3]\n" }],
    concepts: ["sets", "logic"],
    hints: [
      { id: 'in-1', level: 'remember', scaffolding: 1, concept: 'sets', content: 'Sets have a built-in \"intersection\" method.' },
      { id: 'in-2', level: 'understand', scaffolding: 2, concept: 'conversion', content: 'Convert both lists to sets, find the intersection, then convert back to a list.' },
      { id: 'in-3', level: 'apply', scaffolding: 3, concept: 'operator', content: 'The & operator performs intersection on sets.' }
    ]
  },
  {
    id: 21,
    title: "Capitalize Words",
    difficulty: "easy",
    description: "Capitalize the first letter of every word in a string.",
    starterCode: "def capitalize_all(text):\n    # Write your code here\n    pass\n\nprint(capitalize_all('hello world'))",
    functionName: "capitalize_all",
    testCases: [{ input: "'hello world'", output: "Hello World\n" }],
    concepts: ["strings", "methods"],
    hints: [
      { id: 'cap-1', level: 'remember', scaffolding: 1, concept: 'built-in', content: 'Python has a string method specifically for this.' },
      { id: 'cap-2', level: 'understand', scaffolding: 2, concept: 'title', content: 'Look up the .title() string method.' },
      { id: 'cap-3', level: 'apply', scaffolding: 3, concept: 'alternative', content: 'You could also .split() the string, .capitalize() each word, and .join() them.' }
    ]
  },
  {
    id: 22,
    title: "Power Function",
    difficulty: "medium",
    description: "Write a function that calculates base raised to the power of exp without using the ** operator.",
    starterCode: "def power(base, exp):\n    # Write your code here\n    pass\n\nprint(power(2, 3))",
    functionName: "power",
    testCases: [{ input: "2, 3", output: "8\n" }],
    concepts: ["loops", "accumulation"],
    hints: [
      { id: 'pw-1', level: 'remember', scaffolding: 1, concept: 'math', content: '2 to the power of 3 is 2 * 2 * 2.' },
      { id: 'pw-2', level: 'understand', scaffolding: 2, concept: 'loop', content: 'Start with a result of 1 and multiply it by the base \"exp\" times.' },
      { id: 'pw-3', level: 'apply', scaffolding: 3, concept: 'range', content: 'Use for _ in range(exp): result *= base.' }
    ]
  },
  {
    id: 23,
    title: "Find Longest Word",
    difficulty: "medium",
    description: "Given a sentence, return the longest word.",
    starterCode: "def longest_word(sentence):\n    # Write your code here\n    pass\n\nprint(longest_word('Python is amazing'))",
    functionName: "longest_word",
    testCases: [{ input: "'Python is amazing'", output: "amazing\n" }],
    concepts: ["strings", "max", "splitting"],
    hints: [
      { id: 'lw-1', level: 'remember', scaffolding: 1, concept: 'split', content: 'How do you turn a sentence into a list of words?' },
      { id: 'lw-2', level: 'understand', scaffolding: 2, concept: 'key', content: 'The max() function can take a \"key\" argument to find the longest string.' },
      { id: 'lw-3', level: 'apply', scaffolding: 3, concept: 'solution', content: 'max(words, key=len) will return the longest word.' }
    ]
  },
  {
    id: 24,
    title: "Merge Dictionaries",
    difficulty: "easy",
    description: "Merge two dictionaries. If a key exists in both, the second dictionary's value should be used.",
    starterCode: "def merge_dicts(d1, d2):\n    # Write your code here\n    pass\n\nprint(merge_dicts({'a': 1}, {'b': 2}))",
    functionName: "merge_dicts",
    testCases: [{ input: "{'a': 1}, {'a': 2, 'b': 3}", output: "{'a': 2, 'b': 3}\n" }],
    concepts: ["dictionaries", "updates"],
    hints: [
      { id: 'md-1', level: 'remember', scaffolding: 1, concept: 'methods', content: 'Dictionaries have an .update() method.' },
      { id: 'md-2', level: 'understand', scaffolding: 2, concept: 'copying', content: 'Be careful not to modify the original d1. Make a copy first.' },
      { id: 'md-3', level: 'apply', scaffolding: 3, concept: 'modern-python', content: 'In Python 3.9+, you can use the union operator: d1 | d2.' }
    ]
  },
  {
    id: 25,
    title: "Sum of Digits",
    difficulty: "medium",
    description: "Calculate the sum of digits of a positive integer.",
    starterCode: "def sum_digits(n):\n    # Write your code here\n    pass\n\nprint(sum_digits(123))",
    functionName: "sum_digits",
    testCases: [{ input: "123", output: "6\n" }],
    concepts: ["math", "type-conversion", "loops"],
    hints: [
      { id: 'sd-1', level: 'remember', scaffolding: 1, concept: 'conversion', content: 'How can you iterate over the characters of a number?' },
      { id: 'sd-2', level: 'understand', scaffolding: 2, concept: 'casting', content: 'Convert the number to a string, loop over it, then convert each character back to an int.' },
      { id: 'sd-3', level: 'apply', scaffolding: 3, concept: 'math-way', content: 'Alternatively, use n % 10 to get the last digit and n // 10 to remove it.' }
    ]
  }
];
// /**
//  * Golden Reference Patterns for AST Comparison
//  * 
//  * Each problem has a canonical reference implementation and structural
//  * requirements that define acceptable solutions.
//  */

// import type { GoldenReferencePattern, ASTNodeType } from './types';

// /**
//  * Golden references indexed by problem ID.
//  * These define the expected structure and acceptable variations for each problem.
//  */
// export const goldenReferences: Record<number, GoldenReferencePattern> = {
//   // Problem 1: Hello World
//   1: {
//     problemId: 1,
//     name: "Hello World - Print Statement",
//     referenceCode: `print("Hello, World!")`,
//     requiredNodes: ['Expr', 'Call'],
//     requiredPatterns: ['Call'],
//     semanticConstraints: [
//       {
//         type: 'must_call',
//         value: 'print',
//         message: "You must use the print() function"
//       }
//     ],
//     flexibility: {
//       ignoreVariableNames: true
//     }
//   },

//   // Problem 2: Sum Two Numbers
//   2: {
//     problemId: 2,
//     name: "Sum Two Numbers - Function with Return",
//     referenceCode: `def sum_numbers(a, b):
//     return a + b

// print(sum_numbers(5, 3))`,
//     requiredNodes: ['FunctionDef', 'Return', 'BinOp'],
//     requiredPatterns: ['FunctionDef > Return > BinOp'],
//     semanticConstraints: [
//       {
//         type: 'must_use_operator',
//         value: 'Add',
//         message: "Use the + operator to add the numbers"
//       }
//     ],
//     flexibility: {
//       ignoreVariableNames: true
//     }
//   },

//   // Problem 3: Find Maximum
//   3: {
//     problemId: 3,
//     name: "Find Maximum - Loop with Comparison",
//     referenceCode: `def find_max(numbers):
//     max_val = numbers[0]
//     for num in numbers:
//         if num > max_val:
//             max_val = num
//     return max_val

// print(find_max([3, 7, 2, 9, 1]))`,
//     alternatives: [
//       // Alternative: using max() built-in
//       `def find_max(numbers):
//     return max(numbers)

// print(find_max([3, 7, 2, 9, 1]))`,
//       // Alternative: while loop
//       `def find_max(numbers):
//     max_val = numbers[0]
//     i = 1
//     while i < len(numbers):
//         if numbers[i] > max_val:
//             max_val = numbers[i]
//         i += 1
//     return max_val

// print(find_max([3, 7, 2, 9, 1]))`
//     ],
//     requiredNodes: ['FunctionDef', 'Return'],
//     requiredPatterns: ['FunctionDef > Return'],
//     flexibility: {
//       allowLoopTypeChange: true,
//       ignoreVariableNames: true,
//       allowOperatorEquivalents: true
//     }
//   },

//   // Problem 4: Reverse String
//   4: {
//     problemId: 4,
//     name: "Reverse String - Slicing or Loop",
//     referenceCode: `def reverse_string(text):
//     return text[::-1]

// print(reverse_string('hello'))`,
//     alternatives: [
//       // Alternative: loop-based
//       `def reverse_string(text):
//     result = ""
//     for char in text:
//         result = char + result
//     return result

// print(reverse_string('hello'))`,
//       // Alternative: using reversed()
//       `def reverse_string(text):
//     return ''.join(reversed(text))

// print(reverse_string('hello'))`
//     ],
//     requiredNodes: ['FunctionDef', 'Return'],
//     requiredPatterns: ['FunctionDef > Return'],
//     flexibility: {
//       ignoreVariableNames: true,
//       allowComprehensionSwap: true
//     }
//   },

//   // Problem 5: Count Vowels
//   5: {
//     problemId: 5,
//     name: "Count Vowels - Loop with Conditional",
//     referenceCode: `def count_vowels(text):
//     count = 0
//     for char in text.lower():
//         if char in 'aeiou':
//             count += 1
//     return count

// print(count_vowels('hello world'))`,
//     alternatives: [
//       // Alternative: sum with generator
//       `def count_vowels(text):
//     return sum(1 for char in text.lower() if char in 'aeiou')

// print(count_vowels('hello world'))`,
//       // Alternative: using count
//       `def count_vowels(text):
//     text = text.lower()
//     return sum(text.count(v) for v in 'aeiou')

// print(count_vowels('hello world'))`
//     ],
//     requiredNodes: ['FunctionDef', 'Return'],
//     requiredPatterns: ['FunctionDef > Return'],
//     flexibility: {
//       allowLoopTypeChange: true,
//       ignoreVariableNames: true,
//       allowComprehensionSwap: true
//     }
//   },

//   // Problem 6: Factorial
//   6: {
//     problemId: 6,
//     name: "Factorial - Loop or Recursion",
//     referenceCode: `def factorial(n):
//     if n == 0:
//         return 1
//     result = 1
//     for i in range(1, n + 1):
//         result *= i
//     return result

// print(factorial(5))`,
//     alternatives: [
//       // Alternative: recursive
//       `def factorial(n):
//     if n == 0:
//         return 1
//     return n * factorial(n - 1)

// print(factorial(5))`,
//       // Alternative: while loop
//       `def factorial(n):
//     if n == 0:
//         return 1
//     result = 1
//     while n > 0:
//         result *= n
//         n -= 1
//     return result

// print(factorial(5))`
//     ],
//     requiredNodes: ['FunctionDef', 'Return', 'If'],
//     requiredPatterns: ['FunctionDef > If', 'FunctionDef > Return'],
//     semanticConstraints: [
//       {
//         type: 'must_use_operator',
//         value: 'Mult',
//         message: "Factorial requires multiplication"
//       }
//     ],
//     flexibility: {
//       allowLoopTypeChange: true,
//       allowRecursionSwap: true,
//       ignoreVariableNames: true
//     }
//   },

//   // Problem 7: Bubble Sort
//   7: {
//     problemId: 7,
//     name: "Bubble Sort - Nested Loops with Swap",
//     referenceCode: `def bubble_sort(arr):
//     n = len(arr)
//     for i in range(n):
//         for j in range(0, n - i - 1):
//             if arr[j] > arr[j + 1]:
//                 arr[j], arr[j + 1] = arr[j + 1], arr[j]
//     return arr

// print(bubble_sort([64, 34, 25, 12, 22]))`,
//     requiredNodes: ['FunctionDef', 'For', 'If', 'Return'],
//     requiredPatterns: ['FunctionDef > For > For > If'],
//     forbiddenPatterns: ['Call'], // Don't allow using sorted()
//     semanticConstraints: [
//       {
//         type: 'must_not_call',
//         value: 'sorted',
//         message: "Implement the sort yourself - don't use sorted()"
//       },
//       {
//         type: 'must_not_call',
//         value: 'sort',
//         message: "Implement the sort yourself - don't use .sort()"
//       }
//     ],
//     flexibility: {
//       allowLoopTypeChange: true,
//       ignoreVariableNames: true
//     }
//   },

//   // Problem 8: Binary Search
//   8: {
//     problemId: 8,
//     name: "Binary Search - Divide and Conquer",
//     referenceCode: `def binary_search(arr, target):
//     low = 0
//     high = len(arr) - 1
//     while low <= high:
//         mid = (low + high) // 2
//         if arr[mid] == target:
//             return mid
//         elif arr[mid] < target:
//             low = mid + 1
//         else:
//             high = mid - 1
//     return -1

// print(binary_search([1, 3, 5, 7, 9], 5))`,
//     alternatives: [
//       // Alternative: recursive
//       `def binary_search(arr, target, low=0, high=None):
//     if high is None:
//         high = len(arr) - 1
//     if low > high:
//         return -1
//     mid = (low + high) // 2
//     if arr[mid] == target:
//         return mid
//     elif arr[mid] < target:
//         return binary_search(arr, target, mid + 1, high)
//     else:
//         return binary_search(arr, target, low, mid - 1)

// print(binary_search([1, 3, 5, 7, 9], 5))`
//     ],
//     requiredNodes: ['FunctionDef', 'Return', 'If', 'Compare'],
//     requiredPatterns: ['FunctionDef > While > If', 'FunctionDef > Return'],
//     semanticConstraints: [
//       {
//         type: 'must_use_operator',
//         value: 'FloorDiv',
//         message: "Use integer division (//) to calculate the middle index"
//       }
//     ],
//     flexibility: {
//       allowLoopTypeChange: true,
//       allowRecursionSwap: true,
//       ignoreVariableNames: true
//     }
//   },

//   // Problem 9: Fibonacci Sequence
//   9: {
//     problemId: 9,
//     name: "Fibonacci - Sequence Generation",
//     referenceCode: `def fibonacci(n):
//     if n <= 0:
//         return []
//     if n == 1:
//         return [0]
//     fib = [0, 1]
//     for i in range(2, n):
//         fib.append(fib[-1] + fib[-2])
//     return fib

// print(fibonacci(7))`,
//     alternatives: [
//       // Alternative: while loop
//       `def fibonacci(n):
//     if n <= 0:
//         return []
//     fib = [0]
//     if n == 1:
//         return fib
//     fib.append(1)
//     while len(fib) < n:
//         fib.append(fib[-1] + fib[-2])
//     return fib

// print(fibonacci(7))`
//     ],
//     requiredNodes: ['FunctionDef', 'Return', 'List'],
//     requiredPatterns: ['FunctionDef > Return'],
//     flexibility: {
//       allowLoopTypeChange: true,
//       ignoreVariableNames: true
//     }
//   },

//   // Problem 10: Palindrome Check
//   10: {
//     problemId: 10,
//     name: "Palindrome - String Comparison",
//     referenceCode: `def is_palindrome(text):
//     return text == text[::-1]

// print(is_palindrome('radar'))`,
//     alternatives: [
//       // Alternative: loop-based
//       `def is_palindrome(text):
//     for i in range(len(text) // 2):
//         if text[i] != text[-(i + 1)]:
//             return False
//     return True

// print(is_palindrome('radar'))`,
//       // Alternative: using reversed
//       `def is_palindrome(text):
//     return list(text) == list(reversed(text))

// print(is_palindrome('radar'))`
//     ],
//     requiredNodes: ['FunctionDef', 'Return', 'Compare'],
//     requiredPatterns: ['FunctionDef > Return'],
//     flexibility: {
//       ignoreVariableNames: true
//     }
//   },

//   // Problem 11: FizzBuzz
//   11: {
//     problemId: 11,
//     name: "FizzBuzz - Conditional Logic",
//     referenceCode: `def fizz_buzz(n):
//     if n % 15 == 0:
//         return "FizzBuzz"
//     elif n % 3 == 0:
//         return "Fizz"
//     elif n % 5 == 0:
//         return "Buzz"
//     else:
//         return str(n)

// print(fizz_buzz(15))`,
//     alternatives: [
//       // Alternative: building string
//       `def fizz_buzz(n):
//     result = ""
//     if n % 3 == 0:
//         result += "Fizz"
//     if n % 5 == 0:
//         result += "Buzz"
//     return result if result else str(n)

// print(fizz_buzz(15))`
//     ],
//     requiredNodes: ['FunctionDef', 'Return', 'If', 'Compare'],
//     requiredPatterns: ['FunctionDef > If > Return'],
//     semanticConstraints: [
//       {
//         type: 'must_use_operator',
//         value: 'Mod',
//         message: "Use the modulo operator (%) to check divisibility"
//       }
//     ],
//     flexibility: {
//       ignoreVariableNames: true
//     }
//   },

//   // Problem 12: Find Even Numbers
//   12: {
//     problemId: 12,
//     name: "Find Evens - Filtering",
//     referenceCode: `def get_evens(numbers):
//     return [num for num in numbers if num % 2 == 0]

// print(get_evens([1, 2, 3, 4, 5, 6]))`,
//     alternatives: [
//       // Alternative: loop-based
//       `def get_evens(numbers):
//     result = []
//     for num in numbers:
//         if num % 2 == 0:
//             result.append(num)
//     return result

// print(get_evens([1, 2, 3, 4, 5, 6]))`,
//       // Alternative: using filter
//       `def get_evens(numbers):
//     return list(filter(lambda x: x % 2 == 0, numbers))

// print(get_evens([1, 2, 3, 4, 5, 6]))`
//     ],
//     requiredNodes: ['FunctionDef', 'Return'],
//     requiredPatterns: ['FunctionDef > Return'],
//     semanticConstraints: [
//       {
//         type: 'must_use_operator',
//         value: 'Mod',
//         message: "Use modulo (%) to check for even numbers"
//       }
//     ],
//     flexibility: {
//       allowComprehensionSwap: true,
//       ignoreVariableNames: true
//     }
//   },

//   // Problem 13: Dictionary Word Count
//   13: {
//     problemId: 13,
//     name: "Word Count - Dictionary Building",
//     referenceCode: `def word_count(words):
//     counts = {}
//     for word in words:
//         counts[word] = counts.get(word, 0) + 1
//     return counts

// print(word_count(['apple', 'banana', 'apple']))`,
//     alternatives: [
//       // Alternative: using if/else
//       `def word_count(words):
//     counts = {}
//     for word in words:
//         if word in counts:
//             counts[word] += 1
//         else:
//             counts[word] = 1
//     return counts

// print(word_count(['apple', 'banana', 'apple']))`,
//       // Alternative: using Counter
//       `def word_count(words):
//     from collections import Counter
//     return dict(Counter(words))

// print(word_count(['apple', 'banana', 'apple']))`
//     ],
//     requiredNodes: ['FunctionDef', 'Return', 'Dict'],
//     requiredPatterns: ['FunctionDef > For', 'FunctionDef > Return'],
//     flexibility: {
//       allowLoopTypeChange: true,
//       ignoreVariableNames: true
//     }
//   },

//   // Problem 17: Prime Number Check
//   17: {
//     problemId: 17,
//     name: "Prime Check - Divisibility Testing",
//     referenceCode: `def is_prime(n):
//     if n < 2:
//         return False
//     for i in range(2, int(n ** 0.5) + 1):
//         if n % i == 0:
//             return False
//     return True

// print(is_prime(11))`,
//     alternatives: [
//       // Alternative: simpler range
//       `def is_prime(n):
//     if n < 2:
//         return False
//     for i in range(2, n):
//         if n % i == 0:
//             return False
//     return True

// print(is_prime(11))`
//     ],
//     requiredNodes: ['FunctionDef', 'Return', 'If', 'For', 'Compare'],
//     requiredPatterns: ['FunctionDef > If', 'FunctionDef > For > If'],
//     semanticConstraints: [
//       {
//         type: 'must_use_operator',
//         value: 'Mod',
//         message: "Use modulo (%) to check divisibility"
//       }
//     ],
//     flexibility: {
//       allowLoopTypeChange: true,
//       ignoreVariableNames: true
//     }
//   }
// };

// /**
//  * Get the golden reference for a specific problem.
//  */
// export function getGoldenReference(problemId: number): GoldenReferencePattern | undefined {
//   return goldenReferences[problemId];
// }

// /**
//  * Get all problem IDs that have golden references.
//  */
// export function getProblemsWithReferences(): number[] {
//   return Object.keys(goldenReferences).map(Number);
// }

// /**
//  * Check if a problem has a golden reference defined.
//  */
// export function hasGoldenReference(problemId: number): boolean {
//   return problemId in goldenReferences;
// }
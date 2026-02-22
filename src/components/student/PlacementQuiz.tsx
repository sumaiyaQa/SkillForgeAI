import React, { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
  difficulty: 'easy' | 'medium' | 'hard';
  concept: string;
}

// 8 questions spanning easy → hard, covering key Python concepts.
// Scoring: ≥7 = advanced, ≥4 = intermediate, else beginner.
const placementQuestions: Question[] = [
  {
    id: 1,
    text: 'What is the output of: print(type(3.14))?',
    options: ["<class 'int'>", "<class 'float'>", "<class 'double'>", "<class 'number'>"],
    correct: 1,
    difficulty: 'easy',
    concept: 'types',
  },
  {
    id: 2,
    text: 'Which of the following correctly defines a function in Python?',
    options: [
      'function greet(): return "hi"',
      'def greet() => return "hi"',
      'def greet(): return "hi"',
      'define greet(): "hi"',
    ],
    correct: 2,
    difficulty: 'easy',
    concept: 'functions',
  },
  {
    id: 3,
    text: 'What does this code print?\n\nfor i in range(2, 6):\n    print(i, end=" ")',
    options: ['2 3 4 5 6', '2 3 4 5', '1 2 3 4 5', '2 4 6'],
    correct: 1,
    difficulty: 'easy',
    concept: 'loops',
  },
  {
    id: 4,
    text: 'What is the output of: print([1, 2, 3][-1])?',
    options: ['1', '3', '-1', 'IndexError'],
    correct: 1,
    difficulty: 'easy',
    concept: 'lists',
  },
  {
    id: 5,
    text: 'Which code snippet correctly checks if a key exists in a dictionary?',
    options: [
      "d.hasKey('x')",
      "'x' in d",
      "d.contains('x')",
      "d.get('x') != None",
    ],
    correct: 1,
    difficulty: 'medium',
    concept: 'dictionaries',
  },
  {
    id: 6,
    text: 'What is the time complexity of binary search on a sorted list of n elements?',
    options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'],
    correct: 2,
    difficulty: 'medium',
    concept: 'algorithms',
  },
  {
    id: 7,
    text: 'What does this function return for factorial(4)?\n\ndef factorial(n):\n    if n <= 1: return 1\n    return n * factorial(n - 1)',
    options: ['4', '12', '24', '16'],
    correct: 2,
    difficulty: 'medium',
    concept: 'recursion',
  },
  {
    id: 8,
    text: 'What is the output of:\n\ndef f(x, memo={}):\n    if x in memo: return memo[x]\n    memo[x] = x * 2\n    return memo[x]\nprint(f(3), f(4))',
    options: ['6 8', '6 6', 'Error', '3 4'],
    correct: 0,
    difficulty: 'hard',
    concept: 'memoisation',
  },
];

export default function PlacementQuiz({
  onComplete,
}: {
  onComplete: (level: string) => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const question = placementQuestions[currentStep];
  const isLastQuestion = currentStep === placementQuestions.length - 1;

  const handleSelect = (index: number) => {
    if (confirmed) return;
    setSelectedAnswer(index);
  };

  const handleConfirm = () => {
    if (selectedAnswer === null) return;
    setConfirmed(true);
  };

  const handleNext = () => {
    const newScore = selectedAnswer === question.correct ? score + 1 : score;

    if (isLastQuestion) {
      let level = 'beginner';
      if (newScore >= 7) level = 'advanced';
      else if (newScore >= 4) level = 'intermediate';
      onComplete(level);
    } else {
      setScore(newScore);
      setCurrentStep(s => s + 1);
      setSelectedAnswer(null);
      setConfirmed(false);
    }
  };

  const progressPercent = ((currentStep) / placementQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-xl">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-black text-gray-900">Skill Assessment</h2>
          <p className="text-sm text-gray-500 mt-1">
            We'll use your answers to personalise your learning path.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Question {currentStep + 1} of {placementQuestions.length}</span>
            <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-full ${
              question.difficulty === 'hard'
                ? 'bg-red-100 text-red-500'
                : question.difficulty === 'medium'
                ? 'bg-amber-100 text-amber-500'
                : 'bg-emerald-100 text-emerald-500'
            }`}>
              {question.difficulty}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <p className="font-semibold text-gray-800 mb-1 text-sm">
          {question.text.split('\n').map((line, i) =>
            line.startsWith('def ') || line.startsWith('    ') || line.startsWith('print') || line.startsWith('for ') ? (
              <code key={i} className="block font-mono bg-gray-50 border rounded px-2 py-0.5 text-xs mt-1 text-gray-700">
                {line}
              </code>
            ) : (
              <span key={i} className="block">{line}</span>
            )
          )}
        </p>
        <p className="text-xs text-indigo-500 font-medium mb-4">Concept: {question.concept}</p>

        {/* Options */}
        <div className="space-y-2 mb-6">
          {question.options.map((opt, i) => {
            let style =
              'w-full text-left p-3 rounded-lg border text-sm transition-all font-medium ';
            if (!confirmed) {
              style +=
                selectedAnswer === i
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-800'
                  : 'bg-gray-50 border-gray-200 hover:border-indigo-300 text-gray-700 cursor-pointer';
            } else {
              if (i === question.correct) {
                style += 'bg-emerald-50 border-emerald-500 text-emerald-800';
              } else if (i === selectedAnswer && selectedAnswer !== question.correct) {
                style += 'bg-red-50 border-red-400 text-red-700';
              } else {
                style += 'bg-gray-50 border-gray-200 text-gray-400';
              }
            }

            return (
              <button key={i} onClick={() => handleSelect(i)} className={style}>
                <div className="flex items-center justify-between">
                  <span>{opt}</span>
                  {confirmed && i === question.correct && (
                    <CheckCircle size={16} className="text-emerald-500" />
                  )}
                  {confirmed && i === selectedAnswer && selectedAnswer !== question.correct && (
                    <XCircle size={16} className="text-red-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        {!confirmed ? (
          <button
            onClick={handleConfirm}
            disabled={selectedAnswer === null}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold disabled:opacity-40 hover:bg-indigo-700 transition-colors"
          >
            Confirm Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
          >
            {isLastQuestion ? 'See My Level →' : 'Next Question →'}
          </button>
        )}
      </div>
    </div>
  );
}
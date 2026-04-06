/**
 * PlacementQuiz.tsx  Diagnostic test shown to new students on first login
 *
 * This 8-question Python quiz does two important things:
 *
 * 1. It gives students a starting skill level (beginner, intermediate, or advanced)
 *    that is stored in the database for compatibility.
 *
 * 2. More importantly, it seeds knowledge estimates for each concept based on
 *    their answers. Instead of everyone starting at the same prior (0.3), a
 *    student who gets the recursion question right starts at 0.75 for recursion,
 *    while one who gets it wrong starts at 0.15. That affects:
 *    - Which problems show up first, with weaker concepts prioritized
 *    - Which hints they get, based on their Zone of Proximal Development
 *
 * This follows the learning science ideas behind Bayesian Knowledge Tracing,
 * based on Corbett & Anderson (1995).
 *
 * Flow:
 *   New student logs in -> takes quiz -> gets personalized recommendations
 *   Returning student logs in -> skips quiz -> uses saved progress
 */

import { useState } from 'react';
import { updateMastery } from '../../models/bkt';

// Quiz question shape

interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
  difficulty: 'easy' | 'medium' | 'hard';
  concept: string;
}

// What the quiz returns when it finishes
// level is stored in the database, and conceptPriors seeds their learning path
export interface PlacementResult {
  level: 'beginner' | 'intermediate' | 'advanced';
  conceptPriors: Record<string, number>;
}

// Eight Python questions, arranged from easy to hard
// Each question maps to concepts used in the problem database so the results can guide problem selection

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
    text: "Which code snippet correctly checks if a key exists in a dictionary?",
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

// Build starting knowledge estimates from the quiz

// Map quiz concepts to the problem tags used in the database
// For example, if someone knows recursion, they should be matched with recursion-related tags too
const QUIZ_TO_DB_CONCEPTS: Record<string, string[]> = {
  types:        ['types', 'strings', 'integers', 'floats', 'booleans'],
  functions:    ['functions', 'return-values', 'parameters'],
  loops:        ['loops', 'for-loops', 'while-loops', 'iteration'],
  lists:        ['lists', 'arrays', 'indexing', 'slicing'],
  dictionaries: ['dictionaries', 'hashmaps', 'key-value'],
  algorithms:   ['algorithms', 'binary-search', 'sorting', 'complexity'],
  recursion:    ['recursion', 'base-case', 'call-stack'],
  memoisation:  ['memoisation', 'memoization', 'dynamic-programming', 'caching'],
};

// Turn quiz answers into knowledge estimates for each concept
// A correct answer raises mastery, a wrong answer lowers it, and harder questions count a bit more
function deriveConceptPriors(
  responses: Array<{ concept: string; correct: boolean; difficulty: 'easy' | 'medium' | 'hard' }>
): Record<string, number> {
  const priors: Record<string, number> = {};

  for (const { concept, correct, difficulty } of responses) {
    const neutralPrior = 0.3;

    const responseWeight =
      difficulty === 'hard' ? 0.85 :
      difficulty === 'medium' ? 0.7 : 0.6;

    let updated = updateMastery(neutralPrior, correct);

    // Keep the placement priors useful without making them too extreme after one answer.
    updated = Math.min(1, Math.max(0, 0.5 + (updated - 0.5) * responseWeight));

    // Write the value for the quiz concept and all of its database tag aliases.
    // That way, problem ordering can use it no matter which tag a problem has.
    const dbConcepts = QUIZ_TO_DB_CONCEPTS[concept] ?? [concept];
    for (const tag of dbConcepts) {
      priors[tag] = updated;
    }
  }

  return priors;
}

// Convert the score into a skill label (beginner, intermediate, or advanced)
// This is saved for compatibility with the database
function deriveSkillLevel(
  score: number,
  total: number
): 'beginner' | 'intermediate' | 'advanced' {
  const pct = score / total;
  if (pct >= 0.75) return 'advanced';
  if (pct >= 0.45) return 'intermediate';
  return 'beginner';
}

// The quiz component

export default function PlacementQuiz({
  onComplete,
}: {
  onComplete: (result: PlacementResult) => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [responses, setResponses] = useState<
    Array<{ concept: string; correct: boolean; difficulty: 'easy' | 'medium' | 'hard' }>
  >([]);

  // After all eight questions are done, show a results summary before learning starts
  const [quizResult, setQuizResult] = useState<PlacementResult | null>(null);

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
    const isCorrect = selectedAnswer === question.correct;
    const newScore = isCorrect ? score + 1 : score;

    const newResponses = [
      ...responses,
      { concept: question.concept, correct: isCorrect, difficulty: question.difficulty },
    ];

    if (isLastQuestion) {
      const conceptPriors = deriveConceptPriors(newResponses);
      const level = deriveSkillLevel(newScore, placementQuestions.length);
      // Show the results screen so they can see their knowledge estimates before starting
      setQuizResult({ level, conceptPriors });
    } else {
      setScore(newScore);
      setResponses(newResponses);
      setCurrentStep(s => s + 1);
      setSelectedAnswer(null);
      setConfirmed(false);
    }
  };

    // Show the results and let them start learning
    if (quizResult) {
    const levelColors = {
      beginner: 'text-amber-600 bg-amber-50 border-amber-200',
      intermediate: 'text-blue-600 bg-blue-50 border-blue-200',
      advanced: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-center mb-6">
            <h2 className="mb-1 text-2xl font-semibold text-slate-900">Assessment Complete</h2>
            <p className="text-sm text-slate-500">Here is your current Python baseline.</p>
          </div>

          <div className={`mb-6 inline-flex justify-center rounded-full border px-4 py-2 text-sm font-semibold ${levelColors[quizResult.level]}`}>
            Placed as: <span className="capitalize">{quizResult.level}</span>
          </div>

          <div className="space-y-2 mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Concept Mastery Estimates</p>
            {placementQuestions.map(q => {
              const primaryTag = QUIZ_TO_DB_CONCEPTS[q.concept]?.[0] ?? q.concept;
              const mastery = quizResult.conceptPriors[primaryTag] ?? 0.3;
              const pct = Math.round(mastery * 100);
              const isStrong = mastery > 0.5;
              return (
                <div key={q.concept} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-semibold capitalize text-slate-600">{q.concept}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${isStrong ? 'bg-emerald-400' : 'bg-red-300'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`w-10 text-right text-xs font-semibold ${isStrong ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mb-6 text-center text-xs text-slate-500">
            Problems will be ordered by your weakest concepts first.
          </p>

          <button
            onClick={() => onComplete(quizResult)}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Start Learning
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = (currentStep / placementQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

        <div className="mb-6">
          <h2 className="mb-1 text-xl font-semibold text-slate-900">Skill Assessment</h2>
          <p className="text-sm text-slate-500">
            Your answers seed personalised knowledge estimates for each concept.
          </p>
        </div>

        <div className="mb-6">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Question {currentStep + 1} of {placementQuestions.length}</span>
            <span className="capitalize font-semibold text-indigo-700">
              {question.difficulty}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mb-6">
          <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-800">
            {question.text}
          </p>
          <span className="mt-2 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
            {question.concept}
          </span>
        </div>

        <div className="space-y-3 mb-6">
          {question.options.map((opt, i) => {
            let base = 'w-full text-left px-4 py-3 rounded-lg border text-sm transition-all';

            if (!confirmed) {
              base += selectedAnswer === i
                ? ' border-indigo-500 bg-indigo-50 font-semibold text-indigo-800'
                : ' border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700';
            } else {
              if (i === question.correct) {
                base += ' border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold';
              } else if (i === selectedAnswer) {
                base += ' border-rose-400 bg-rose-50 text-rose-700';
              } else {
                base += ' border-slate-200 text-slate-400';
              }
            }

            return (
              <button key={i} className={base} onClick={() => handleSelect(i)}>
                <div className="flex items-center gap-3">
                  {confirmed && i === question.correct && <span className="text-[10px] font-semibold uppercase text-emerald-700">Correct</span>}
                  {confirmed && i === selectedAnswer && i !== question.correct && <span className="text-[10px] font-semibold uppercase text-rose-700">Selected</span>}
                  <span>{opt}</span>
                </div>
              </button>
            );
          })}
        </div>

        {!confirmed ? (
          <button
            onClick={handleConfirm}
            disabled={selectedAnswer === null}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Confirm Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            {isLastQuestion ? 'View My Results' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  );
}
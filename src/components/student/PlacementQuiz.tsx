/**
 * PlacementQuiz.tsx
 *
 * PURPOSE:
 * This component runs an 8-question Python diagnostic quiz shown to new
 * students immediately after their first login. It does two things:
 *
 *   1. Derives a coarse skill level label (beginner / intermediate / advanced)
 *      for backward compatibility with the skill_level database column.
 *
 *   2. More importantly — seeds PER-CONCEPT BKT priors from the quiz answers.
 *      Instead of every concept starting at the default 0.3 prior, the student
 *      begins with meaningful, differentiated knowledge estimates.
 *
 * WHY THIS MATTERS (academic justification):
 * Bayesian Knowledge Tracing assumes a prior P(L0) for each concept. Using
 * the same prior for all students ignores pre-existing knowledge. By running
 * updateMastery() from bkt.ts on each quiz response, we perform a single
 * BKT update step before any practice begins. A student who answers the
 * recursion question correctly starts with recursion mastery ~0.75; one who
 * gets it wrong starts at ~0.15. This directly feeds:
 *   - recommendedProblems ordering in App.tsx (weakest concepts first)
 *   - selectAdaptiveHint() ZPD level selection in Hint.ts
 *
 * FLOW:
 *   Login → (new student, no saved profile) → PlacementQuiz → App
 *   Login → (returning student, saved profile) → App (quiz skipped)
 *
 * Reference: Corbett & Anderson (1995). Knowledge tracing: Modeling the
 * acquisition of procedural knowledge. UMUAI 4(4), 253–278.
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, Brain } from 'lucide-react';
import { updateMastery } from '../../models/bkt';
// ^ Path assumes this file lives at src/components/student/PlacementQuiz.tsx
// If your folder structure differs, adjust to match where bkt.ts actually is.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
  difficulty: 'easy' | 'medium' | 'hard';
  concept: string;
}

/**
 * PlacementResult — the object passed to onComplete().
 *
 * `level` is the coarse label stored in the DB.
 * `conceptPriors` is the important part — a Record<concept, mastery> that
 * App.tsx writes directly into userProfile.conceptMastery, seeding BKT.
 */
export interface PlacementResult {
  level: 'beginner' | 'intermediate' | 'advanced';
  conceptPriors: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Question bank
// 8 questions, easy → hard, covering 8 distinct Python concepts.
// Each concept maps to concept tags used in the problem database,
// so the priors derived here directly influence problem ordering.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// BKT Prior Derivation
// ---------------------------------------------------------------------------

/**
 * CONCEPT MAPPING — quiz concept → DB problem concept tags
 *
 * The quiz uses broad concept names ('types', 'loops') while the problem
 * database uses fine-grained tags ('strings', 'print', 'for-loops').
 * This map ensures quiz priors seed BKT for the right problem concepts
 * so the adaptive ordering and hint system actually uses them.
 */
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

/**
 * deriveConceptPriors()
 *
 * Converts quiz responses into per-concept BKT starting values.
 *
 * HOW IT WORKS:
 * For each question answered, we run one BKT update step (updateMastery from
 * bkt.ts) starting from the default neutral prior of 0.3. This gives us a
 * posterior belief about whether the student knows that concept.
 *
 * We then apply a difficulty weight: harder questions carry more diagnostic
 * signal. Getting a hard question right is stronger evidence of knowledge
 * than getting an easy one right. We scale the deviation from 0.5 by this
 * weight to amplify the signal appropriately.
 *
 * Result: { loops: 0.15, recursion: 0.75, functions: 0.75, ... }
 * These values go straight into userProfile.conceptMastery in App.tsx.
 */
function deriveConceptPriors(
  responses: Array<{ concept: string; correct: boolean; difficulty: 'easy' | 'medium' | 'hard' }>
): Record<string, number> {
  const priors: Record<string, number> = {};

  for (const { concept, correct, difficulty } of responses) {
    const neutralPrior = 0.3;

    const difficultyWeight =
      difficulty === 'hard' ? 1.3 :
      difficulty === 'medium' ? 1.1 : 1.0;

    let updated = updateMastery(neutralPrior, correct);

    const deviation = (updated - 0.5) * difficultyWeight;
    updated = Math.min(1, Math.max(0, 0.5 + deviation));

    // Write the prior for the quiz concept AND all its DB tag aliases.
    // This ensures recommendedProblems ordering in App.tsx sees the values
    // no matter which tag the problem uses.
    const dbConcepts = QUIZ_TO_DB_CONCEPTS[concept] ?? [concept];
    for (const tag of dbConcepts) {
      priors[tag] = updated;
    }
  }

  return priors;
}

/**
 * deriveSkillLevel()
 *
 * Maps raw score percentage to the coarse skill label.
 * Stored in the DB for compatibility — but the real adaptation
 * uses conceptPriors, not this label.
 */
function deriveSkillLevel(
  score: number,
  total: number
): 'beginner' | 'intermediate' | 'advanced' {
  const pct = score / total;
  if (pct >= 0.75) return 'advanced';
  if (pct >= 0.45) return 'intermediate';
  return 'beginner';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

  // Once the last question is answered, we show a results screen before
  // calling onComplete(). quizResult holds the derived data for that screen.
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
      // Show results screen instead of immediately calling onComplete
      setQuizResult({ level, conceptPriors });
    } else {
      setScore(newScore);
      setResponses(newResponses);
      setCurrentStep(s => s + 1);
      setSelectedAnswer(null);
      setConfirmed(false);
    }
  };

  // ---- Results Screen ----
  if (quizResult) {
    const totalQuestions = placementQuestions.length;
    const correctCount = Object.values(quizResult.conceptPriors).filter(v => v > 0.5).length;
    const levelColors = {
      beginner: 'text-amber-600 bg-amber-50 border-amber-200',
      intermediate: 'text-blue-600 bg-blue-50 border-blue-200',
      advanced: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    };
    const levelEmoji = { beginner: '🌱', intermediate: '⚡', advanced: '🚀' };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-xl">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">{levelEmoji[quizResult.level]}</div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">Assessment Complete</h2>
            <p className="text-sm text-gray-500">Here's what we learned about your Python knowledge</p>
          </div>

          {/* Level badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border font-bold text-sm mb-6 mx-auto flex justify-center ${levelColors[quizResult.level]}`}>
            Placed as: <span className="capitalize">{quizResult.level}</span>
          </div>

          {/* Per-concept breakdown */}
          <div className="space-y-2 mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Concept Mastery Estimates</p>
            {placementQuestions.map(q => {
              // Get the primary DB tag mastery value
              const primaryTag = QUIZ_TO_DB_CONCEPTS[q.concept]?.[0] ?? q.concept;
              const mastery = quizResult.conceptPriors[primaryTag] ?? 0.3;
              const pct = Math.round(mastery * 100);
              const isStrong = mastery > 0.5;
              return (
                <div key={q.concept} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-600 w-24 capitalize">{q.concept}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isStrong ? 'bg-emerald-400' : 'bg-red-300'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-10 text-right ${isStrong ? 'text-emerald-600' : 'text-red-500'}`}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 text-center mb-6">
            Problems will be ordered by your weakest concepts first.
          </p>

          <button
            onClick={() => onComplete(quizResult)}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors"
          >
            Start Learning →
          </button>
        </div>
      </div>
    );
  }

  // Progress bar fill: grows as student advances through questions
  const progressPercent = (currentStep / placementQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-xl">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={20} className="text-indigo-600" />
            <h2 className="text-xl font-black text-gray-900">Skill Assessment</h2>
          </div>
          <p className="text-sm text-gray-500">
            Your answers seed personalised knowledge estimates for each concept.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Question {currentStep + 1} of {placementQuestions.length}</span>
            <span className="capitalize font-semibold text-indigo-500">
              {question.difficulty}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question text — whitespace-pre-wrap preserves code indentation */}
        <div className="mb-6">
          <p className="font-semibold text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
            {question.text}
          </p>
          <span className="inline-block mt-2 text-[10px] uppercase tracking-wider font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">
            {question.concept}
          </span>
        </div>

        {/* Answer options */}
        <div className="space-y-3 mb-6">
          {question.options.map((opt, i) => {
            // Build the button's className based on state
            let base = 'w-full text-left px-4 py-3 rounded-lg border text-sm transition-all';

            if (!confirmed) {
              // Before confirming: highlight selected option in indigo
              base += selectedAnswer === i
                ? ' border-indigo-500 bg-indigo-50 font-semibold text-indigo-800'
                : ' border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-700';
            } else {
              // After confirming: show green for correct, red for wrong selection
              if (i === question.correct) {
                base += ' border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold';
              } else if (i === selectedAnswer) {
                base += ' border-red-400 bg-red-50 text-red-700';
              } else {
                base += ' border-gray-200 text-gray-400';
              }
            }

            return (
              <button key={i} className={base} onClick={() => handleSelect(i)}>
                <div className="flex items-center gap-3">
                  {/* Show tick/cross icons after confirming */}
                  {confirmed && i === question.correct && (
                    <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  )}
                  {confirmed && i === selectedAnswer && i !== question.correct && (
                    <XCircle size={16} className="text-red-500 shrink-0" />
                  )}
                  <span>{opt}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action button — two-step: Confirm then Next */}
        {!confirmed ? (
          <button
            onClick={handleConfirm}
            disabled={selectedAnswer === null}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Confirm Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-700 transition-colors"
          >
            {isLastQuestion ? 'View My Results →' : 'Next Question →'}
          </button>
        )}
      </div>
    </div>
  );
}
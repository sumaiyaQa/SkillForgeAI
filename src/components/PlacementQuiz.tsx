import React, { useState } from 'react';

interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
}

const placementQuestions: Question[] = [
  {
    id: 1,
    text: "What is the output of print(2 * 3 + 1)?",
    options: ["6", "7", "8", "5"],
    correct: 1
  },
  {
    id: 2,
    text: "Which keyword is used to create a function in Python?",
    options: ["func", "define", "def", "function"],
    correct: 2
  },
  {
    id: 3,
    text: "What does range(5) produce?",
    options: ["0 to 4", "1 to 5", "0 to 5", "1 to 4"],
    correct: 0
  }
];

export default function PlacementQuiz({ onComplete }: { onComplete: (level: string) => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);

  const handleAnswer = (index: number) => {
    const newScore = index === placementQuestions[currentStep].correct ? score + 1 : score;
    setScore(newScore);

    if (currentStep < placementQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Calculate level based on score
      let level = 'beginner';
      if (newScore === 2) level = 'intermediate';
      if (newScore === 3) level = 'advanced';
      onComplete(level);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md border border-gray-200 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-indigo-700">Skill Assessment</h2>
      <p className="text-sm text-gray-600 mb-6">Let's find the best starting point for you.</p>
      
      <div className="mb-4">
        <p className="font-medium text-gray-800 mb-4">{placementQuestions[currentStep].text}</p>
        <div className="space-y-2">
          {placementQuestions[currentStep].options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className="w-full text-left p-3 rounded-lg border border-gray-300 hover:bg-indigo-50 hover:border-indigo-300 transition-all"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      <div className="text-xs text-gray-400">Question {currentStep + 1} of {placementQuestions.length}</div>
    </div>
  );
}
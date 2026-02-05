import React, { useState } from 'react';
import { calculateSUS } from '../utils/sus'; // We will use your existing utility

const questions = [
  "I think that I would like to use this system frequently.",
  "I found the system unnecessarily complex.",
  "I thought the system was easy to use.",
  "I think that I would need the support of a technical person to be able to use this system.",
  "I found the various functions in this system were well integrated.",
  "I thought there was too much inconsistency in this system.",
  "I would imagine that most people would learn to use this system very quickly.",
  "I found the system very cumbersome to use.",
  "I felt very confident using the system.",
  "I needed to learn a lot of things before I could get going with this system."
];

export default function SUSSurvey({ onComplete }: { onComplete: (score: number) => void }) {
  const [responses, setResponses] = useState<number[]>(new Array(10).fill(3));

  const handleSubmit = () => {
    const score = calculateSUS(responses);
    onComplete(score);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-2xl font-black mb-2">User Experience Survey</h2>
        <p className="text-gray-500 mb-6 text-sm">Please rate your experience. 1 = Strongly Disagree, 5 = Strongly Agree.</p>
        
        <div className="space-y-6">
          {questions.map((q, i) => (
            <div key={i} className="border-b border-gray-100 pb-4">
              <p className="text-sm font-medium mb-3">{i + 1}. {q}</p>
              <div className="flex justify-between gap-2">
                {[1, 2, 3, 4, 5].map(val => (
                  <button
                    key={val}
                    onClick={() => {
                      const newRes = [...responses];
                      newRes[i] = val;
                      setResponses(newRes);
                    }}
                    className={`flex-1 py-2 rounded-md border text-sm font-bold transition-all ${
                      responses[i] === val ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={handleSubmit}
          className="w-full mt-8 bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 shadow-lg"
        >
          Submit Evaluation
        </button>
      </div>
    </div>
  );
}
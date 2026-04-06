import { useState } from 'react';
import { calculateSUS } from '../utils/sus';

// SYSTEM USABILITY SCALE (SUS) SURVEY

// Standard SUS questionnaire consisting of 10 items.
// Responses are given on a 5-point Likert scale.

//  Odd-numbered questions are positively worded.
// Even-numbered questions are negatively worded.

const questions = [
  'I think that I would like to use this system frequently.',
  'I found the system unnecessarily complex.',
  'I thought the system was easy to use.',
  'I think that I would need the support of a technical person to be able to use this system.',
  'I found the various functions in this system were well integrated.',
  'I thought there was too much inconsistency in this system.',
  'I would imagine that most people would learn to use this system very quickly.',
  'I found the system very cumbersome to use.',
  'I felt very confident using the system.',
  'I needed to learn a lot of things before I could get going with this system.',
];

interface Props {
  // Called once the user completes the survey.
  // Both score and raw responses are passed so the parent can persist them
  // to the backend using the auth token it already holds.
  onComplete: (score: number, responses: number[]) => void;
}

// SUSSurvey
// Displays a modal-based usability survey after a study session.
// Calculates the SUS score locally and delegates persistence to the parent.

export default function SUSSurvey({ onComplete }: Props) {

  // Stores user responses for each question.
  // Use null to require an explicit user choice per question.
  const [responses, setResponses] = useState<Array<number | null>>(
    new Array(10).fill(null)
  );

  const [error, setError] = useState<string | null>(null);

  // Validates responses and calculates the SUS score.
  const handleSubmit = () => {
    // Ensure every response is explicitly selected and in valid range.
    const invalid = responses.some(r => r === null || r < 1 || r > 5);

    if (invalid) {
      setError('Please answer all questions before submitting.');
      return;
    }

    const answers = responses as number[];
    const score = calculateSUS(answers);
    onComplete(score, answers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-2 text-2xl font-semibold text-slate-900">
          User Experience Survey
        </h2>
        <p className="mb-6 text-sm text-slate-500">
          Please rate your experience.
          1 = Strongly Disagree, 5 = Strongly Agree.
        </p>

        <div className="space-y-6">
          {questions.map((q, i) => (
            <div
              key={i}
              className="border-b border-slate-100 pb-4"
            >
              <p className="mb-3 text-sm font-medium text-slate-800">
                {i + 1}. {q}
              </p>

              <div className="flex justify-between gap-2">
                {[1, 2, 3, 4, 5].map(val => (
                  <button
                    key={val}
                    onClick={() => {
                      const next = [...responses];
                      next[i] = val;
                      setResponses(next);
                      if (error) setError(null);
                    }}
                    className={`flex-1 py-2 rounded-md border text-sm font-bold transition-all ${
                      responses[i] === val
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          className="mt-8 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Submit Evaluation
        </button>
      </div>
    </div>
  );
}
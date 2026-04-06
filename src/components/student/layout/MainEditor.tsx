import React from 'react';
import type { AuthUser, UserProfile } from '../../../types';
import type { Problem } from '../../../utils/problemDatabase';
import CodeEditor from '../CodeEditor';
import FactorialVisualizer from '../visualizers/FactorialVisualizer';
import BubbleSortVisualizer from '../visualizers/BubbleSortVisualizer';
import BinarySearchVisualizer from '../visualizers/BinarySearchVisualizer';
import ASTTestPanel from '../../ASTTestPanel';

interface MainEditorProps {
  currentProblem: Problem;
  code: string;
  onCodeChange: (code: string) => void;
  output: string;
  error: string;
  hints: string[];
  running: boolean;
  failureCount: number;
  activeTab: 'code' | 'visualization' | 'analysis';
  onTabChange: (tab: 'code' | 'visualization' | 'analysis') => void;
  onRunCode: () => void;
  isSolved: boolean;
  userProfile: UserProfile;
  authUser: AuthUser;
  feedbackRating: number | null;
  feedbackComment: string;
  feedbackMessage: string | null;
  onFeedbackRating: (n: number) => void;
  onFeedbackComment: (v: string) => void;
  onSubmitFeedback: () => void;
}

const MainEditor: React.FC<MainEditorProps> = ({
  currentProblem,
  code,
  onCodeChange,
  output,
  error,
  hints,
  running,
  failureCount,
  activeTab,
  onTabChange,
  onRunCode,
  isSolved,
  userProfile,
  authUser,
  feedbackRating,
  feedbackComment,
  feedbackMessage,
  onFeedbackRating,
  onFeedbackComment,
  onSubmitFeedback,
}) => (
  <div className="col-span-9 space-y-6">
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{currentProblem.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                currentProblem.difficulty === 'hard'
                  ? 'bg-rose-100 text-rose-700'
                  : currentProblem.difficulty === 'medium'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {currentProblem.difficulty}
            </span>
            <span className="text-xs text-slate-500">
              Concepts: {currentProblem.concepts.join(', ')}
            </span>
          </div>
        </div>
        {isSolved && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            Solved
          </span>
        )}
      </div>
      <p className="mt-3 text-sm text-slate-600">{currentProblem.description}</p>

      {currentProblem.exampleCases.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Examples</div>
          <div className="flex flex-wrap gap-3">
            {currentProblem.exampleCases.map((tc, i) => (
              <div key={i} className="rounded-lg border bg-slate-50 px-3 py-2 font-mono text-xs">
                {tc.input && (
                  <span className="text-slate-500">
                    Input: <span className="text-slate-800">{tc.input}</span> {'-> '}
                  </span>
                )}
                <span className="font-semibold text-indigo-700">{tc.output.trim()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex border-b bg-slate-50 px-4">
        {(['code', 'visualization', 'analysis'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`border-b-2 px-6 py-3 text-xs font-semibold uppercase transition-colors ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab === 'analysis' ? 'Code Analysis' : tab}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'code' && (
          <>
            <CodeEditor code={code} onChange={onCodeChange} />

            <div className="flex gap-4 mt-4">
              <button
                onClick={onRunCode}
                disabled={running}
                className="flex-1 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {running ? 'Running…' : 'RUN CODE'}
              </button>
            </div>

            {isSolved && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                Problem solved. You can continue experimenting.
              </div>
            )}

            {(output || error) && (
              <div className="mt-4">
                {isSolved && (
                  <div className="rounded-t-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                    All test cases passed
                  </div>
                )}
                <div
                  className={`p-4 font-mono text-xs shadow-inner ${
                    isSolved ? 'rounded-b-lg' : 'rounded-lg'
                  } ${error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-900 text-gray-100'}`}
                >
                  {error ? (
                    <div className="whitespace-pre-wrap">{error}</div>
                  ) : (
                    <div className="whitespace-pre-wrap">
                      <span className="text-gray-500 mr-2">$ python solution.py</span>
                      <br />
                      {output || '(No output produced)'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {hints.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-amber-800">
                  Adaptive Hints
                  {failureCount > 0 && (
                    <span className="ml-1 text-xs font-normal text-amber-700">
                      (attempt {failureCount}: hints scaled to your mastery level)
                    </span>
                  )}
                </h3>
                <ul className="space-y-2">
                  {hints.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                      <span className="mt-0.5 font-semibold">{i + 1}.</span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isSolved && userProfile.solvedSolutions[currentProblem.id] && (
              <details className="mt-4 bg-gray-50 border rounded-lg">
                <summary className="px-4 py-2 text-xs font-bold uppercase text-gray-500 cursor-pointer select-none hover:bg-gray-100">
                  View Your Submitted Solution
                </summary>
                <pre className="px-4 pb-4 text-xs font-mono whitespace-pre-wrap text-gray-700">
                  {userProfile.solvedSolutions[currentProblem.id]}
                </pre>
              </details>
            )}

            {authUser.role === 'student' && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Rate this problem</h3>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-slate-500">Difficulty rating:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => onFeedbackRating(n)}
                        className={`w-8 h-8 rounded-full text-sm font-bold border transition-colors ${
                          feedbackRating === n
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-400'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={feedbackComment}
                  onChange={e => onFeedbackComment(e.target.value)}
                  placeholder="Optional comments (e.g. what was confusing, what helped)…"
                  className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  rows={2}
                />
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={onSubmitFeedback}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    Submit Feedback
                  </button>
                  {feedbackMessage && <p className="text-sm text-slate-600">{feedbackMessage}</p>}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'visualization' && (
          <div className="min-h-100 flex items-start justify-center">
            {currentProblem.visualization === 'factorial' && <FactorialVisualizer initialN={5} />}
            {currentProblem.visualization === 'bubbleSort' && (
              <BubbleSortVisualizer initialArray="[64,34,25,12,22]" />
            )}
            {currentProblem.visualization === 'binarySearch' && (
              <BinarySearchVisualizer initialArray="[1,3,5,7,9]" initialTarget={5} />
            )}
            {!currentProblem.visualization && (
              <div className="opacity-30 text-center mt-16">
                <p className="text-xs font-bold uppercase">No visualizer available for this problem</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && <ASTTestPanel problemId={currentProblem.id} />}
      </div>
    </div>
  </div>
);

export default MainEditor;
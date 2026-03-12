import React from 'react';
import { Play, RefreshCw, Eye, Zap } from 'lucide-react';
import type { AuthUser, UserProfile } from '../../../types';
import CodeEditor from '../CodeEditor';
import FactorialVisualizer from '../visualizers/FactorialVisualizer';
import BubbleSortVisualizer from '../visualizers/BubbleSortVisualizer';
import BinarySearchVisualizer from '../visualizers/BinarySearchVisualizer';
import ASTTestPanel from '../../ASTTestPanel';

interface MainEditorProps {
  currentProblem: any;
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
    {/* Problem description */}
    <div className="bg-white p-6 rounded-xl border">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black">{currentProblem.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                currentProblem.difficulty === 'hard'
                  ? 'bg-red-100 text-red-600'
                  : currentProblem.difficulty === 'medium'
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {currentProblem.difficulty}
            </span>
            <span className="text-xs text-gray-400">
              Concepts: {currentProblem.concepts.join(', ')}
            </span>
          </div>
        </div>
        {isSolved && (
          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
            ✓ Solved
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 mt-3">{currentProblem.description}</p>

      {currentProblem.exampleCases.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-bold text-gray-400 uppercase mb-2">Examples</div>
          <div className="flex flex-wrap gap-3">
            {currentProblem.exampleCases.map((tc: any, i: number) => (
              <div key={i} className="bg-gray-50 border rounded-lg px-3 py-2 font-mono text-xs">
                {tc.input && (
                  <span className="text-gray-500">
                    Input: <span className="text-gray-800">{tc.input}</span> →{' '}
                  </span>
                )}
                <span className="text-indigo-600 font-bold">{tc.output.trim()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Tabs */}
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="bg-gray-50 border-b px-4 flex">
        {(['code', 'visualization', 'analysis'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-6 py-3 text-xs font-bold uppercase border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab === 'analysis' ? '🔍 Code Analysis' : tab}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* ---- Code Tab ---- */}
        {activeTab === 'code' && (
          <>
            <CodeEditor code={code} onChange={onCodeChange} />

            <div className="flex gap-4 mt-4">
              <button
                onClick={onRunCode}
                disabled={running}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {running ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                {running ? 'Running…' : 'RUN CODE'}
              </button>
            </div>

            {isSolved && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg mt-4 flex items-center gap-2 text-sm font-bold">
                <Zap size={14} /> Problem solved! You can continue experimenting.
              </div>
            )}

            {(output || error) && (
              <div className="mt-4">
                {isSolved && (
                  <div className="bg-emerald-600 text-white px-3 py-2 rounded-t-lg text-xs font-bold flex items-center gap-2">
                    <Zap size={12} /> ALL TEST CASES PASSED
                  </div>
                )}
                <div
                  className={`p-4 font-mono text-xs shadow-inner ${
                    isSolved ? 'rounded-b-lg' : 'rounded-lg'
                  } ${error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-900 text-gray-100'}`}
                >
                  {error ? (
                    <div className="whitespace-pre-wrap">⚠️ {error}</div>
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
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mt-4">
                <h3 className="font-bold text-amber-800 mb-2 text-sm flex items-center gap-2">
                  💡 Adaptive Hints
                  {failureCount > 0 && (
                    <span className="text-xs font-normal text-amber-600 ml-1">
                      (attempt {failureCount} — hints scaled to your mastery level)
                    </span>
                  )}
                </h3>
                <ul className="space-y-2">
                  {hints.map((h, i) => (
                    <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                      <span className="font-bold mt-0.5">{i + 1}.</span>
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
              <div className="bg-white p-5 rounded-xl border mt-6">
                <h3 className="font-bold text-sm mb-3 text-gray-700">Rate this problem</h3>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-gray-500">Difficulty rating:</span>
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
                  className="border px-3 py-2 rounded-lg w-full text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  rows={2}
                />
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={onSubmitFeedback}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors"
                  >
                    Submit Feedback
                  </button>
                  {feedbackMessage && <p className="text-sm text-gray-600">{feedbackMessage}</p>}
                </div>
              </div>
            )}
          </>
        )}

        {/* ---- Visualization Tab ---- */}
        {activeTab === 'visualization' && (
          <div className="min-h-[400px] flex justify-center items-start">
            {currentProblem.visualization === 'factorial' && <FactorialVisualizer initialN={5} />}
            {currentProblem.visualization === 'bubbleSort' && (
              <BubbleSortVisualizer initialArray="[64,34,25,12,22]" />
            )}
            {currentProblem.visualization === 'binarySearch' && (
              <BinarySearchVisualizer initialArray="[1,3,5,7,9]" initialTarget={5} />
            )}
            {!currentProblem.visualization && (
              <div className="opacity-30 text-center mt-16">
                <Eye size={48} className="mx-auto mb-2" />
                <p className="text-xs font-bold uppercase">No visualizer available for this problem</p>
              </div>
            )}
          </div>
        )}

        {/* ---- Code Analysis Tab ---- */}
        {activeTab === 'analysis' && <ASTTestPanel problemId={currentProblem.id} />}
      </div>
    </div>
  </div>
);

export default MainEditor;
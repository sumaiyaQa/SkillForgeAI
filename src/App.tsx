import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Play,
  RefreshCw,
  BookOpen,
  Eye,
  Code2,
  Zap,
  Download
} from 'lucide-react';
import { problemDatabase, type Problem } from './utils/problemDatabase';
import { runPython } from './utils/pythonRunner';
import { exportStudyData } from './utils/study';

import FactorialVisualizer from './components/student/visualizers/FactorialVisualizer';
import BubbleSortVisualizer from './components/student/visualizers/BubbleSortVisualizer';
import BinarySearchVisualizer from './components/student/visualizers/BinarySearchVisualizer';

import CodeEditor from './components/student/CodeEditor';
import Login from './components/auth/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import SUSSurvey from './components/SUSSurvey';

interface UserProfile {
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  problemsSolved: number;
  solvedProblemIds: number[];
  hintsUsed: number;
  totalSubmissions: number;
  successfulSubmissions: number;
  totalSolveTimeSeconds: number;
  averageSolveTimeSeconds: number;
  lastSolveTimeSeconds: number;
  errorPatterns: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  conceptMastery: Record<string, number>;
  learningTrajectory: Array<{
    timestamp: number;
    overallMastery: number;
  }>;

  errorHistory: Array<{
    timestamp: number;
    errorType: string;
  }>;

  solvedSolutions: Record<number, string>;


}

interface AuthUser {
  token: string;
  role: 'student' | 'admin';
  email: string;

}

const initialUserProfile: UserProfile = {
  skillLevel: 'beginner',
  problemsSolved: 0,
  solvedProblemIds: [],
  hintsUsed: 0,
  totalSubmissions: 0,
  successfulSubmissions: 0,
  totalSolveTimeSeconds: 0,
  averageSolveTimeSeconds: 0,
  lastSolveTimeSeconds: 0,
  errorPatterns: {},
  strengths: [],
  weaknesses: [],
  conceptMastery: {},
  learningTrajectory: [],
  errorHistory: [],

  solvedSolutions: {},


};

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
  const [view, setView] = useState<'student' | 'admin'>('student');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [finalSUSScore, setFinalSUSScore] = useState<number | null>(null);
  const [failureCount, setFailureCount] = useState(0);

  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);



  // Adaptive filtering
  const recommendedProblems = useMemo(() => {
    return [...problemDatabase].sort((a, b) => {
      const scoreA =
        a.concepts.reduce(
          (sum, c) => sum + (userProfile.conceptMastery[c] ?? 0.5),
          0
        ) / a.concepts.length;

      const scoreB =
        b.concepts.reduce(
          (sum, c) => sum + (userProfile.conceptMastery[c] ?? 0.5),
          0
        ) / b.concepts.length;

      return scoreA - scoreB;
    });
  }, [userProfile]);




  const [currentProblem, setCurrentProblem] = useState<Problem>(problemDatabase[0]);
  const [code, setCode] = useState<string>(currentProblem.starterCode);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [hints, setHints] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'visualization'>('code');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);



  //PROGRESS METRICS

  // Percentage of problems solved at current skill level
  const solvedCount = userProfile.solvedProblemIds?.length ?? 0;

  const totalProblems = problemDatabase.length;
  const progressPercent =
    totalProblems > 0
      ? (solvedCount / totalProblems) * 100
      : 0;


  // Submission success rate
  const successRate =
    userProfile.totalSubmissions > 0
      ? Math.round(
        (userProfile.successfulSubmissions /
          userProfile.totalSubmissions) * 100
      )
      : 0;


  // Auth
  useEffect(() => {
    const raw = localStorage.getItem("skillforge:auth");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Validate that we have all required fields
        if (parsed.token && parsed.role && parsed.email) {
          setAuthUser(parsed);
        } else {
          console.error("Invalid auth data in localStorage:", parsed);
          localStorage.removeItem("skillforge:auth");
        }
      } catch (e) {
        console.error("Failed to parse auth data");
        localStorage.removeItem("skillforge:auth");
      }
    }
    setAuthChecked(true);
  }, []);



  // Load progress
  useEffect(() => {
    if (!authUser || authUser.role !== 'student') return;

    const loadProgress = async () => {
      try {
        const res = await fetch('http://localhost:4000/progress', {
          headers: { Authorization: `Bearer ${authUser.token}` },
        });
        const data = await res.json();

        if (data?.profile?.skillLevel) {
          setUserProfile({
            ...initialUserProfile,
            ...data.profile,
            solvedProblemIds: data.profile.solvedProblemIds ?? [],
          });

          const found = problemDatabase.find(p => p.id === data.last_problem_id);
          const start =
            found ??
            recommendedProblems[0] ??
            problemDatabase[0];

          setCurrentProblem(start);
          setCode(data.last_code ?? start.starterCode);
        }
      } catch (err) {
        console.error('Failed to load progress', err);
      }
    };

    loadProgress();
  }, [authUser]);

  // SUS Survey
  useEffect(() => {
    if (userProfile.problemsSolved >= 3 && !finalSUSScore) {
      setShowSurvey(true);
    }
  }, [userProfile.problemsSolved, finalSUSScore]);

  // Autosave
  const saveProgress = useCallback(async () => {
    if (!authUser || isSaving) return;
    
    setIsSaving(true);
    try {
      await fetch('http://localhost:4000/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authUser.token}`,
        },
        body: JSON.stringify({
          profile: userProfile,
          lastProblemId: currentProblem.id,
          lastCode: code,
        }),
      });
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setIsSaving(false);
    }
  }, [authUser, userProfile, currentProblem.id, code, isSaving]);

  useEffect(() => {
    if (!authUser) return;

    const timeout = setTimeout(() => {
      saveProgress();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [userProfile, code, authUser, saveProgress]);


  // Reset on problem change
  useEffect(() => {

    const saved = userProfile.solvedSolutions[currentProblem.id];

    if (saved) {
      setCode(saved);
    } else {
      setCode(currentProblem.starterCode);
    }

    // setCode(currentProblem.starterCode);
    setOutput('');
    setError('');
    setHints([]);
    setFailureCount(0);
    setSessionStartTime(Date.now());
  }, [currentProblem, userProfile.solvedSolutions]);

  // Run code
  const handleRunCode = async () => {
    setRunning(true);
    setOutput('');
    setError('');
    setHints([]);

    try {
      const res = await runPython(code, currentProblem.exampleCases, currentProblem.functionName);

      // 1. Update UI Console
      setOutput(res.output || '');
      setError(res.error || '');
      
      // 2. FORCE HINTS: Show AST hints immediately, even if the code "passed"
      if (res.hints && res.hints.length > 0) {
        setHints(res.hints);
      }

      // 3. Process Statistics & Mastery
      setUserProfile(prev => {
        const isAlreadySolved = prev.solvedProblemIds.includes(currentProblem.id);
        if (isAlreadySolved) {
          return {
            ...prev,
            solvedSolutions: { ...prev.solvedSolutions, [currentProblem.id]: code }
          };
        }

        const newTotalSubmissions = prev.totalSubmissions + 1;

        if (res.passed) {
          const updatedMastery = { ...prev.conceptMastery };
          currentProblem.concepts.forEach(c => {
            updatedMastery[c] = Math.min(1, (updatedMastery[c] ?? 0.5) + 0.1);
          });

          return {
            ...prev,
            totalSubmissions: newTotalSubmissions,
            successfulSubmissions: prev.successfulSubmissions + 1,
            problemsSolved: prev.solvedProblemIds.length + 1,
            solvedProblemIds: [...prev.solvedProblemIds, currentProblem.id],
            conceptMastery: updatedMastery,
            solvedSolutions: { ...prev.solvedSolutions, [currentProblem.id]: code }
          };
        }

        return { ...prev, totalSubmissions: newTotalSubmissions };
      });

      // 4. SCAFFOLDING LOGIC: If code fails OR has structural issues, increment failure count
      // This ensures Bloom's Taxonomy hints trigger even if the logic is "accidentally" right
      const hasStructuralIssues = res.hints && res.hints.length > 0;
      if (!res.passed || hasStructuralIssues) {
        setFailureCount(f => f + 1);
        
        // Dynamically pull from problemDatabase hints based on failureCount
        const bloomLevelHint = currentProblem.hints.find(h => h.scaffolding === Math.min(failureCount + 1, 3));
        if (bloomLevelHint && !res.hints?.includes(bloomLevelHint.content)) {
          setHints(prev => [...prev, bloomLevelHint.content]);
        }
      }

    } catch (err) {
      setError('System Error: ' + String(err));
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!authUser || authUser.role !== 'student') return;

    try {
      const res = await fetch('http://localhost:4000/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authUser.token}`,
        },
        body: JSON.stringify({
          problemId: currentProblem.id,
          rating: feedbackRating,
          comment: feedbackComment,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit feedback');
      }

      setFeedbackMessage('Feedback submitted successfully!');
      setFeedbackRating(null);
      setFeedbackComment('');
    } catch (err) {
      setFeedbackMessage('Error submitting feedback');
    }
  };


  //  Recommend next problem 
  const recommendNextProblem = () => {
    const idx = recommendedProblems.findIndex(p => p.id === currentProblem.id);
    const next = recommendedProblems[idx + 1];
    if (next) setCurrentProblem(next);
  };

  const handleLogout = () => {
    localStorage.removeItem('skillforge:auth');
    setAuthUser(null);
  };

  if (!authChecked) return <div className="p-6 font-mono">Initializing…</div>;
  if (!authUser) return <Login
    onLogin={(auth) => {
      const userData = {
        token: auth.token,
        role: auth.role,
        email: auth.email,
      };

      localStorage.setItem("skillforge:auth", JSON.stringify(userData));
      setAuthUser(userData);
    }}
  />


  return (
    <div className="min-h-screen bg-gray-50">
      {showSurvey && (
        <SUSSurvey
          onComplete={score => {
            setFinalSUSScore(score);
            setShowSurvey(false);
          }}
        />
      )}

      {view === 'admin' ? (
        <AdminDashboard token={authUser.token} />
      ) : (
        <>
          {/* HEADER */}
          <header className="bg-white border-b shadow-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between">
              <div className="flex gap-3 items-center">
                <div className="bg-indigo-600 p-2 rounded-lg">
                  <Code2 className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="font-bold text-xl">SkillForge AI</h1>
                  <p className="text-xs text-gray-500 uppercase">Adaptive Tutor</p>
                </div>
              </div>

              <div className="flex gap-6 items-center">
                <button
                  onClick={exportStudyData}
                  className="flex gap-2 text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded"
                >
                  <Download size={12} /> EXPORT
                </button>
                {authUser.role === 'admin' && (
                  <button
                    onClick={() => setView('admin')}
                    className="text-xs font-bold text-indigo-600 border px-3 py-1 rounded-full"
                  >
                    Admin
                  </button>
                )}

                <div className="border-l pl-6 flex gap-6 items-center">
                  {/* Skill Level */}
                  <div className="text-center">
                    <div className="text-[10px] text-gray-400 font-bold">LEVEL</div>
                    <div className="font-bold text-indigo-600 capitalize">
                      {userProfile.skillLevel}
                    </div>
                  </div>

                  {/* Solved Count */}
                  <div className="text-center">
                    <div className="text-[10px] text-gray-400 font-bold">SOLVED</div>
                    <div className="font-bold">
                      {userProfile.solvedProblemIds.length}
                      <span className="text-gray-400">
                        /{problemDatabase.length}
                      </span>
                    </div>
                  </div>

                  {/* Success Rate */}
                  <div className="text-center">
                    <div className="text-[10px] text-gray-400 font-bold">SUCCESS</div>
                    <div className="font-bold text-emerald-600">
                      {successRate}%
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-32">
                    <div className="text-[10px] text-gray-400 font-bold mb-1">
                      PROGRESS
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-right text-gray-500 mt-1">
                      {Math.round(progressPercent)}%
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Logged in as</span>
                    <span className="text-xs font-black text-indigo-600">
                      {authUser.email ? authUser.email.split('@')[0] : 'Guest User'}
                    </span>
                  </div>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="text-xs font-semibold text-red-500"
                  >
                    LOGOUT
                  </button>
                </div>

              </div>
            </div>
          </header>

          <div className="bg-indigo-50 p-4 rounded-lg mb-4">
            <h4 className="font-bold text-sm mb-2">
              Recommended Focus
            </h4>
            <p className="text-xs">
              Strengthen: {
                Object.entries(userProfile.conceptMastery)
                  .sort((a, b) => a[1] - b[1])[0]?.[0] ?? "Start solving problems"
              }
            </p>
          </div>


          {/* MAIN */}
          <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
            {/* Sidebar */}
            <div className="col-span-3 space-y-6">
              <div className="bg-white p-4 rounded-xl border">
                <h3 className="text-sm font-bold mb-4 flex gap-2 items-center">
                  <BookOpen size={16} /> Tasks
                </h3>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {recommendedProblems.map(p => {
                    const solved = userProfile.solvedProblemIds.includes(p.id);

                    return (
                      <button
                        key={p.id}
                        onClick={() => setCurrentProblem(p)}
                        className={`w-full text-left p-3 rounded-lg border flex justify-between items-center ${p.id === currentProblem.id
                          ? 'bg-indigo-50 border-indigo-500'
                          : 'bg-gray-50'
                          }`}
                      >
                        <div>
                          <div className="text-xs font-bold">{p.title}</div>
                          <div className="text-[10px] uppercase font-bold text-indigo-600">
                            {p.difficulty}
                          </div>
                        </div>

                        {solved && (
                          <span className="text-emerald-600 font-bold text-sm">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}

                </div>
              </div>

              <button
                onClick={recommendNextProblem}
                className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold flex justify-center gap-2"
              >
                <Zap size={16} /> NEXT PROBLEM
              </button>
            </div>

            {/* Editor */}
            <div className="col-span-9 space-y-6">
              <div className="bg-white p-6 rounded-xl border">
                <h2 className="text-2xl font-black">{currentProblem.title}</h2>
                <p className="text-sm text-gray-600 mt-2">
                  {currentProblem.description}
                </p>
              </div>


              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="bg-gray-50 border-b px-4 flex">
                  {['code', 'visualization'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`px-6 py-3 text-xs font-bold uppercase border-b-2 ${activeTab === tab
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-400'
                        }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {activeTab === 'code' ? (


                    <>
                      <CodeEditor code={code} onChange={setCode} />

                      <div className="flex gap-4 mt-6">
                        <button
                          onClick={handleRunCode}
                          disabled={running}
                          className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold flex justify-center gap-2"
                        >
                          {running ? (
                            <RefreshCw className="animate-spin" size={18} />
                          ) : (
                            <Play size={18} />
                          )}
                          RUN CODE
                        </button>
                      </div>

                      {userProfile.solvedProblemIds.includes(currentProblem.id) && (
                        <div className="bg-gray-50 border p-4 rounded-lg mt-4">
                          <h4 className="font-bold text-xs uppercase text-gray-500 mb-2">
                            Your Submitted Solution
                          </h4>
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {userProfile.solvedSolutions[currentProblem.id]}
                          </pre>
                        </div>
                      )}

                      {hints.length > 0 && (
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mt-4">
                          <h3 className="font-bold text-amber-800 mb-2">💡 Hints</h3>
                          <ul className="space-y-1">
                            {hints.map((h, i) => (
                              <li key={i} className="text-sm text-amber-700">
                                {h}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {userProfile.solvedProblemIds.includes(currentProblem.id) && (
                        <div className="bg-emerald-100 text-emerald-700 p-2 rounded mb-2 text-xs font-bold flex items-center gap-2">
                          <Zap size={14} /> Task Requirement Met! You can continue to experiment.
                        </div>
                      )}
                      {/* Always show the console if there is output OR an error, regardless of pass status */}
                      {(output || error) && (
                        <div className="mt-4">
                          {/* SUCCESS LABEL (Only shows if passed) */}
                          {userProfile.solvedProblemIds.includes(currentProblem.id) && (
                            <div className="bg-emerald-600 text-white p-2 rounded-t-lg text-xs font-bold flex items-center gap-2">
                              <Zap size={14} /> CORRECT SOLUTION DETECTED
                            </div>
                          )}

                          {/* ACTUAL OUTPUT CONSOLE */}
                          <div className={`p-4 rounded-b-lg font-mono text-xs shadow-inner ${error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-900 text-gray-100'
                            }`}>
                            {error ? (
                              <div className="whitespace-pre-wrap">⚠️ {error}</div>
                            ) : (
                              <div className="whitespace-pre-wrap">
                                <span className="text-gray-500 mr-2">$ python solution.py</span>
                                <br />
                                {output || "(No output produced)"}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* STUDENT FEEDBACK */}
                      {authUser.role === 'student' && (
                        <div className="bg-white p-6 rounded-xl border mt-6">
                          <h3 className="font-bold mb-3">Submit Feedback</h3>

                          <div className="mb-3">
                            <label className="text-sm font-semibold block mb-1">
                              Rating (1–5)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={feedbackRating ?? ''}
                              onChange={(e) =>
                                setFeedbackRating(Number(e.target.value))
                              }
                              className="border px-3 py-2 rounded w-24"
                            />
                          </div>

                          <div className="mb-3">
                            <label className="text-sm font-semibold block mb-1">
                              Comment
                            </label>
                            <textarea
                              value={feedbackComment}
                              onChange={(e) =>
                                setFeedbackComment(e.target.value)
                              }
                              className="border px-3 py-2 rounded w-full"
                              rows={3}
                            />
                          </div>

                          <button
                            onClick={handleSubmitFeedback}
                            className="bg-indigo-600 text-white px-4 py-2 rounded font-bold"
                          >
                            Submit Feedback
                          </button>

                          {feedbackMessage && (
                            <p className="text-sm mt-2">{feedbackMessage}</p>
                          )}
                        </div>
                      )}

                    </>
                  ) : (
                    <div className="min-h-[400px] flex justify-center items-center">
                      {currentProblem.visualization === 'factorial' && (
                        <FactorialVisualizer initialN={5} />
                      )}
                      {currentProblem.visualization === 'bubbleSort' && (
                        <BubbleSortVisualizer initialArray="[64,34,25,12,22]" />
                      )}
                      {currentProblem.visualization === 'binarySearch' && (
                        <BinarySearchVisualizer
                          initialArray="[1,3,5,7,9]"
                          initialTarget={5}
                        />
                      )}
                      {!currentProblem.visualization && (
                        <div className="opacity-30 text-center">
                          <Eye size={48} className="mx-auto mb-2" />
                          <p className="text-xs font-bold uppercase">
                            No Visualizer
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </>
      )}

      {view === 'admin' && (
        <button
          onClick={() => setView('student')}
          className="fixed bottom-6 right-6 bg-indigo-600 text-white px-4 py-2 rounded-full font-bold"
        >
          Back to Student
        </button>
      )}
    </div>
  );
};

export default App;
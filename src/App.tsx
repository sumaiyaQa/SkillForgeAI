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
import FactorialVisualizer from './components/visualizers/FactorialVisualizer';
import BubbleSortVisualizer from './components/visualizers/BubbleSortVisualizer';
import BinarySearchVisualizer from './components/visualizers/BinarySearchVisualizer';
import CodeEditor from './components/CodeEditor';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
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
}

interface AuthUser {
  token: string;
  role?: 'student' | 'admin';

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
};

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
  const [view, setView] = useState<'student' | 'admin'>('student');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [finalSUSScore, setFinalSUSScore] = useState<number | null>(null);

  // Adaptive filtering
  const filteredProblems = useMemo(() => {
    return problemDatabase.filter(p => {
      if (userProfile.skillLevel === 'beginner') return p.difficulty === 'easy';
      if (userProfile.skillLevel === 'intermediate') return p.difficulty !== 'hard';
      return true;
    });
  }, [userProfile.skillLevel]);

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
  const progressPercent =
    filteredProblems.length > 0
      ? (userProfile.solvedProblemIds.length / filteredProblems.length) * 100
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
      setAuthUser(JSON.parse(raw));
    }
    setAuthChecked(true);
  }, []);




  // Load progress
  useEffect(() => {
    if (!authUser) return;

    const loadProgress = async () => {
      try {
        const res = await fetch('http://localhost:4000/progress', {
          headers: { Authorization: `Bearer ${authUser.token}` },
        });
        const data = await res.json();

        if (data?.profile?.skillLevel) {
          setUserProfile(data.profile);

          const found = problemDatabase.find(p => p.id === data.last_problem_id);
          const start = found ?? filteredProblems[0];

          setCurrentProblem(start);
          setCode(data.last_code ?? start.starterCode);
        }
      } catch (err) {
        console.error('Failed to load progress', err);
      }
    };

    loadProgress();
  }, [authUser, filteredProblems]);

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
    if (authUser && sessionStartTime) {
      const t = setTimeout(saveProgress, 2000);
      return () => clearTimeout(t);
    }
  }, [code, userProfile.problemsSolved, saveProgress, authUser, sessionStartTime]);

  // Reset on problem change
  useEffect(() => {
    setCode(currentProblem.starterCode);
    setOutput('');
    setError('');
    setHints([]);
    setSessionStartTime(Date.now());
  }, [currentProblem]);

  // Run code
  const handleRunCode = async () => {
    if (!sessionStartTime) setSessionStartTime(Date.now());

    setRunning(true);
    setOutput('');
    setError('');
    setHints([]);

    try {
      const res = await runPython(code);

      setOutput(res.output || '');
      setError(res.error || '');
      setHints(res.hints || []);

      // Count every attempt
      setUserProfile(prev => ({
        ...prev,
        totalSubmissions: prev.totalSubmissions + 1,
      }));

      // Stop if execution failed
      if (res.error) {
        setRunning(false);
        return;
      }

      const expected = currentProblem.exampleCases?.[0]?.output?.trim();
      const actual = res.output?.trim();

      if (expected === actual) {
        const solveTime =
          (Date.now() - (sessionStartTime ?? Date.now())) / 1000;

        setUserProfile(prev => {
          const alreadySolved = prev.solvedProblemIds.includes(
            currentProblem.id
          );

          const hasCritical = res.hints?.some(h =>
            h.includes('🚨')
          );

          if (hasCritical) return prev;

          const newSolved = !alreadySolved
            ? [...prev.solvedProblemIds, currentProblem.id]
            : prev.solvedProblemIds;

          const newProblemsSolved = !alreadySolved
            ? prev.problemsSolved + 1
            : prev.problemsSolved;

          const newTotalSolveTime =
            prev.totalSolveTimeSeconds + solveTime;

          return {
            ...prev,
            successfulSubmissions: prev.successfulSubmissions + 1,
            problemsSolved: newProblemsSolved,
            solvedProblemIds: newSolved,
            lastSolveTimeSeconds: solveTime,
            totalSolveTimeSeconds: newTotalSolveTime,
            averageSolveTimeSeconds:
              newTotalSolveTime /
              Math.max(1, newProblemsSolved),
          };
        });
      }
    } catch (err) {
      setError('Runtime Error: ' + String(err));
    }

    setRunning(false);
  };


  //  Recommend next problem 
  const recommendNextProblem = () => {
    const idx = filteredProblems.findIndex(p => p.id === currentProblem.id);
    const next = filteredProblems[idx + 1];
    if (next) setCurrentProblem(next);
  };

  const handleLogout = () => {
    localStorage.removeItem('skillforge:auth');
    setAuthUser(null);
  };

  if (!authChecked) return <div className="p-6 font-mono">Initializing…</div>;
  if (!authUser) return <Login onLogin={(auth) => setAuthUser({ token: auth.token, role: auth.role })} />;

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
                        /{filteredProblems.length}
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

          {/* MAIN */}
          <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
            {/* Sidebar */}
            <div className="col-span-3 space-y-6">
              <div className="bg-white p-4 rounded-xl border">
                <h3 className="text-sm font-bold mb-4 flex gap-2 items-center">
                  <BookOpen size={16} /> Tasks
                </h3>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {filteredProblems.map(p => {
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

                      {(output || error) && (
                        <div
                          className={`mt-4 p-4 rounded-lg font-mono text-xs ${error
                            ? 'bg-red-50 text-red-700'
                            : 'bg-gray-900 text-gray-100'
                            }`}
                        >
                          {error ? `ERROR: ${error}` : `OUTPUT: ${output}`}
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
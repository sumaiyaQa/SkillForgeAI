import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Play,
  RefreshCw,
  BookOpen,
  Eye,
  Code2,
  // Lightbulb,
  // CheckCircle,
  // XCircle,
  Zap,
  Download
} from 'lucide-react';
import { problemDatabase, type Problem } from './utils/problemDatabase';
import { runPython } from './utils/pythonRunner';
import { exportStudyData } from './utils/study';
import FactorialVisualizer from './components/FactorialVisualizer';
import BubbleSortVisualizer from './components/BubbleSortVisualizer';
import BinarySearchVisualizer from './components/BinarySearchVisualizer';
import CodeEditor from './components/CodeEditor';
import Login from './components/Login';
// import ASTTestPanel from './components/ASTTestPanel';
import AdminDashboard from './components/AdminDashboard';
import SUSSurvey from './components/SUSSurvey';

interface UserProfile {
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  problemsSolved: number;
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
}

// interface TestResult {
//   id: number;
//   passed: boolean;
//   expected: string;
//   actual: string;
// }

const initialUserProfile: UserProfile = {
  skillLevel: 'beginner',
  problemsSolved: 0,
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

  // 1. Adaptive Filtering Logic - MUST match the UserProfile level
  const filteredProblems = useMemo(() => {
    return problemDatabase.filter((problem) => {
      if (userProfile.skillLevel === 'beginner') return problem.difficulty === 'easy';
      if (userProfile.skillLevel === 'intermediate') return problem.difficulty !== 'hard';
      return true; // Advanced see everything
    });
  }, [userProfile.skillLevel]);

  const [currentProblem, setCurrentProblem] = useState<Problem>(problemDatabase[0]);
  const [code, setCode] = useState<string>(currentProblem.starterCode);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [hints, setHints] = useState<string[]>([]);
  // const [showHints, setShowHints] = useState<boolean>(false);
  // const [hintLevel, setHintLevel] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);
  // const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [activeTab, setActiveTab] = useState<'code' | 'visualization'>('code');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  // const [recommendationReason, setRecommendationReason] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  // const [showASTPanel, setShowASTPanel] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem("skillforge:token");
    if (token) setAuthUser({ token });
    setAuthChecked(true);
  }, []);

  // 2. Load progress & Handle level setting on Login
  useEffect(() => {
    if (!authUser) return;

    const loadProgress = async () => {
      try {
        const res = await fetch("http://localhost:4000/progress", {
          headers: { Authorization: `Bearer ${authUser.token}` },
        });
        const data = await res.json();

        if (data && data.profile) {
          // This is the key: Force the UI to use the database level (Advanced)
          setUserProfile(data.profile);

          // Filter the database based on the NEWLY fetched level
          const possibleProblems = problemDatabase.filter(p => {
            if (data.profile.skillLevel === 'advanced') return true; // Advanced see all
            if (data.profile.skillLevel === 'intermediate') return p.difficulty !== 'hard';
            return p.difficulty === 'easy';
          });

          const found = problemDatabase.find(p => p.id === data.last_problem_id);

          if (found) {
            setCurrentProblem(found);
            setCode(data.last_code ?? found.starterCode);
          } else {
            // If they are Advanced but have solved nothing, show the first Hard problem
            const startProblem = possibleProblems.find(p =>
              data.profile.skillLevel === 'advanced' ? p.difficulty === 'hard' : p.difficulty === 'easy'
            ) || possibleProblems[0];

            setCurrentProblem(startProblem);
            setCode(startProblem.starterCode);
          }
        }
      } catch (err) {
        console.error("Failed to sync Advanced profile", err);
      }
    };
    loadProgress();
  }, [authUser]);

  // SUS Survey Trigger
  useEffect(() => {
    if (userProfile.problemsSolved >= 3 && !finalSUSScore) {
      setShowSurvey(true);
    }
  }, [userProfile.problemsSolved, finalSUSScore]);

  // Stable Auto-save
  const saveProgress = useCallback(async () => {
    if (!authUser || isSaving) return;
    setIsSaving(true);
    try {
      await fetch("http://localhost:4000/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authUser.token}`,
        },
        body: JSON.stringify({
          profile: userProfile,
          lastProblemId: currentProblem.id,
          lastCode: code,
        }),
      });
    } catch (err) {
      console.error("Failed to save progress", err);
    } finally {
      setIsSaving(false);
    }
  }, [authUser, userProfile, currentProblem.id, code, isSaving]);

  useEffect(() => {
    if (authUser && sessionStartTime) {
      const timeout = setTimeout(() => saveProgress(), 2000);
      return () => clearTimeout(timeout);
    }
  }, [code, userProfile.skillLevel, userProfile.problemsSolved, saveProgress]);

  // Reset problem state
  useEffect(() => {
    setCode(currentProblem.starterCode);
    setOutput('');
    setError('');
    setHints([]);
    // setShowHints(false);
    // setHintLevel(0);
    // setTestResults([]);
    setSessionStartTime(Date.now());
  }, [currentProblem]);

  // const normalizeOutput = (out: string): string => {
  //   const lines = out.split('\n').map(l => l.trim()).filter(l => l !== '');
  //   return lines.length === 0 ? '' : lines[lines.length - 1];
  // };

  const handleRunCode = async () => {
    if (!sessionStartTime) setSessionStartTime(Date.now());

    setUserProfile(prev => ({
      ...prev,
      totalSubmissions: prev.totalSubmissions + 1
    }));

    setRunning(true);
    setOutput('');
    setError('');
    setHints([]);

    try {
      const res = await runPython(code);

      setOutput(res.output || '');
      setError(res.error || '');
      setHints(res.hints || []);

      // If code ran successfully and produced output, count as a successful attempt
      if (!res.error) {
        const solveTime = (Date.now() - sessionStartTime!) / 1000;

        setUserProfile(prev => ({
          ...prev,
          successfulSubmissions: prev.successfulSubmissions + 1,
          lastSolveTimeSeconds: solveTime,
          totalSolveTimeSeconds: prev.totalSolveTimeSeconds + solveTime,
          averageSolveTimeSeconds:
            (prev.totalSolveTimeSeconds + solveTime) /
            Math.max(1, prev.successfulSubmissions + 1)
        }));
      }

    } catch (err) {
      setError('Runtime Error: ' + String(err));
    }

    setRunning(false);
  };


  // const getNextHint = () => {
  //   if (userProfile.totalSubmissions === 0) {
  //     setError("Try running your code at least once before asking for a hint!");
  //     return;
  //   }
  //   if (hintLevel < currentProblem.hints.length) {
  //     setHintLevel(prev => prev + 1);
  //     setShowHints(true);
  //     setUserProfile(prev => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
  //   }
  // };

  // const getLearnerState = () => {
  //   const rate = userProfile.totalSubmissions > 0 ? userProfile.successfulSubmissions / userProfile.totalSubmissions : 0;
  //   if (rate < 0.4) return "struggling";
  //   if (rate > 0.8) return "mastery";
  //   return "steady";
  // };

  const handleLogout = () => {
    localStorage.removeItem("skillforge:token");
    setAuthUser(null);
  };

  if (!authChecked) return <div className='p-6 font-mono'>Initializing SkillForge Engine...</div>;
  if (!authUser) return <Login onLogin={(token) => setAuthUser({ token })} />;

  return (
    <div className="min-h-screen bg-gray-50">
      {showSurvey && <SUSSurvey onComplete={(score) => { setFinalSUSScore(score); setShowSurvey(false); }} />}

      {view === 'admin' ? (
        <AdminDashboard token={authUser.token} />
      ) : (
        <>
          <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg"><Code2 className="text-white" size={24} /></div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 leading-none">SkillForge AI</h1>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Adaptive Tutor</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <button onClick={() => exportStudyData()} className="flex items-center gap-2 text-[10px] font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded hover:bg-amber-200">
                  <Download size={12} /> EXPORT DATA
                </button>
                <button onClick={() => setView('admin')} className="text-xs font-bold text-indigo-600 border border-indigo-600 px-3 py-1 rounded-full hover:bg-indigo-50">Switch to Admin</button>
                <div className="flex items-center gap-8 border-l pl-6">
                  <div className="text-center">
                    <div className="text-[10px] uppercase text-gray-400 font-bold">Level</div>
                    <div className="text-sm font-bold text-indigo-600 capitalize">{userProfile.skillLevel}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] uppercase text-gray-400 font-bold">Solved</div>
                    <div className="text-sm font-bold text-gray-900">{userProfile.problemsSolved}</div>
                  </div>
                  <button onClick={handleLogout} className="text-xs font-semibold text-red-500 hover:text-red-700">LOGOUT</button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
            {/* Sidebar with Filtered Tasks */}
            <div className="col-span-3 space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><BookOpen size={16} /> Filtered Tasks</h3>
                <div className="space-y-2 overflow-y-auto max-h-[50vh]">
                  {filteredProblems.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setCurrentProblem(p)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${currentProblem.id === p.id ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50'
                        }`}
                    >
                      <div className="text-xs font-bold">{p.title}</div>
                      <div className="text-[10px] uppercase font-bold text-indigo-600">{p.difficulty}</div>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setCurrentProblem(filteredProblems[0])}>
                <Zap size={16} /> ADAPTIVE CHOICE
              </button>
            </div>

            <div className="col-span-9 space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-2xl font-black text-gray-900">{currentProblem.title}</h2>
                <p className="text-gray-600 mt-2 text-sm">{currentProblem.description}</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-gray-50 border-b border-gray-200 px-4 flex">
                  {['code', 'visualization'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-3 text-xs font-bold uppercase border-b-2 transition-all ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{tab}</button>
                  ))}
                </div>

                <div className="p-6">
                  {activeTab === 'code' ? (
                    <div className="space-y-6">
                      <CodeEditor code={code} onChange={setCode} />
                      <div className="flex gap-4">
                        <button onClick={handleRunCode} disabled={running} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50">
                          {running ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />} RUN CODE
                        </button>
                        {/* <button onClick={getNextHint} disabled={hintLevel >= currentProblem.hints.length} className="flex-1 bg-amber-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-amber-600 disabled:opacity-50">
                          <Lightbulb size={18}/> HINT ({hintLevel}/{currentProblem.hints.length})
                        </button> */}
                        {/* <button onClick={() => setShowASTPanel(!showASTPanel)} className={`px-6 rounded-lg font-bold text-xs uppercase ${showASTPanel ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>AST</button> */}
                      </div>

                      {/* {showHints && hintLevel > 0 && (
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                          {currentProblem.hints.slice(0, hintLevel).map((h, i) => (
                            <p key={i} className="text-sm text-amber-700 mb-1"><strong>{i+1}.</strong> {h.content}</p>
                          ))}
                        </div>
                      )} */}

                      {hints.length > 0 && (
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                          <h3 className="text-sm font-bold text-amber-800 mb-2">
                            💡 Hints
                          </h3>
                          <ul className="space-y-1">
                            {hints.map((hint, i) => (
                              <li key={i} className="text-sm text-amber-700">
                                {hint}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}




                      {(output || error) && (
                        <div className={`p-4 rounded-lg font-mono text-xs ${error ? 'bg-red-50 text-red-700' : 'bg-gray-900 text-gray-100'}`}>
                          {error ? `ERROR: ${error}` : `OUTPUT: ${output}`}
                        </div>
                      )}

                      {/* {testResults.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {testResults.map(r => (
                            <div key={r.id} className={`p-2 rounded border flex items-center gap-2 text-[10px] font-bold ${r.passed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                              {r.passed ? <CheckCircle size={12}/> : <XCircle size={12}/>} CASE {r.id+1}
                            </div>
                          ))}
                        </div>
                      )} */}
                      {/* {showASTPanel && <ASTTestPanel problemId={currentProblem.id} studentCode={code} />} */}
                    </div>
                  ) : (
                    <div className="min-h-[400px] flex items-center justify-center">
                      {currentProblem.visualization === 'factorial' && <FactorialVisualizer initialN={5} />}
                      {currentProblem.visualization === 'bubbleSort' && <BubbleSortVisualizer initialArray="[64, 34, 25, 12, 22]" />}
                      {currentProblem.visualization === 'binarySearch' && <BinarySearchVisualizer initialArray="[1, 3, 5, 7, 9]" initialTarget={5} />}
                      {!currentProblem.visualization && <div className="text-center opacity-30"><Eye size={48} className="mx-auto mb-2" /><p className="text-xs font-bold uppercase">No Visualizer for this Task</p></div>}
                    </div>
                  )}
                </div>
              </div>




              {/* <div className="bg-indigo-900 rounded-xl p-4 text-white flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/10 rounded-lg"><Zap size={20} className="text-amber-400" /></div>
                  <div>
                    <div className="text-[10px] font-bold text-white/50 uppercase">Current State</div>
                    <div className="text-sm font-black uppercase tracking-widest">{getLearnerState()}</div>
                  </div>
                </div>
<button onClick={() => setCurrentProblem(filteredProblems[0])}>
              </div> */}
            </div>
          </main>
        </>
      )}

      {view === 'admin' && (
        <button onClick={() => setView('student')} className="fixed bottom-6 right-6 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl font-bold text-sm z-50 hover:scale-105">Back to Student View</button>
      )}
    </div>
  );
};

export default App;
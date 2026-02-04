import React, { useEffect, useState, useCallback } from 'react';
import {
  Play,
  RefreshCw,
  BookOpen,
  Eye,
  Code2,
  Lightbulb,
  CheckCircle,
  XCircle,
  Zap,
} from 'lucide-react';
import { problemDatabase, type Problem } from './utils/problemDatabase';
import { runPython } from './utils/pythonRunner';
import FactorialVisualizer from './components/FactorialVisualizer';
import BubbleSortVisualizer from './components/BubbleSortVisualizer';
import BinarySearchVisualizer from './components/BinarySearchVisualizer';
import CodeEditor from './components/CodeEditor';
import Login from './components/Login';
import ASTTestPanel from './components/ASTTestPanel';

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

interface AuthUser{
  token: string;
}


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

interface TestResult {
  id: number;
  passed: boolean;
  expected: string;
  actual: string;
}




const App: React.FC = () => {
  const [currentProblem, setCurrentProblem] = useState<Problem>(problemDatabase[0]);
  const [code, setCode] = useState<string>(currentProblem.starterCode);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [hints, setHints] = useState<string[]>([]);
  const [showHints, setShowHints] = useState<boolean>(false);
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
  const [activeTab, setActiveTab] = useState<'code' | 'visualization'>('code');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [recommendationReason, setRecommendationReason] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [showASTPanel, setShowASTPanel] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem("skillforge:token");
    if (token) {
      setAuthUser({ token });
    }
    setAuthChecked(true);
  }, []);

  // Load progress when authUser changes
  useEffect(() => {
    if (!authUser) return;

    const loadProgress = async () => {
      try {
        const res = await fetch("http://localhost:4000/progress", {
          headers: {
            Authorization: `Bearer ${authUser.token}`,
          },
        });

        const data = await res.json();

        if (!data) {
          // new user
          setCurrentProblem(problemDatabase[0]);
          setCode(problemDatabase[0].starterCode);
          return;
        }

        setUserProfile(data.profile);

        const found = problemDatabase.find(
          p => p.id === data.last_problem_id
        );

        if (found) {
          setCurrentProblem(found);
          setCode(data.last_code ?? found.starterCode);
        }
      } catch (err) {
        console.error("Failed to load progress", err);
      }
    };

    loadProgress();
  }, [authUser]);

  // Auto-save progress - Fixed to prevent infinite loops
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
    const timeout = setTimeout(() => {
      saveProgress();
    }, 1000); // debounce

    return () => clearTimeout(timeout);
  }, [saveProgress]);


  // Reset per-problem state and load problem-specific code
  useEffect(() => {
    setCode(currentProblem.starterCode);
    setOutput('');
    setError('');
    setHints([]);
    setShowHints(false);
    setHintLevel(0);
    setTestResults([]);
    setSessionStartTime(Date.now());
  }, [currentProblem]);

  


  const handleCodeChange = (nextCode: string) => {
    setCode(nextCode);
  };

  // Helper: last non-empty trimmed line
  const normalizeOutput = (out: string): string => {
    const lines = out
      .split('\n')
      .map(l => l.trim())
      .filter(l => l !== '');
    if (lines.length === 0) return '';
    return lines[lines.length - 1];
  };

  const analyzePythonCode = (code: string) => {
    const hints: string[] = [];
    const errors: string[] = [];

    if (code.includes('while True:') && !code.includes('break')) {
      hints.push("⚠️ Infinite loop detected: 'while True' without a break statement.");
      errors.push('Execution blocked: infinite loop detected.');
    }

    if (code.includes('print(') && code.includes('return')) {
      hints.push(
        '💡 Consider: Are you printing the result or returning it? Functions should return values.',
      );
    }

    if (code.match(/for\s+\w+\s+in\s+range\([^)]+\):/g)) {
      hints.push('📚 Remember: range(n) goes from 0 to n-1, not 1 to n.');
    }

    if (code.includes('=') && !code.includes('==') && code.includes('if')) {
      hints.push("⚠️ Possible error: Did you mean '==' (comparison) instead of '=' (assignment)?");
    }

    return { hints, errors };
  };

  const handleRunCode = async () => {
    if (!sessionStartTime) {
      setSessionStartTime(Date.now());
    }

    setUserProfile(prev => ({
      ...prev,
      totalSubmissions: prev.totalSubmissions + 1,
    }));


    setRunning(true);
    setOutput('');
    setError('');
    setTestResults([]);
    setHints([]);

    const analysis = analyzePythonCode(code);

    if (analysis.errors.length > 0) {
      setError(analysis.errors.join('\n'));
      setHints(analysis.hints);
      setRunning(false);
      return;
    }

    try {
      const results: TestResult[] = [];

      if (currentProblem.functionName) {
        // Function-style problems: run once per test with explicit call
        for (let i = 0; i < currentProblem.testCases.length; i++) {
          const test = currentProblem.testCases[i];
          const testCode = `
${code}

print(${currentProblem.functionName}(${test.input}))
`;
          try {
            const res = await runPython(testCode);
            if (res.error) {
              results.push({
                id: i,
                passed: false,
                expected: test.output.trim(),
                actual: res.error,
              });
            } else {
              const actual = normalizeOutput(res.output);
              const expectedNorm = normalizeOutput(test.output);
              results.push({
                id: i,
                passed: actual === expectedNorm,
                expected: test.output.trim(),
                actual,
              });
            }
          } catch (err) {
            results.push({
              id: i,
              passed: false,
              expected: test.output.trim(),
              actual: String(err),
            });
          }
        }
        if (results.length > 0) {
          const last = results[results.length - 1];
          setOutput(last.actual);
        }
      } else {
        // Script-style problems (e.g. Hello World)
        const res = await runPython(code);
        if (res.error) {
          setError(res.error);
          if (res.hints && res.hints.length > 0) {
            setHints(res.hints);
          }
          setRunning(false);
          return;
        }
        setOutput(res.output);
        const actual = normalizeOutput(res.output);
        for (let i = 0; i < currentProblem.testCases.length; i++) {
          const test = currentProblem.testCases[i];
          const expectedNorm = normalizeOutput(test.output);
          results.push({
            id: i,
            passed: actual === expectedNorm,
            expected: test.output.trim(),
            actual,
          });
        }
      }

      setTestResults(results);

      const allPassed = results.every(r => r.passed);
      if (allPassed) {
        setOutput('✅ All test cases passed! Great job!');

        const solvedAt = Date.now();
        const solveTimeSeconds = sessionStartTime
          ? (solvedAt - sessionStartTime) / 1000
          : 0;

        setUserProfile(prev => {
          const problemsSolved = prev.problemsSolved + 1;
          const totalSolveTimeSeconds = prev.totalSolveTimeSeconds + solveTimeSeconds;
          const averageSolveTimeSeconds =
            problemsSolved > 0 ? totalSolveTimeSeconds / problemsSolved : 0;
          const avgHintsPerProblem =
            problemsSolved > 0 ? prev.hintsUsed / problemsSolved : 0;

          let skillLevel: UserProfile['skillLevel'] = 'beginner';
          if (problemsSolved >= 5 && avgHintsPerProblem <= 3) {
            skillLevel = 'intermediate';
          }
          if (problemsSolved >= 10 && avgHintsPerProblem <= 2) {
            skillLevel = 'advanced';
          }

          return {
            ...prev,
            skillLevel,
            problemsSolved,
            successfulSubmissions: prev.successfulSubmissions + 1,
            totalSolveTimeSeconds,
            averageSolveTimeSeconds,
            lastSolveTimeSeconds: solveTimeSeconds,
          };
        });
      } else {
        setError('Some test cases failed. Check the results below.');
        if (analysis.hints.length > 0) {
          setHints(analysis.hints);
        }
      }
    } catch (err) {
      setError('An error occurred while running your code: ' + String(err));
    }

    setRunning(false);
  };

  // Track hints used when user clicks "Get Hint"
  const getNextHint = () => {
    if (hintLevel < currentProblem.hints.length) {
      setHintLevel(prev => prev + 1);
      setShowHints(true);
      setUserProfile(prev => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
    }
  };


  const getLearnerState = () => {
  const {
    problemsSolved,
    hintsUsed,
    successfulSubmissions,
    totalSubmissions,
    averageSolveTimeSeconds,
  } = userProfile;

  const successRate =
    totalSubmissions > 0
      ? successfulSubmissions / totalSubmissions
      : 0;

  const avgHintsPerProblem =
    problemsSolved > 0 ? hintsUsed / problemsSolved : 0;

  if (successRate < 0.4 || avgHintsPerProblem > 4) {
    return "struggling";
  }

  if (successRate > 0.75 && avgHintsPerProblem < 2) {
    return "mastery";
  }

  return "steady";
};


const getRecommendedProblem = () => {
  const learnerState = getLearnerState();

  let targetDifficulty: 'easy' | 'medium' | 'hard' = 'easy';
  let reason = "";

  if (learnerState === "struggling") {
    targetDifficulty = "easy";
    reason = "Recommended to reinforce fundamentals and reduce cognitive load.";
  }

  if (learnerState === "steady") {
    targetDifficulty = "medium";
    reason = "Recommended to gradually increase challenge.";
  }

  if (learnerState === "mastery") {
    targetDifficulty = "hard";
    reason = "Recommended to challenge mastery and promote deeper understanding.";
  }

  setRecommendationReason(reason);

  const candidates = problemDatabase.filter(
    p => p.difficulty === targetDifficulty && p.id !== currentProblem.id
  );

  return candidates[Math.floor(Math.random() * candidates.length)]
    || problemDatabase[0];
};

// Handle login
  const handleLogin = (token: string) => {
    localStorage.setItem("skillforge:token", token);
    setAuthUser({ token });
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("skillforge:token");
    setAuthUser(null);
  };

  // Auth gate
  if (!authChecked) {
    return <div className='p-6'>Loading....</div>
  }

  if (!authUser) {
    return (
      <Login
        onLogin={(token: string) => {
          localStorage.setItem("skillforge:token", token);
          setAuthUser({ token });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-lg">
              <Code2 className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SkillForge AI</h1>
              <p className="text-sm text-gray-500">Adaptive Programming Education</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm text-gray-500">Problems Solved</div>
              <div className="text-xl font-bold text-indigo-600">
                {userProfile.problemsSolved}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Skill Level</div>
              <div className="text-xl font-bold text-purple-600 capitalize">
                {userProfile.skillLevel}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Success Rate</div>
              <div className="text-xl font-bold text-emerald-600">
                {userProfile.totalSubmissions > 0
                  ? Math.round(
                      (userProfile.successfulSubmissions /
                        userProfile.totalSubmissions) *
                        100,
                    )
                  : 0}
                %
              </div>
            </div>
            {/* Logout button moved to header */}
            <button
              onClick={handleLogout}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar: Problems */}
          <div className="col-span-3 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen size={18} />
                Problems
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {problemDatabase.map(problem => (
                  <button
                    key={problem.id}
                    onClick={() => setCurrentProblem(problem)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      currentProblem.id === problem.id
                        ? 'bg-indigo-50 border-2 border-indigo-500'
                        : 'bg-gray-50 border border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900">
                      {problem.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          problem.difficulty === 'easy'
                            ? 'bg-green-100 text-green-700'
                            : problem.difficulty === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {problem.difficulty}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setCurrentProblem(getRecommendedProblem())}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-3 font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Zap size={18} />
              Get Recommended
            </button>
            {recommendationReason && (
              <p className="text-xs text-gray-600 mt-2 text-center">
                {recommendationReason}
              </p>
            )}

          </div>

          {/* Main content */}
          <div className="col-span-9 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:col-span-2">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {currentProblem.title}
                </h2>
                <p className="text-gray-700 mb-4">{currentProblem.description}</p>
                <div className="flex gap-2">
                  {currentProblem.concepts.map(concept => (
                    <span
                      key={concept}
                      className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col justify-between">
                <h3 className="font-semibold text-gray-900 mb-2">Your Progress</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Total Runs</span>
                    <span>{userProfile.totalSubmissions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Successful Runs</span>
                    <span>{userProfile.successfulSubmissions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Hints per Problem</span>
                    <span>
                      {userProfile.problemsSolved > 0
                        ? (userProfile.hintsUsed / userProfile.problemsSolved).toFixed(1)
                        : '0.0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Solve Time (s)</span>
                    <span>{userProfile.averageSolveTimeSeconds.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Solve Time (s)</span>
                    <span>{userProfile.lastSolveTimeSeconds.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <div className="flex gap-4 px-6">
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                      activeTab === 'code'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Code Editor
                  </button>
                  <button
                    onClick={() => setActiveTab('visualization')}
                    className={`py-3 px-4 font-medium border-b-2 transition-colors ${
                      activeTab === 'visualization'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Visualization
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'code' ? (
                  <div className="space-y-4">
                    <CodeEditor code={code} onChange={handleCodeChange} />

                    <div className="flex gap-3">
                      <button
                        onClick={handleRunCode}
                        disabled={running}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {running ? (
                          <RefreshCw className="animate-spin" size={18} />
                        ) : (
                          <Play size={18} />
                        )}
                        {running ? 'Running...' : 'Run Code'}
                      </button>

                      <button
                        onClick={getNextHint}
                        disabled={hintLevel >= currentProblem.hints.length}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        <Lightbulb size={18} />
                        Get Hint ({hintLevel}/{currentProblem.hints.length})
                      </button>

                      {/* AST Analysis Toggle */}
  <button
    onClick={() => setShowASTPanel(!showASTPanel)}
    className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
      showASTPanel 
        ? 'bg-indigo-600 text-white' 
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    <Code2 size={18} />
    {showASTPanel ? 'Hide AST' : 'AST Analysis'}
  </button>

                    </div>


                    {showHints && hintLevel > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                          <Lightbulb size={18} />
                          Hints
                        </h4>
                        <div className="space-y-2">
                          {currentProblem.hints.slice(0, hintLevel).map((hint, idx) => (
                            <div key={idx} className="text-sm text-amber-800 flex gap-2">
                              <span className="font-bold">{idx + 1}.</span>
                              <span>{hint.content}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {output && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900 mb-2">Output</h4>
                        <pre className="text-sm text-green-800 whitespace-pre-wrap">
                          {output}
                        </pre>
                      </div>
                    )}

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-semibold text-red-900 mb-2">Error</h4>
                        <pre className="text-sm text-red-800 whitespace-pre-wrap">
                          {error}
                        </pre>
                        {hints.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-red-200">
                            <p className="text-sm font-medium text-red-900 mb-2">
                              Suggestions:
                            </p>
                            {hints.map((hint, idx) => (
                              <p key={idx} className="text-sm text-red-700">
                                {hint}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {testResults.length > 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Test Cases</h4>
                        <div className="space-y-2">
                          {testResults.map(result => (
                            <div
                              key={result.id}
                              className="flex items-center gap-3 text-sm"
                            >
                              {result.passed ? (
                                <CheckCircle className="text-green-600" size={18} />
                              ) : (
                                <XCircle className="text-red-600" size={18} />
                              )}
                              <span className="text-gray-700">
                                Test Case {result.id + 1}: {result.passed ? 'Passed' : 'Failed'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}


                  </div>
                ) : (
                  <div className="min-h-96">
                    {currentProblem.visualization === 'factorial' && (
                      <FactorialVisualizer initialN={5} />
                    )}
                    {currentProblem.visualization === 'bubbleSort' && (
                      <BubbleSortVisualizer initialArray="[64, 34, 25, 12, 22]" />
                    )}
                    {currentProblem.visualization === 'binarySearch' && (
                      <BinarySearchVisualizer
                        initialArray="[1, 3, 5, 7, 9]"
                        initialTarget={5}
                      />
                    )}
                    {!currentProblem.visualization && (
                      <div className="h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
                        <div className="text-center">
                          <Eye className="mx-auto text-indigo-600 mb-4" size={48} />
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Execution Visualizer
                          </h3>
                          <p className="text-gray-600 mb-4">
                            Step-by-step visualization for {currentProblem.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            Visualizations are available for selected problems.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
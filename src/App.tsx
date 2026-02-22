import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Play,
  RefreshCw,
  BookOpen,
  Eye,
  Code2,
  Zap,
  Download,
  TrendingUp,
  Clock,
  Target,
} from 'lucide-react';
import { problemDatabase, type Problem } from './utils/problemDatabase';
import { runPython } from './utils/pythonRunner';
import { exportStudyData } from './utils/study';
import { selectAdaptiveHint } from './models/Hint';

import FactorialVisualizer from './components/student/visualizers/FactorialVisualizer';
import BubbleSortVisualizer from './components/student/visualizers/BubbleSortVisualizer';
import BinarySearchVisualizer from './components/student/visualizers/BinarySearchVisualizer';

import CodeEditor from './components/student/CodeEditor';
import Login from './components/auth/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import SUSSurvey from './components/SUSSurvey';
import ASTTestPanel from './components/ASTTestPanel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Classifies a Python error string into a short category key */
function classifyError(errorStr: string): string {
  if (!errorStr) return 'unknown';
  if (errorStr.includes('SyntaxError')) return 'SyntaxError';
  if (errorStr.includes('NameError')) return 'NameError';
  if (errorStr.includes('TypeError')) return 'TypeError';
  if (errorStr.includes('IndexError')) return 'IndexError';
  if (errorStr.includes('ZeroDivisionError')) return 'ZeroDivisionError';
  if (errorStr.includes('RecursionError')) return 'RecursionError';
  if (errorStr.includes('AttributeError')) return 'AttributeError';
  if (errorStr.includes('ValueError')) return 'ValueError';
  if (errorStr.includes('IndentationError')) return 'IndentationError';
  if (errorStr.includes('infinite loop')) return 'InfiniteLoop';
  return 'RuntimeError';
}

/** Computes overall mastery as the mean of all known concept scores */
function computeOverallMastery(conceptMastery: Record<string, number>): number {
  const values = Object.values(conceptMastery);
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Updates skill level based on problems solved and mastery */
function computeSkillLevel(
  solvedCount: number,
  overallMastery: number
): 'beginner' | 'intermediate' | 'advanced' {
  if (solvedCount >= 15 && overallMastery >= 0.75) return 'advanced';
  if (solvedCount >= 6 && overallMastery >= 0.55) return 'intermediate';
  return 'beginner';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
  const [view, setView] = useState<'student' | 'admin'>('student');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [finalSUSScore, setFinalSUSScore] = useState<number | null>(null);

  // Use a ref for failureCount inside handleRunCode to avoid stale closure
  const failureCountRef = useRef(0);
  const [failureCount, setFailureCount] = useState(0);

  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [currentProblem, setCurrentProblem] = useState<Problem>(problemDatabase[0]);
  const [code, setCode] = useState<string>(currentProblem.starterCode);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [hints, setHints] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'visualization' | 'analysis'>('code');
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [showASTPanel, setShowASTPanel] = useState(false);

  // Separate isSaving ref to avoid circular dependency in saveProgress
  const isSavingRef = useRef(false);

  // -------------------------------------------------------------------------
  // Derived metrics
  // -------------------------------------------------------------------------

  const solvedCount = userProfile.solvedProblemIds?.length ?? 0;
  const totalProblems = problemDatabase.length;
  const progressPercent = totalProblems > 0 ? (solvedCount / totalProblems) * 100 : 0;
  const successRate =
    userProfile.totalSubmissions > 0
      ? Math.round((userProfile.successfulSubmissions / userProfile.totalSubmissions) * 100)
      : 0;

  // Adaptive problem ordering — problems with lowest average concept mastery come first
  const recommendedProblems = useMemo(() => {
    return [...problemDatabase].sort((a, b) => {
      const scoreA =
        a.concepts.reduce((sum, c) => sum + (userProfile.conceptMastery[c] ?? 0.5), 0) /
        a.concepts.length;
      const scoreB =
        b.concepts.reduce((sum, c) => sum + (userProfile.conceptMastery[c] ?? 0.5), 0) /
        b.concepts.length;
      return scoreA - scoreB;
    });
  }, [userProfile.conceptMastery]);

  // Weakest concept for the "Recommended Focus" banner
  const weakestConcept = useMemo(() => {
    const entries = Object.entries(userProfile.conceptMastery).sort((a, b) => a[1] - b[1]);
    return entries[0]?.[0] ?? null;
  }, [userProfile.conceptMastery]);

  // -------------------------------------------------------------------------
  // Auth — restore from localStorage on mount
  // -------------------------------------------------------------------------

  useEffect(() => {
    const raw = localStorage.getItem('skillforge:auth');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.token && parsed.role && parsed.email) {
          setAuthUser(parsed);
        } else {
          localStorage.removeItem('skillforge:auth');
        }
      } catch {
        localStorage.removeItem('skillforge:auth');
      }
    }
    setAuthChecked(true);
  }, []);

  // -------------------------------------------------------------------------
  // Load progress from backend
  // -------------------------------------------------------------------------

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
            learningTrajectory: data.profile.learningTrajectory ?? [],
            errorHistory: data.profile.errorHistory ?? [],
            errorPatterns: data.profile.errorPatterns ?? {},
            conceptMastery: data.profile.conceptMastery ?? {},
          });

          const found = problemDatabase.find(p => p.id === data.last_problem_id);
          const start = found ?? problemDatabase[0];
          setCurrentProblem(start);
          setCode(data.last_code ?? start.starterCode);
        }
      } catch (err) {
        console.error('Failed to load progress', err);
      }
    };

    loadProgress();
  }, [authUser]);

  // -------------------------------------------------------------------------
  // SUS Survey — trigger after 5 problems for meaningful usability data
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (userProfile.solvedProblemIds.length >= 5 && !finalSUSScore && !showSurvey) {
      setShowSurvey(true);
    }
  }, [userProfile.solvedProblemIds.length, finalSUSScore, showSurvey]);

  // -------------------------------------------------------------------------
  // Autosave — debounced, uses ref to avoid circular dependency
  // -------------------------------------------------------------------------

  const saveProgress = useCallback(async (
    profileSnapshot: UserProfile,
    problemId: number,
    codeSnapshot: string,
    token: string
  ) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      await fetch('http://localhost:4000/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          profile: profileSnapshot,
          lastProblemId: problemId,
          lastCode: codeSnapshot,
        }),
      });
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!authUser) return;
    const timeout = setTimeout(() => {
      saveProgress(userProfile, currentProblem.id, code, authUser.token);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [userProfile, code, authUser, currentProblem.id, saveProgress]);

  // -------------------------------------------------------------------------
  // Reset state when switching problems
  // -------------------------------------------------------------------------

  useEffect(() => {
    const saved = userProfile.solvedSolutions[currentProblem.id];
    setCode(saved ?? currentProblem.starterCode);
    setOutput('');
    setError('');
    setHints([]);
    failureCountRef.current = 0;
    setFailureCount(0);
    setSessionStartTime(Date.now());
    setActiveTab('code');
  }, [currentProblem.id]);

  // -------------------------------------------------------------------------
  // Run Code — core execution handler
  // -------------------------------------------------------------------------

  const handleRunCode = async () => {
    setRunning(true);
    setOutput('');
    setError('');
    setHints([]);

    const runStartTime = Date.now();

    try {
      const res = await runPython(code, currentProblem.exampleCases, currentProblem.functionName);

      setOutput(res.output || '');
      setError(res.error || '');

      // --- AST hints (always show if present) ---
      const astHints: string[] = res.hints ?? [];
      if (astHints.length > 0) setHints(astHints);

      // --- Update profile atomically ---
      setUserProfile(prev => {
        const isAlreadySolved = prev.solvedProblemIds.includes(currentProblem.id);
        const newTotalSubmissions = isAlreadySolved
          ? prev.totalSubmissions
          : prev.totalSubmissions + 1;

        // Solve time
        const elapsedSeconds = Math.round((Date.now() - sessionStartTime) / 1000);

        // Error tracking (only on failure, not already-solved re-runs)
        const newErrorPatterns = { ...prev.errorPatterns };
        const newErrorHistory = [...prev.errorHistory];
        if (!res.passed && res.error && !isAlreadySolved) {
          const errorType = classifyError(res.error);
          newErrorPatterns[errorType] = (newErrorPatterns[errorType] ?? 0) + 1;
          newErrorHistory.push({ timestamp: Date.now(), errorType });
          // Keep history bounded at 100 entries
          if (newErrorHistory.length > 100) newErrorHistory.shift();
        }

        if (isAlreadySolved) {
          return {
            ...prev,
            errorPatterns: newErrorPatterns,
            errorHistory: newErrorHistory,
            solvedSolutions: { ...prev.solvedSolutions, [currentProblem.id]: code },
          };
        }

        if (res.passed) {
          // --- Mastery update (increase for solved concepts) ---
          const updatedMastery = { ...prev.conceptMastery };
          currentProblem.concepts.forEach(c => {
            updatedMastery[c] = Math.min(1, (updatedMastery[c] ?? 0.5) + 0.1);
          });

          const newSolvedIds = [...prev.solvedProblemIds, currentProblem.id];
          const overallMastery = computeOverallMastery(updatedMastery);

          // --- Learning trajectory snapshot ---
          const newTrajectory = [
            ...prev.learningTrajectory,
            { timestamp: Date.now(), overallMastery },
          ];
          // Keep trajectory bounded at 200 points
          if (newTrajectory.length > 200) newTrajectory.shift();

          // --- Solve time statistics ---
          const newTotalTime = prev.totalSolveTimeSeconds + elapsedSeconds;
          const newSuccessful = prev.successfulSubmissions + 1;
          const newAvgTime = Math.round(newTotalTime / newSuccessful);

          // --- Derive strengths / weaknesses ---
          const masteryEntries = Object.entries(updatedMastery);
          const strengths = masteryEntries
            .filter(([, v]) => v >= 0.75)
            .map(([k]) => k);
          const weaknesses = masteryEntries
            .filter(([, v]) => v < 0.45)
            .map(([k]) => k);

          // --- Update skill level dynamically ---
          const newSkillLevel = computeSkillLevel(newSolvedIds.length, overallMastery);

          return {
            ...prev,
            totalSubmissions: newTotalSubmissions,
            successfulSubmissions: newSuccessful,
            problemsSolved: newSolvedIds.length,
            solvedProblemIds: newSolvedIds,
            conceptMastery: updatedMastery,
            solvedSolutions: { ...prev.solvedSolutions, [currentProblem.id]: code },
            learningTrajectory: newTrajectory,
            errorPatterns: newErrorPatterns,
            errorHistory: newErrorHistory,
            totalSolveTimeSeconds: newTotalTime,
            lastSolveTimeSeconds: elapsedSeconds,
            averageSolveTimeSeconds: newAvgTime,
            strengths,
            weaknesses,
            skillLevel: newSkillLevel,
          };
        }

        // --- Failed submission: lower mastery slightly for problem concepts ---
        const updatedMastery = { ...prev.conceptMastery };
        currentProblem.concepts.forEach(c => {
          updatedMastery[c] = Math.max(0, (updatedMastery[c] ?? 0.5) - 0.02);
        });

        return {
          ...prev,
          totalSubmissions: newTotalSubmissions,
          errorPatterns: newErrorPatterns,
          errorHistory: newErrorHistory,
          conceptMastery: updatedMastery,
        };
      });

      // --- Scaffolded Bloom's Taxonomy hints (using selectAdaptiveHint) ---
      if (!res.passed) {
        failureCountRef.current += 1;
        setFailureCount(failureCountRef.current);

        // Build context for adaptive hint selection
        const adaptiveHint = selectAdaptiveHint(currentProblem.hints, {
          conceptMastery: userProfile.conceptMastery,
          errorHints: astHints,
          previousHintsUsed: failureCountRef.current - 1,
        });

        if (adaptiveHint && !astHints.includes(adaptiveHint.content)) {
          setHints(prev => {
            if (prev.includes(adaptiveHint.content)) return prev;
            return [...prev, adaptiveHint.content];
          });

          // Track hint usage
          setUserProfile(prev => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
        }
      }
    } catch (err) {
      setError('System Error: ' + String(err));
    } finally {
      setRunning(false);
    }
  };

  // -------------------------------------------------------------------------
  // Feedback submission
  // -------------------------------------------------------------------------

  const handleSubmitFeedback = async () => {
    if (!authUser || authUser.role !== 'student') return;
    if (!feedbackRating) {
      setFeedbackMessage('Please provide a rating before submitting.');
      return;
    }

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

      if (!res.ok) throw new Error('Failed to submit feedback');

      setFeedbackMessage('✓ Feedback submitted — thank you!');
      setFeedbackRating(null);
      setFeedbackComment('');
    } catch {
      setFeedbackMessage('Error submitting feedback. Please try again.');
    }

    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  const recommendNextProblem = () => {
    const idx = recommendedProblems.findIndex(p => p.id === currentProblem.id);
    const next = recommendedProblems[idx + 1];
    if (next) setCurrentProblem(next);
  };

  const handleLogout = () => {
    localStorage.removeItem('skillforge:auth');
    setAuthUser(null);
    setUserProfile(initialUserProfile);
  };

  // -------------------------------------------------------------------------
  // Early returns
  // -------------------------------------------------------------------------

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 font-mono text-sm animate-pulse">Initializing SkillForge…</div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <Login
        onLogin={auth => {
          const userData = { token: auth.token, role: auth.role, email: auth.email };
          localStorage.setItem('skillforge:auth', JSON.stringify(userData));
          setAuthUser(userData);
        }}
      />
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isSolved = userProfile.solvedProblemIds.includes(currentProblem.id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SUS Survey modal */}
      {showSurvey && (
        <SUSSurvey
          onComplete={score => {
            setFinalSUSScore(score);
            setShowSurvey(false);
          }}
        />
      )}

      {view === 'admin' ? (
        <>
          <AdminDashboard token={authUser.token} />
          <button
            onClick={() => setView('student')}
            className="fixed bottom-6 right-6 bg-indigo-600 text-white px-4 py-2 rounded-full font-bold shadow-lg z-50"
          >
            ← Back to Student View
          </button>
        </>
      ) : (
        <>
          {/* ================================================================
              HEADER
          ================================================================ */}
          <header className="bg-white border-b shadow-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
              {/* Logo */}
              <div className="flex gap-3 items-center">
                <div className="bg-indigo-600 p-2 rounded-lg">
                  <Code2 className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="font-bold text-xl">SkillForge AI</h1>
                  <p className="text-xs text-gray-500 uppercase tracking-widest">
                    Adaptive Python Tutor
                  </p>
                </div>
              </div>

              {/* Right side controls */}
              <div className="flex gap-5 items-center">
                {/* Export button — now passes live profile */}
                <button
                  onClick={() => exportStudyData(userProfile as unknown as Record<string, unknown>)}
                  className="flex items-center gap-2 text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors"
                  title="Download your progress as CSV"
                >
                  <Download size={12} /> EXPORT DATA
                </button>

                {authUser.role === 'admin' && (
                  <button
                    onClick={() => setView('admin')}
                    className="text-xs font-bold text-indigo-600 border border-indigo-300 px-3 py-1.5 rounded-full hover:bg-indigo-50 transition-colors"
                  >
                    Admin Dashboard
                  </button>
                )}

                <div className="border-l pl-5 flex gap-5 items-center">
                  {/* Skill Level */}
                  <div className="text-center">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Level</div>
                    <div className="font-bold text-indigo-600 capitalize text-sm">
                      {userProfile.skillLevel}
                    </div>
                  </div>

                  {/* Solved */}
                  <div className="text-center">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Solved</div>
                    <div className="font-bold text-sm">
                      {solvedCount}
                      <span className="text-gray-400">/{totalProblems}</span>
                    </div>
                  </div>

                  {/* Success Rate */}
                  <div className="text-center">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Success</div>
                    <div className="font-bold text-emerald-600 text-sm">{successRate}%</div>
                  </div>

                  {/* Avg Time */}
                  <div className="text-center">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Avg Time</div>
                    <div className="font-bold text-purple-600 text-sm">
                      {userProfile.averageSolveTimeSeconds > 0
                        ? `${userProfile.averageSolveTimeSeconds}s`
                        : '—'}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-28">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                      Progress
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-right text-gray-500 mt-0.5">
                      {Math.round(progressPercent)}%
                    </div>
                  </div>

                  {/* User */}
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      Logged in as
                    </span>
                    <span className="text-xs font-black text-indigo-600">
                      {authUser.email.split('@')[0]}
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                  >
                    LOGOUT
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* ================================================================
              ADAPTIVE FOCUS BANNER
          ================================================================ */}
          <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target size={14} className="text-indigo-500" />
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Adaptive Focus:
                </span>
                <span className="text-xs text-indigo-600">
                  {weakestConcept
                    ? `Strengthen "${weakestConcept}" — problems requiring this concept are prioritised in your task list`
                    : 'Complete your first problem to enable adaptive recommendations'}
                </span>
              </div>

              {userProfile.learningTrajectory.length > 1 && (
                <div className="flex items-center gap-2 text-xs text-indigo-500">
                  <TrendingUp size={12} />
                  <span>
                    Overall mastery:{' '}
                    {Math.round(
                      computeOverallMastery(userProfile.conceptMastery) * 100
                    )}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ================================================================
              MAIN LAYOUT
          ================================================================ */}
          <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">

            {/* ---- Sidebar ---- */}
            <div className="col-span-3 space-y-6">

              {/* Problem list */}
              <div className="bg-white p-4 rounded-xl border">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <BookOpen size={16} /> Tasks
                  <span className="ml-auto text-[10px] font-normal text-gray-400">
                    sorted by mastery gap
                  </span>
                </h3>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {recommendedProblems.map(p => {
                    const solved = userProfile.solvedProblemIds.includes(p.id);
                    const isActive = p.id === currentProblem.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setCurrentProblem(p)}
                        className={`w-full text-left p-3 rounded-lg border flex justify-between items-center transition-colors ${
                          isActive
                            ? 'bg-indigo-50 border-indigo-400'
                            : 'bg-gray-50 hover:bg-gray-100 border-transparent'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold">{p.title}</div>
                          <div
                            className={`text-[10px] uppercase font-bold mt-0.5 ${
                              p.difficulty === 'hard'
                                ? 'text-red-500'
                                : p.difficulty === 'medium'
                                ? 'text-amber-500'
                                : 'text-emerald-500'
                            }`}
                          >
                            {p.difficulty}
                          </div>
                        </div>
                        {solved && (
                          <span className="text-emerald-600 font-bold text-base">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Next problem button */}
              <button
                onClick={recommendNextProblem}
                className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-indigo-700 transition-colors"
              >
                <Zap size={16} /> NEXT PROBLEM
              </button>

              {/* Mastery summary card */}
              {Object.keys(userProfile.conceptMastery).length > 0 && (
                <div className="bg-white p-4 rounded-xl border">
                  <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 flex items-center gap-2">
                    <TrendingUp size={14} /> Concept Mastery
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(userProfile.conceptMastery)
                      .sort((a, b) => a[1] - b[1])
                      .slice(0, 8)
                      .map(([concept, value]) => (
                        <div key={concept}>
                          <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                            <span>{concept}</span>
                            <span>{Math.round(value * 100)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                value >= 0.75
                                  ? 'bg-emerald-500'
                                  : value >= 0.5
                                  ? 'bg-amber-400'
                                  : 'bg-red-400'
                              }`}
                              style={{ width: `${value * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Session stats card */}
              <div className="bg-white p-4 rounded-xl border">
                <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 flex items-center gap-2">
                  <Clock size={14} /> Session Stats
                </h3>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Hints used</span>
                    <span className="font-bold">{userProfile.hintsUsed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total submissions</span>
                    <span className="font-bold">{userProfile.totalSubmissions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last solve time</span>
                    <span className="font-bold">
                      {userProfile.lastSolveTimeSeconds > 0
                        ? `${userProfile.lastSolveTimeSeconds}s`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ---- Main Editor Column ---- */}
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

                {/* Example test cases */}
                {currentProblem.exampleCases.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-bold text-gray-400 uppercase mb-2">Examples</div>
                    <div className="flex flex-wrap gap-3">
                      {currentProblem.exampleCases.map((tc, i) => (
                        <div
                          key={i}
                          className="bg-gray-50 border rounded-lg px-3 py-2 font-mono text-xs"
                        >
                          {tc.input && (
                            <span className="text-gray-500">Input: <span className="text-gray-800">{tc.input}</span> → </span>
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
                      onClick={() => setActiveTab(tab)}
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
                      <CodeEditor code={code} onChange={setCode} />

                      <div className="flex gap-4 mt-4">
                        <button
                          onClick={handleRunCode}
                          disabled={running}
                          className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                        >
                          {running ? (
                            <RefreshCw className="animate-spin" size={18} />
                          ) : (
                            <Play size={18} />
                          )}
                          {running ? 'Running…' : 'RUN CODE'}
                        </button>
                      </div>

                      {/* Success banner */}
                      {isSolved && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg mt-4 flex items-center gap-2 text-sm font-bold">
                          <Zap size={14} /> Problem solved! You can continue experimenting.
                        </div>
                      )}

                      {/* Output console */}
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
                            } ${
                              error
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-gray-900 text-gray-100'
                            }`}
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

                      {/* Adaptive hints */}
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

                      {/* Solved solution display */}
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

                      {/* Feedback form */}
                      {authUser.role === 'student' && (
                        <div className="bg-white p-5 rounded-xl border mt-6">
                          <h3 className="font-bold text-sm mb-3 text-gray-700">Rate this problem</h3>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-xs text-gray-500">Difficulty rating:</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map(n => (
                                <button
                                  key={n}
                                  onClick={() => setFeedbackRating(n)}
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
                            onChange={e => setFeedbackComment(e.target.value)}
                            placeholder="Optional comments (e.g. what was confusing, what helped)…"
                            className="border px-3 py-2 rounded-lg w-full text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            rows={2}
                          />
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              onClick={handleSubmitFeedback}
                              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors"
                            >
                              Submit Feedback
                            </button>
                            {feedbackMessage && (
                              <p className="text-sm text-gray-600">{feedbackMessage}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ---- Visualization Tab ---- */}
                  {activeTab === 'visualization' && (
                    <div className="min-h-[400px] flex justify-center items-start">
                      {currentProblem.visualization === 'factorial' && (
                        <FactorialVisualizer initialN={5} />
                      )}
                      {currentProblem.visualization === 'bubbleSort' && (
                        <BubbleSortVisualizer initialArray="[64,34,25,12,22]" />
                      )}
                      {currentProblem.visualization === 'binarySearch' && (
                        <BinarySearchVisualizer initialArray="[1,3,5,7,9]" initialTarget={5} />
                      )}
                      {!currentProblem.visualization && (
                        <div className="opacity-30 text-center mt-16">
                          <Eye size={48} className="mx-auto mb-2" />
                          <p className="text-xs font-bold uppercase">
                            No visualizer available for this problem
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ---- Code Analysis Tab (ASTTestPanel) ---- */}
                  {activeTab === 'analysis' && (
                    <ASTTestPanel problemId={currentProblem.id} />
                  )}
                </div>
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
};

export default App;
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

/* ================= TYPES ================= */

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
  role: 'student' | 'admin';
}

/* ================= DEFAULTS ================= */

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

/* ================= APP ================= */

const App: React.FC = () => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [view, setView] = useState<'student' | 'admin'>('student');

  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);

  const [currentProblem, setCurrentProblem] = useState<Problem>(problemDatabase[0]);
  const [code, setCode] = useState(currentProblem.starterCode);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [hints, setHints] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const [activeTab, setActiveTab] = useState<'code' | 'visualization'>('code');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showSurvey, setShowSurvey] = useState(false);
  const [finalSUSScore, setFinalSUSScore] = useState<number | null>(null);

  const isAdmin = authUser?.role === 'admin';

  /* ================= AUTH ================= */

  useEffect(() => {
    const raw = localStorage.getItem('skillforge:auth');
    if (raw) setAuthUser(JSON.parse(raw));
    setAuthChecked(true);
  }, []);

  /* ================= FILTERING ================= */

  const filteredProblems = useMemo(() => {
    if (userProfile.skillLevel === 'beginner') {
      return problemDatabase.filter(p => p.difficulty === 'easy');
    }
    if (userProfile.skillLevel === 'intermediate') {
      return problemDatabase.filter(p => p.difficulty !== 'hard');
    }
    return problemDatabase;
  }, [userProfile.skillLevel]);

  /* ================= LOAD PROGRESS ================= */

  useEffect(() => {
    if (!authUser) return;

    const loadProgress = async () => {
      const res = await fetch('http://localhost:4000/progress', {
        headers: { Authorization: `Bearer ${authUser.token}` },
      });
      const data = await res.json();

      if (data?.profile) {
        setUserProfile(data.profile);

        const found = problemDatabase.find(p => p.id === data.last_problem_id);
        const start = found ?? filteredProblems[0];

        setCurrentProblem(start);
        setCode(data.last_code ?? start.starterCode);
      }
    };

    loadProgress();
  }, [authUser, filteredProblems]);

  /* ================= SUS ================= */

  useEffect(() => {
    if (userProfile.problemsSolved >= 3 && !finalSUSScore) {
      setShowSurvey(true);
    }
  }, [userProfile.problemsSolved, finalSUSScore]);

  /* ================= AUTOSAVE ================= */

  const saveProgress = useCallback(async () => {
    if (!authUser || isSaving) return;
    setIsSaving(true);

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

    setIsSaving(false);
  }, [authUser, userProfile, currentProblem.id, code, isSaving]);

  useEffect(() => {
    if (!authUser || !sessionStartTime) return;
    const t = setTimeout(saveProgress, 2000);
    return () => clearTimeout(t);
  }, [code, userProfile.problemsSolved, saveProgress]);

  /* ================= RUN CODE ================= */

  const handleRunCode = async () => {
    setRunning(true);
    setOutput('');
    setError('');
    setHints([]);

    setUserProfile(p => ({ ...p, totalSubmissions: p.totalSubmissions + 1 }));

    const res = await runPython(code);

    setOutput(res.output || '');
    setError(res.error || '');
    setHints(res.hints || []);

    if (!res.error) {
      const solveTime = (Date.now() - (sessionStartTime ?? Date.now())) / 1000;
      const hasCritical = res.hints?.some(h => h.includes('🚨'));

      setUserProfile(p => ({
        ...p,
        successfulSubmissions: p.successfulSubmissions + 1,
        problemsSolved: hasCritical ? p.problemsSolved : p.problemsSolved + 1,
        lastSolveTimeSeconds: solveTime,
        totalSolveTimeSeconds: p.totalSolveTimeSeconds + solveTime,
        averageSolveTimeSeconds:
          (p.totalSolveTimeSeconds + solveTime) /
          Math.max(1, p.problemsSolved + 1),
      }));
    }

    setRunning(false);
  };

  /* ================= LOGOUT ================= */

  const handleLogout = () => {
    localStorage.removeItem('skillforge:auth');
    setAuthUser(null);
  };

  /* ================= GUARDS ================= */

  if (!authChecked) return <div className="p-6">Initializing…</div>;

  if (!authUser) {
    return (
      <Login
        onLogin={(token) => {
          const user: AuthUser = { token, role: 'student' };
          localStorage.setItem('skillforge:auth', JSON.stringify(user));
          setAuthUser(user);
        }}
      />
    );
  }

  /* ================= RENDER ================= */

  return (
    <div className="min-h-screen bg-gray-50">
      {showSurvey && (
        <SUSSurvey
          onComplete={s => {
            setFinalSUSScore(s);
            setShowSurvey(false);
          }}
        />
      )}

      {view === 'admin' ? (
        <AdminDashboard token={authUser.token} />
      ) : (
        <div className="p-6">App Loaded Successfully</div>
      )}
    </div>
  );
};

export default App;

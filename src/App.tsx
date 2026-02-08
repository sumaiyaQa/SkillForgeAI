import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  Play,
  RefreshCw,
  BookOpen,
  Eye,
  Code2,
  Zap,
  Download,
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

// TYPES

// Represents the adaptive learner profile that is persisted between sessions.

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

// Represents the authenticated user session.

interface AuthUser {
  token: string;
  role: 'student' | 'admin';
}

// DEFAULT STATE

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

// APP ROOT

const App: React.FC = () => {
// AUTH

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

// STUDENT STATE

  const [userProfile, setUserProfile] =
    useState<UserProfile>(initialUserProfile);

  const [currentProblem, setCurrentProblem] =
    useState<Problem>(problemDatabase[0]);

  const [code, setCode] = useState(currentProblem.starterCode);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [hints, setHints] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const [activeTab, setActiveTab] =
    useState<'code' | 'visualization'>('code');

  const [sessionStartTime, setSessionStartTime] =
    useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);

// SUS

  const [showSurvey, setShowSurvey] = useState(false);
  const [finalSUSScore, setFinalSUSScore] =
    useState<number | null>(null);

  const isAdmin = authUser?.role === 'admin';

//  AUTH INITIALISATION

// Restores authentication state from localStorage.
// This avoids forcing users to log in again on refresh.

  useEffect(() => {
    const raw = localStorage.getItem('skillforge:auth');
    if (raw) {
      setAuthUser(JSON.parse(raw));
    }
    setAuthChecked(true);
  }, []);

// PROBLEM FILTERING (ADAPTIVE)

// Filters available problems based on the user's inferred skill level.
   
  const filteredProblems = useMemo(() => {
    if (userProfile.skillLevel === 'beginner') {
      return problemDatabase.filter(p => p.difficulty === 'easy');
    }
    if (userProfile.skillLevel === 'intermediate') {
      return problemDatabase.filter(p => p.difficulty !== 'hard');
    }
    return problemDatabase;
  }, [userProfile.skillLevel]);

// LOAD SAVED PROGRESS

  useEffect(() => {
    if (!authUser || isAdmin) return;

    const loadProgress = async () => {
      const res = await fetch('http://localhost:4000/progress', {
        headers: {
          Authorization: `Bearer ${authUser.token}`,
        },
      });

      const data = await res.json();

      if (data?.profile) {
        setUserProfile(data.profile);

        const last =
          problemDatabase.find(p => p.id === data.last_problem_id) ??
          filteredProblems[0];

        setCurrentProblem(last);
        setCode(data.last_code ?? last.starterCode);
        setSessionStartTime(Date.now());
      }
    };

    loadProgress();
  }, [authUser, filteredProblems, isAdmin]);

// SUS SURVEY TRIGGER
  useEffect(() => {
    if (userProfile.problemsSolved >= 3 && !finalSUSScore) {
      setShowSurvey(true);
    }
  }, [userProfile.problemsSolved, finalSUSScore]);

// AUTOSAVE

// Persists user progress to the backend.
// Debounced to avoid excessive network traffic
  const saveProgress = useCallback(async () => {
    if (!authUser || isSaving || isAdmin) return;

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
  }, [
    authUser,
    userProfile,
    currentProblem.id,
    code,
    isSaving,
    isAdmin,
  ]);

  useEffect(() => {
    if (!authUser || !sessionStartTime || isAdmin) return;
    const t = setTimeout(saveProgress, 2000);
    return () => clearTimeout(t);
  }, [code, userProfile.problemsSolved, saveProgress, isAdmin]);

// CODE EXECUTION
  const handleRunCode = async () => {
    setRunning(true);
    setOutput('');
    setError('');
    setHints([]);

    setUserProfile(p => ({
      ...p,
      totalSubmissions: p.totalSubmissions + 1,
    }));

    const res = await runPython(code);

    setOutput(res.output || '');
    setError(res.error || '');
    setHints(res.hints || []);

    if (!res.error) {
      const solveTime =
        (Date.now() - (sessionStartTime ?? Date.now())) / 1000;

      const hasCritical =
        res.hints?.some(h => h.includes('🚨'));

      setUserProfile(p => ({
        ...p,
        successfulSubmissions: p.successfulSubmissions + 1,
        problemsSolved: hasCritical
          ? p.problemsSolved
          : p.problemsSolved + 1,
        lastSolveTimeSeconds: solveTime,
        totalSolveTimeSeconds:
          p.totalSolveTimeSeconds + solveTime,
        averageSolveTimeSeconds:
          (p.totalSolveTimeSeconds + solveTime) /
          Math.max(1, p.problemsSolved + 1),
      }));
    }

    setRunning(false);
  };

// LOGOUT

  const handleLogout = () => {
    localStorage.removeItem('skillforge:auth');
    setAuthUser(null);
  };

// GUARDS

  if (!authChecked) {
    return <div className="p-6">Initializing…</div>;
  }

  if (!authUser) {
    return (
      <Login
        onLogin={auth => {
          localStorage.setItem(
            'skillforge:auth',
            JSON.stringify(auth)
          );
          setAuthUser(auth);
        }}
      />
    );
  }

 
  // RENDER

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

      {/* Admin users never see the student interface */}
      {isAdmin ? (
        <AdminDashboard token={authUser.token} />
      ) : (
        <div className="p-6">
          {/* Student UI would normally render here */}
          App Loaded Successfully
        </div>
      )}
    </div>
  );
};

export default App;

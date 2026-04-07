
import React, { useEffect, useState, useMemo } from 'react';
import { getProblemDatabase, loadProblems, filterMasteryToCoveredConcepts, type Problem } from './utils/problemDatabase';
import { initialUserProfile } from './utils/userProfile';
import { useAuth } from './hooks/useAuth';
import { useProgress } from './hooks/userProgress';
import { useRunCode } from './hooks/useRunCode';
import { useFeedback } from './hooks/useFeedback';

import type { UserProfile } from './types';

import Login from './components/auth/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import SUSSurvey from './components/SUSSurvey';
import PlacementQuiz, { type PlacementResult } from './components/student/PlacementQuiz';
import Header from './components/student/layout/Header';
import AdaptiveBanner from './components/student/layout/AdaptiveBanner';
import Sidebar from './components/student/layout/Sidebar';
import MainEditor from './components/student/layout/MainEditor';

const API_BASE = 'http://localhost:4000';

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
  const [view, setView] = useState<'student' | 'admin'>('student');
  const [showSurvey, setShowSurvey] = useState(false);
  const [susSubmitted, setSusSubmitted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState<boolean | null>(null);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'code' | 'visualization' | 'analysis'>('code');
  const [sessionStartTime, setSessionStartTime] = useState<number>(() => Date.now());

  const { authUser, authChecked, handleLogin, handleLogout } = useAuth(
    setUserProfile,
    setQuizCompleted,
    setCurrentProblem,
  );

  useEffect(() => {
    if (!authUser || authUser.role !== 'student') return;

    setSusSubmitted(false);
    setShowSurvey(false);

    const susKey = `skillforge:susSubmitted:${authUser.email}`;
    const localSubmitted = localStorage.getItem(susKey) === 'true';
    if (localSubmitted) {
      setSusSubmitted(true);
      setShowSurvey(false);
    }

    const loadSusStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/sus/me`, {
          headers: { Authorization: `Bearer ${authUser.token}` },
        });
        if (!res.ok) return;

        const data = await res.json();
        if (data?.submitted && typeof data.score === 'number') {
          setSusSubmitted(true);
          setShowSurvey(false);
          localStorage.setItem(susKey, 'true');
        }
      } catch (err) {
        console.error('Failed to load SUS status:', err);
      }
    };

    loadSusStatus();
  }, [authUser]);

  useProgress(
    authUser,
    userProfile,
    currentProblem,
    code,
    setUserProfile,
    setQuizCompleted,
    setCurrentProblem,
    setCode,
    loadProblems,
  );

  const { output, error, hints, running, failureCount, reset, handleRunCode } = useRunCode(
    currentProblem,
    code,
    sessionStartTime,
    userProfile,
    setUserProfile,
  );

  const {
    feedbackRating, setFeedbackRating,
    feedbackComment, setFeedbackComment,
    feedbackMessage,
    handleSubmitFeedback,
  } = useFeedback(authUser, currentProblem);

  useEffect(() => {
    if (userProfile.solvedProblemIds.length >= 5 && !susSubmitted && !showSurvey) {
      setShowSurvey(true);
    }
  }, [userProfile.solvedProblemIds.length, susSubmitted, showSurvey]);

  useEffect(() => {
    if (!currentProblem) return;
    const saved = userProfile.solvedSolutions[currentProblem.id];
    setCode(saved ?? currentProblem.starterCode);
    reset();
    setSessionStartTime(Date.now());
    setActiveTab('code');
  }, [currentProblem?.id]);

  const solvedCount = userProfile.solvedProblemIds?.length ?? 0;
  const totalProblems = getProblemDatabase().length;
  const progressPercent = totalProblems > 0 ? (solvedCount / totalProblems) * 100 : 0;
  const successRate =
    userProfile.totalSubmissions > 0
      ? Math.round((userProfile.successfulSubmissions / userProfile.totalSubmissions) * 100)
      : 0;

  function getProblemScore(problem: Problem, mastery: UserProfile['conceptMastery']) {
    const total = problem.concepts.reduce(
      (sum, concept) => sum + (mastery[concept] ?? 0.5),
      0
    );
    return total / problem.concepts.length;
  }

  const recommendedProblems = useMemo(() => {
    const db = getProblemDatabase();
    return [...db].sort((a, b) => {
      const scoreA = getProblemScore(a, userProfile.conceptMastery);
      const scoreB = getProblemScore(b, userProfile.conceptMastery);
      return scoreA - scoreB;
    });
  }, [userProfile.conceptMastery]);

  const visibleConceptMastery = filterMasteryToCoveredConcepts(userProfile.conceptMastery);

  const recommendNextProblem = () => {
    if (!currentProblem) return;
    const solvedIds = new Set(userProfile.solvedProblemIds);
    const idx = recommendedProblems.findIndex(p => p.id === currentProblem.id);

    // Prefer the next unsolved item after the current one in adaptive order.
    if (idx !== -1) {
      const nextUnsolved = recommendedProblems
        .slice(idx + 1)
        .find(p => !solvedIds.has(p.id));
      if (nextUnsolved) {
        setCurrentProblem(nextUnsolved);
        return;
      }
    }

    // Fallback: pick the first unsolved anywhere in the adaptive list.
    const firstUnsolved = recommendedProblems.find(p => !solvedIds.has(p.id));
    if (firstUnsolved) setCurrentProblem(firstUnsolved);
  };

  const chooseInitialProblem = (problems: Problem[], conceptPriors: Record<string, number>) => {
    const ranked = [...problems].sort((a, b) => {
      const scoreA = a.concepts.reduce((sum, concept) => sum + (conceptPriors[concept] ?? 0.5), 0) / a.concepts.length;
      const scoreB = b.concepts.reduce((sum, concept) => sum + (conceptPriors[concept] ?? 0.5), 0) / b.concepts.length;
      return scoreA - scoreB;
    });

    const filtered = ranked.filter(problem => !/hello world/i.test(problem.title));
    return filtered[0] ?? ranked[0] ?? null;
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 font-mono text-sm animate-pulse">Initializing SkillForge...</div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <Login
        onLogin={auth =>
          handleLogin(auth, getProblemDatabase)
        }
      />
    );
  }

  if (quizCompleted === false) {
    return (
      <PlacementQuiz
        onComplete={(result: PlacementResult) => {
          const seededProfile: UserProfile = {
            ...initialUserProfile,
            skillLevel: result.level,
            conceptMastery: result.conceptPriors,
          };
          setUserProfile(seededProfile);
          setQuizCompleted(true);

          const allProblems = getProblemDatabase();
          const firstAdaptiveProblem = chooseInitialProblem(allProblems, result.conceptPriors);

          if (firstAdaptiveProblem) setCurrentProblem(firstAdaptiveProblem);

          if (authUser) {
            fetch(`${API_BASE}/progress`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authUser.token}`,
              },
              body: JSON.stringify({
                profile: seededProfile,
                lastProblemId: null,
                lastCode: '',
              }),
            }).catch(err => console.error('Failed to persist placement priors:', err));
          }
        }}
      />
    );
  }

  if (!currentProblem) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 font-mono text-sm animate-pulse">Loading problems...</div>
      </div>
    );
  }

  const isSolved = userProfile.solvedProblemIds.includes(currentProblem.id);

  return (
    <div className="min-h-screen bg-slate-50">
      {showSurvey && (
        <SUSSurvey
          onComplete={(score, responses) => {
            if (authUser?.email) {
              localStorage.setItem(`skillforge:susSubmitted:${authUser.email}`, 'true');
            }
            setSusSubmitted(true);
            setShowSurvey(false);

            // Persist to backend so admin can see SUS results
            if (authUser) {
              fetch(`${API_BASE}/sus`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${authUser.token}`,
                },
                body: JSON.stringify({ score, responses }),
              }).catch(err => console.error('Failed to save SUS score:', err));
            }
          }}
        />
      )}

      {view === 'admin' ? (
        <>
          <AdminDashboard token={authUser.token} />
          <button
            onClick={() => setView('student')}
            className="fixed bottom-6 right-6 z-50 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
          >
            Back to Student View
          </button>
        </>
      ) : (
        <>
          <Header
            authUser={authUser}
            userProfile={userProfile}
            solvedCount={solvedCount}
            totalProblems={totalProblems}
            progressPercent={progressPercent}
            successRate={successRate}
            onLogout={() => handleLogout(() => {
              setUserProfile(initialUserProfile);
              setQuizCompleted(null);
              setCurrentProblem(null);
              setCode('');
              setShowSurvey(false);
              setSusSubmitted(false);
              setView('student');
            })}
            onAdminClick={() => setView('admin')}
          />

          <AdaptiveBanner
            conceptMastery={userProfile.conceptMastery}
            trajectoryLength={userProfile.learningTrajectory.length}
          />

          <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
            <Sidebar
              recommendedProblems={recommendedProblems}
              currentProblem={currentProblem}
              userProfile={userProfile}
              visibleConceptMastery={visibleConceptMastery}
              onSelectProblem={setCurrentProblem}
              onNextProblem={recommendNextProblem}
            />

            <MainEditor
              currentProblem={currentProblem}
              code={code}
              onCodeChange={setCode}
              output={output}
              error={error}
              hints={hints}
              running={running}
              failureCount={failureCount}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onRunCode={handleRunCode}
              isSolved={isSolved}
              userProfile={userProfile}
              authUser={authUser}
              feedbackRating={feedbackRating}
              feedbackComment={feedbackComment}
              feedbackMessage={feedbackMessage}
              onFeedbackRating={setFeedbackRating}
              onFeedbackComment={setFeedbackComment}
              onSubmitFeedback={handleSubmitFeedback}
            />
          </main>
        </>
      )}
    </div>
  );
};

export default App;
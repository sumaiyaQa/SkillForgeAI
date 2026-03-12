
import React, { useEffect, useState, useMemo } from 'react';
import { getProblemDatabase, loadProblems, type Problem } from './utils/problemDatabase';
import { initialUserProfile, computeOverallMastery } from './utils/userProfile';
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

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
  const [view, setView] = useState<'student' | 'admin'>('student');
  const [showSurvey, setShowSurvey] = useState(false);
  const [finalSUSScore, setFinalSUSScore] = useState<number | null>(null);
  const [quizCompleted, setQuizCompleted] = useState<boolean | null>(null);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'code' | 'visualization' | 'analysis'>('code');
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  const { authUser, setAuthUser, authChecked, handleLogin, handleLogout } = useAuth(
    setUserProfile,
    setQuizCompleted,
    setCurrentProblem,
  );

  // -------------------------------------------------------------------------
  // Progress load/save
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Run code
  // -------------------------------------------------------------------------

  const { output, error, hints, running, failureCount, reset, handleRunCode } = useRunCode(
    currentProblem,
    code,
    sessionStartTime,
    userProfile,
    setUserProfile,
  );

  // -------------------------------------------------------------------------
  // Feedback
  // -------------------------------------------------------------------------

  const {
    feedbackRating, setFeedbackRating,
    feedbackComment, setFeedbackComment,
    feedbackMessage,
    handleSubmitFeedback,
  } = useFeedback(authUser, currentProblem);

  // -------------------------------------------------------------------------
  // SUS Survey trigger
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (userProfile.solvedProblemIds.length >= 5 && !finalSUSScore && !showSurvey) {
      setShowSurvey(true);
    }
  }, [userProfile.solvedProblemIds.length, finalSUSScore, showSurvey]);

  // -------------------------------------------------------------------------
  // Reset state when switching problems
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!currentProblem) return;
    const saved = userProfile.solvedSolutions[currentProblem.id];
    setCode(saved ?? currentProblem.starterCode);
    reset();
    setSessionStartTime(Date.now());
    setActiveTab('code');
  }, [currentProblem?.id]);

  // -------------------------------------------------------------------------
  // Derived metrics
  // -------------------------------------------------------------------------

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

  const weakestConcept = useMemo(() => {
    const entries = Object.entries(userProfile.conceptMastery);
    if (entries.length === 0) return null;
    entries.sort((a, b) => a[1] - b[1]);
    const [concept] = entries[0];
    return concept;
  }, [userProfile.conceptMastery]);


  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  const recommendNextProblem = () => {
    if (!currentProblem) return;
    const idx = recommendedProblems.findIndex(p => p.id === currentProblem.id);
    if (idx === -1 || idx >= recommendedProblems.length - 1) {
      const firstUnsolved = recommendedProblems.find(
        p => !userProfile.solvedProblemIds.includes(p.id)
      );
      if (firstUnsolved) setCurrentProblem(firstUnsolved);
      return;
    }
    setCurrentProblem(recommendedProblems[idx + 1]);
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
// 1) While we are still checking if the user is logged in

  if (!authUser) {
    return (
      <Login
        onLogin={auth =>
          handleLogin(auth, getProblemDatabase)
        }
      />
    );
  }
// 3) Logged in but has not done placement quiz yet

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
          const firstAdaptiveProblem = [...allProblems].sort((a, b) => {
            const scoreA =
              a.concepts.reduce((sum, c) => sum + (result.conceptPriors[c] ?? 0.5), 0) /
              a.concepts.length;
            const scoreB =
              b.concepts.reduce((sum, c) => sum + (result.conceptPriors[c] ?? 0.5), 0) /
              b.concepts.length;
            return scoreA - scoreB;
          })[0];

          if (firstAdaptiveProblem) setCurrentProblem(firstAdaptiveProblem);
// 2) Not logged in: show Login

          if (authUser) {
            fetch('http://localhost:4000/progress', {
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
// 4) Waiting for currentProblem (after loading progress)

  if (!currentProblem) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 font-mono text-sm animate-pulse">Loading problems…</div>
      </div>
    );
  }

  const isSolved = userProfile.solvedProblemIds.includes(currentProblem.id);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      {showSurvey && (
        <SUSSurvey
          onComplete={(score, responses) => {
            setFinalSUSScore(score);
            setShowSurvey(false);

            // Persist to backend so admin can see SUS results
            if (authUser) {
              fetch('http://localhost:4000/sus', {
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
            className="fixed bottom-6 right-6 bg-indigo-600 text-white px-4 py-2 rounded-full font-bold shadow-lg z-50"
          >
            ← Back to Student View
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
            onLogout={() => handleLogout(() => setUserProfile(initialUserProfile))}
            onAdminClick={() => setView('admin')}
          />

          <AdaptiveBanner
            weakestConcept={weakestConcept}
            conceptMastery={userProfile.conceptMastery}
            trajectoryLength={userProfile.learningTrajectory.length}
          />

          <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
            <Sidebar
              recommendedProblems={recommendedProblems}
              currentProblem={currentProblem}
              userProfile={userProfile}
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
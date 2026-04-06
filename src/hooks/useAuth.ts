// Hook to manage login/logout and remember the user's session in localStorage

import { useState, useEffect } from 'react';
import type { AuthUser, UserProfile } from '../types';
import { initialUserProfile } from '../utils/userProfile';
import type { Problem } from '../utils/problemDatabase';

export function useAuth(
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>,
  setQuizCompleted: React.Dispatch<React.SetStateAction<boolean | null>>,
  setCurrentProblem: React.Dispatch<React.SetStateAction<Problem | null>>,
) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // On first load, check if they were already logged in (stored in browser memory)
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

  const handleLogin = (
    auth: { token: string; role: 'student' | 'admin'; email: string; quizResult?: { level: string; conceptPriors: Record<string, number> } },
    getProblems: () => Problem[],
  ) => {
    const userData: AuthUser = { token: auth.token, role: auth.role, email: auth.email };
    localStorage.setItem('skillforge:auth', JSON.stringify(userData));

    if (auth.quizResult) {
      const seededProfile: UserProfile = {
        ...initialUserProfile,
        skillLevel: auth.quizResult.level as UserProfile['skillLevel'],
        conceptMastery: auth.quizResult.conceptPriors,
      };
      setUserProfile(seededProfile);
      setQuizCompleted(true);

      const cachedProblems = getProblems();
      if (cachedProblems.length > 0) {
        const first = [...cachedProblems].sort((a, b) => {
          const sA = a.concepts.reduce((s, c) => s + (auth.quizResult!.conceptPriors[c] ?? 0.5), 0) / a.concepts.length;
          const sB = b.concepts.reduce((s, c) => s + (auth.quizResult!.conceptPriors[c] ?? 0.5), 0) / b.concepts.length;
          return sA - sB;
        })[0];
        if (first) setCurrentProblem(first);
      }
    }

    setAuthUser(userData);
  };

  const handleLogout = (resetProfile: () => void) => {
    localStorage.removeItem('skillforge:auth');
    setAuthUser(null);
    resetProfile();
  };

  return { authUser, setAuthUser, authChecked, handleLogin, handleLogout };
}
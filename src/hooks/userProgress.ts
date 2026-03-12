// ---------------------------------------------------------------------------
// useProgress — extracted from App.tsx
// Handles loading progress from the backend on login, and autosaving on change.
// ---------------------------------------------------------------------------

import { useEffect, useCallback, useRef } from 'react';
import type { AuthUser, UserProfile } from '../types';
import type { Problem } from '../utils/problemDatabase';

const API_BASE = 'http://localhost:4000';

export function useProgress(
  authUser: AuthUser | null,
  userProfile: UserProfile,
  currentProblem: Problem | null,
  code: string,
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>,
  setQuizCompleted: React.Dispatch<React.SetStateAction<boolean | null>>,
  setCurrentProblem: React.Dispatch<React.SetStateAction<Problem | null>>,
  setCode: React.Dispatch<React.SetStateAction<string>>,
  loadProblems: (token: string) => Promise<Problem[]>,
) {
  const isSavingRef = useRef(false);

  // Save progress — debounced, prevents overlapping saves
  const saveProgress = useCallback(async (
    profile: UserProfile,
    problemId: number,
    code: string,
    token: string,
  ) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      await fetch(`${API_BASE}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          profile,
          lastProblemId: problemId,
          lastCode: code,
        }),
      });
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  // Autosave every 1.5s when profile or code changes
  useEffect(() => {
    if (!authUser || !currentProblem) return;
    const timeout = setTimeout(() => {
      saveProgress(userProfile, currentProblem.id, code, authUser.token);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [userProfile, code, authUser, currentProblem?.id, saveProgress]);

  // Load saved progress on login
  useEffect(() => {
    if (!authUser) return;

    const loadUserState = async () => {
      try {
        const problems = await loadProblems(authUser.token);
        if (problems.length === 0) return;

        const response = await fetch(`${API_BASE}/progress`, {
          headers: { Authorization: `Bearer ${authUser.token}` },
        });
        const data = await response.json();

        // Restore quiz status and profile
        const shouldShowQuiz = !data?.profile?.skillLevel && authUser.role !== 'admin';
        setQuizCompleted(shouldShowQuiz ? false : true);

        if (data?.profile) {
          setUserProfile(prev => {
            // Don't overwrite quiz priors
            if (Object.keys(prev.conceptMastery).length > 0) return prev;
            return { 
              ...prev, 
              ...data.profile, 
              solvedProblemIds: data.profile.solvedProblemIds ?? [] 
            };
          });
        }

        // Restore problem and code
        const lastProblem = problems.find(p => p.id === data?.last_problem_id) ?? problems[0];
        setCurrentProblem(lastProblem);
        setCode(data?.last_code ?? lastProblem.starterCode);
      } catch (error) {
        console.error('Failed to load progress:', error);
        // Fallback
        const problems = await loadProblems(authUser.token);
        if (problems.length > 0) {
          setQuizCompleted(authUser.role === 'admin' ? true : false);
          setCurrentProblem(problems[0]);
          setCode(problems[0].starterCode);
        }
      }
    };

    loadUserState();
  }, [authUser]);
}
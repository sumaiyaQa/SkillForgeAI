// Hook to load progress from the backend when students log in and save their work automatically

import { useEffect, useCallback, useRef } from 'react';
import type { AuthUser, UserProfile } from '../types';
import type { Problem } from '../utils/problemDatabase';
import { getProblemDatabase } from '../utils/problemDatabase';

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
  type SavePayload = {
    profile: UserProfile;
    problemId: number;
    code: string;
    token: string;
  };

  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef<SavePayload | null>(null);
  const latestProfileRef = useRef(userProfile);
  const latestCodeRef = useRef(code);

  useEffect(() => {
    latestProfileRef.current = userProfile;
  }, [userProfile]);

  useEffect(() => {
    latestCodeRef.current = code;
  }, [code]);

  // Don't send multiple saves at once; queue the latest one and send it when the previous finishes
  const saveProgress = useCallback(async (payload: SavePayload) => {
    if (isSavingRef.current) {
      // Store the latest data and send it next, discarding older queued data
      pendingSaveRef.current = payload;
      return;
    }

    isSavingRef.current = true;
    try {
      await fetch(`${API_BASE}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${payload.token}`,
        },
        body: JSON.stringify({
          profile: payload.profile,
          lastProblemId: payload.problemId,
          lastCode: payload.code,
        }),
      });
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      isSavingRef.current = false;

      const next = pendingSaveRef.current;
      if (next) {
        pendingSaveRef.current = null;
        saveProgress(next);
      }
    }
  }, []);

  // Every 1.5 seconds, save their current progress (code and mastery) to the backend
  useEffect(() => {
    if (!authUser || !currentProblem) return;
    const timeout = setTimeout(() => {
      saveProgress({
        profile: userProfile,
        problemId: currentProblem.id,
        code,
        token: authUser.token,
      });
    }, 1500);
    return () => clearTimeout(timeout);
  }, [userProfile, code, authUser, currentProblem?.id, saveProgress]);

  // When they switch to a different problem, save their code for the old problem first
  useEffect(() => {
    if (!authUser || !currentProblem) return;

    return () => {
      saveProgress({
        profile: latestProfileRef.current,
        problemId: currentProblem.id,
        code: latestCodeRef.current,
        token: authUser.token,
      });
    };
  }, [authUser, currentProblem?.id, saveProgress]);

  // When they log in, restore everything: their profile, last problem, and last code
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

        // Restore their quiz status and all their learning data
        const hasSeededProfile = Object.keys(userProfile.conceptMastery).length > 0;
        const shouldShowQuiz = !data?.profile?.skillLevel && authUser.role !== 'admin' && !hasSeededProfile;
        setQuizCompleted(shouldShowQuiz ? false : true);

        if (data?.profile) {
          setUserProfile(prev => {
            // Don't lose the priors they got from the placement quiz
            if (Object.keys(prev.conceptMastery).length > 0) return prev;
            return { 
              ...prev, 
              ...data.profile, 
              solvedProblemIds: data.profile.solvedProblemIds ?? [] 
            };
          });
        }

        // Load their last problem and the code they were working on
        const lastProblem = problems.find(p => p.id === data?.last_problem_id) ?? problems[0];
        setCurrentProblem(lastProblem);
        setCode(data?.last_code ?? lastProblem.starterCode);
      } catch (error) {
        console.error('Failed to load progress:', error);
        // If loading from the backend fails, use cached problems instead; don't force them to redo the quiz
        const problems = getProblemDatabase();
        if (problems.length > 0) {
          if (authUser.role === 'admin') {
            setQuizCompleted(true);
          }
          setCurrentProblem(problems[0]);
          setCode(problems[0].starterCode);
        }
      }
    };

    loadUserState();
  }, [authUser]);
}
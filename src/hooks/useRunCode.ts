import { useState, useRef } from 'react';
import type { UserProfile } from '../types';
import type { Problem } from '../utils/problemDatabase';
import { classifyError, computeOverallMastery, computeSkillLevel } from '../utils/userProfile';
import { runPython } from '../utils/pythonRunner';
import { selectAdaptiveHint } from '../models/Hint';
import { updateConceptMastery } from '../models/bkt';

export function useRunCode(
  currentProblem: Problem | null,
  code: string,
  sessionStartTime: number,
  userProfile: UserProfile,
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>,
) {
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [hints, setHints] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [failureCount, setFailureCount] = useState(0);
  const failureCountRef = useRef(0);

  const reset = () => {
    setOutput('');
    setError('');
    setHints([]);
    failureCountRef.current = 0;
    setFailureCount(0);
  };

  const handleRunCode = async () => {
    if (!currentProblem) return;
    setRunning(true);
    setOutput('');
    setError('');
    setHints([]);

    try {
      const res = await runPython(code, currentProblem.exampleCases, currentProblem.functionName);

      setOutput(res.output || '');
      setError(res.error || '');

      // --- AST hints (always show if present) ---
      const astHints: string[] = res.hints ?? [];
      if (astHints.length > 0 && !res.passed) setHints(astHints);

      // --- Update profile atomically ---
      setUserProfile(prev => {
        const isAlreadySolved = prev.solvedProblemIds.includes(currentProblem.id);
        const newTotalSubmissions = isAlreadySolved
          ? prev.totalSubmissions
          : prev.totalSubmissions + 1;

        const elapsedSeconds = Math.round((Date.now() - sessionStartTime) / 1000);

        const newErrorPatterns = { ...prev.errorPatterns };
        const newErrorHistory = [...prev.errorHistory];
        if (!res.passed && res.error && !isAlreadySolved) {
          const errorType = classifyError(res.error);
          newErrorPatterns[errorType] = (newErrorPatterns[errorType] ?? 0) + 1;
          newErrorHistory.push({ timestamp: Date.now(), errorType });
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
          const updatedMasteryOnSuccess = updateConceptMastery(
            prev.conceptMastery,
            currentProblem.concepts,
            true
          );

          const newSolvedIds = [...prev.solvedProblemIds, currentProblem.id];
          const overallMastery = computeOverallMastery(updatedMasteryOnSuccess);
          const newTrajectory = [
            ...prev.learningTrajectory,
            { timestamp: Date.now(), overallMastery },
          ];
          if (newTrajectory.length > 200) newTrajectory.shift();

          const newTotalTime = prev.totalSolveTimeSeconds + elapsedSeconds;
          const newSuccessful = prev.successfulSubmissions + 1;
          const newAvgTime = Math.round(newTotalTime / newSuccessful);

          const masteryEntries = Object.entries(updatedMasteryOnSuccess);
          const strengths = masteryEntries.filter(([, v]) => v >= 0.75).map(([k]) => k);
          const weaknesses = masteryEntries.filter(([, v]) => v < 0.45).map(([k]) => k);

          const newSkillLevel = computeSkillLevel(newSolvedIds.length, overallMastery, prev.skillLevel);

          return {
            ...prev,
            totalSubmissions: newTotalSubmissions,
            successfulSubmissions: newSuccessful,
            problemsSolved: newSolvedIds.length,
            solvedProblemIds: newSolvedIds,
            conceptMastery: updatedMasteryOnSuccess,
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

        // BKT update on failure — use updated mastery immediately for hint selection
        const updatedMasteryOnFail = updateConceptMastery(
          prev.conceptMastery,
          currentProblem.concepts,
          false
        );

        failureCountRef.current += 1;

        // Select hint using the *updated* (post-BKT) mastery so scaffolding
        // reflects the student's current knowledge state, not the stale prior.
        const adaptiveHint = selectAdaptiveHint(currentProblem.hints, {
          conceptMastery: updatedMasteryOnFail,
          errorHints: astHints,
          previousHintsUsed: failureCountRef.current - 1,
        });

        if (adaptiveHint && !astHints.includes(adaptiveHint.content)) {
          setHints(h => h.includes(adaptiveHint.content) ? h : [...h, adaptiveHint.content]);
        }

        return {
          ...prev,
          totalSubmissions: newTotalSubmissions,
          errorPatterns: newErrorPatterns,
          errorHistory: newErrorHistory,
          conceptMastery: updatedMasteryOnFail,
          hintsUsed: adaptiveHint ? prev.hintsUsed + 1 : prev.hintsUsed,
        };
      });

      // Keep failureCount state in sync (ref was already incremented above)
      if (!res.passed && !userProfile.solvedProblemIds.includes(currentProblem.id)) {
        setFailureCount(failureCountRef.current);
      }
    } catch (err) {
      setError('System Error: ' + String(err));
    } finally {
      setRunning(false);
    }
  };

  return { output, error, hints, running, failureCount, reset, handleRunCode };
}
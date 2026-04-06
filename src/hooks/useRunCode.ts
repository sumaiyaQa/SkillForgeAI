import { useState, useRef } from 'react';
import type { UserProfile } from '../types';
import type { Problem } from '../utils/problemDatabase';
import { classifyError, computeOverallMastery, computeSkillLevel } from '../utils/userProfile';
import { runPython } from '../utils/pythonRunner';
import { selectAdaptiveHint } from '../models/Hint';
import { updateConceptMastery } from '../models/bkt';
import { getCoveredConcepts } from '../utils/problemDatabase';

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
  const coveredConcepts = getCoveredConcepts();
  const activeConcepts = coveredConcepts.size > 0 ? coveredConcepts : undefined;

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

      // Show any code analysis messages (syntax errors, infinite loops, etc.)
      const astHints: string[] = res.hints ?? [];
      if (astHints.length > 0 && !res.passed) setHints(astHints);

      // Update all their progress: score, mastery, time taken, errors, etc.
      setUserProfile(prev => {
        const isAlreadySolved = prev.solvedProblemIds.includes(currentProblem.id);
        // Only count first-time attempts in the submission stats
        // If they run code on a problem they already solved, that's just practice
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
          const updatedMasteryOnRepeat = updateConceptMastery(
            prev.conceptMastery,
            currentProblem.concepts,
            Boolean(res.passed)
          );

          return {
            ...prev,
            errorPatterns: newErrorPatterns,
            errorHistory: newErrorHistory,
            conceptMastery: updatedMasteryOnRepeat,
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
          const overallMastery = computeOverallMastery(updatedMasteryOnSuccess, activeConcepts);
          const newTrajectory = [
            ...prev.learningTrajectory,
            { timestamp: Date.now(), overallMastery },
          ];
          if (newTrajectory.length > 200) newTrajectory.shift();

          const newTotalTime = prev.totalSolveTimeSeconds + elapsedSeconds;
          const newSuccessful = prev.successfulSubmissions + 1;
          const newAvgTime = Math.round(newTotalTime / newSuccessful);

          const masteryEntries = Object.entries(updatedMasteryOnSuccess).filter(
            ([concept]) => !activeConcepts || activeConcepts.has(concept)
          );
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

        // Update their concept mastery right away, then pick a hint based on their new level
        const updatedMasteryOnFail = updateConceptMastery(
          prev.conceptMastery,
          currentProblem.concepts,
          false
        );

        failureCountRef.current += 1;

        // Use their updated knowledge to pick a hint at their level
        // Don't use their old mastery score — use what we just calculated
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

      // Update the failure counter UI to match the internal state
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
import type { UserProfile } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Classifies a Python error string into a short category key */
export function classifyError(errorStr: string): string {
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
export function computeOverallMastery(conceptMastery: Record<string, number>): number {
  const values = Object.values(conceptMastery);
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Updates skill level based on problems solved and mastery.
 *  currentLevel is preserved until the student has enough solve history
 *  for the activity-based thresholds to be meaningful — prevents
 *  the placement quiz result from being overwritten to 'beginner'
 *  just because solvedCount is 0.
 */
export function computeSkillLevel(
  solvedCount: number,
  overallMastery: number,
  currentLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
): 'beginner' | 'intermediate' | 'advanced' {
  if (solvedCount >= 15 && overallMastery >= 0.75) return 'advanced';
  if (solvedCount >= 6 && overallMastery >= 0.55) return 'intermediate';
  if (solvedCount < 6) return currentLevel;
  return 'beginner';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const initialUserProfile: UserProfile = {
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
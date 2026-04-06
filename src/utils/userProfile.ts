import type { UserProfile } from '../types';

// Utility functions for tracking and calculating user progress

// Identify what type of error the user ran into (syntax, logic, etc.)
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

// Average all the user's concept mastery scores to get their overall skill
// optionally filtered to just specific concepts
export function computeOverallMastery(
  conceptMastery: Record<string, number>,
  allowedConcepts?: Iterable<string>
): number {
  const values = allowedConcepts
    ? [...allowedConcepts]
        .map(concept => conceptMastery[concept])
        .filter((value): value is number => typeof value === 'number')
    : Object.values(conceptMastery);

  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Determine if the user should level up from beginner to intermediate or advanced
// Keep their current level if they haven't solved enough problems yet
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

// Default profile for new users or those without any progress yet

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
export interface UserProfile {
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  problemsSolved: number;
  solvedProblemIds: number[];
  hintsUsed: number;
  totalSubmissions: number;
  successfulSubmissions: number;
  totalSolveTimeSeconds: number;
  averageSolveTimeSeconds: number;
  lastSolveTimeSeconds: number;
  errorPatterns: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  conceptMastery: Record<string, number>;
  learningTrajectory: Array<{
    timestamp: number;
    overallMastery: number;
  }>;
  errorHistory: Array<{
    timestamp: number;
    errorType: string;
  }>;
  solvedSolutions: Record<number, string>;
}

export interface AuthUser {
  token: string;
  role: 'student' | 'admin';
  email: string;
}
// User's current proficiency level
export interface UserProfile {
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  
  // Problem-solving progress
  problemsSolved: number;
  solvedProblemIds: number[];
  
  // Hint usage stats
  hintsUsed: number;
  
  // Submission metrics
  totalSubmissions: number;
  successfulSubmissions: number;
  
  // Time tracking
  totalSolveTimeSeconds: number;
  averageSolveTimeSeconds: number;
  lastSolveTimeSeconds: number;
  
  // Error tracking and analysis
  errorPatterns: Record<string, number>;
  
  // What the student is good/bad at
  strengths: string[];
  weaknesses: string[];
  
  // Learning progress by concept (0-1 scale)
  conceptMastery: Record<string, number>;
  
  // Historical mastery progression over time
  learningTrajectory: Array<{
    timestamp: number;
    overallMastery: number;
  }>;
  
  // Record of all errors encountered
  errorHistory: Array<{
    timestamp: number;
    errorType: string;
  }>;
  
  // Store their code solutions for each problem
  solvedSolutions: Record<number, string>;
}

// Information about the logged-in user
export interface AuthUser {
  token: string;  // JWT token for API requests
  role: 'student' | 'admin';  // What permissions the user has
  email: string;  // Their account email
}
import type { Hint } from '../models/Hint';

// This is what a coding problem looks like in our system

export interface Problem {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  starterCode: string;
  exampleCases: Array<{ input: string; output: string }>;
  concepts: string[];
  hints: Hint[];
  visualization?: string;
  functionName?: string;
}

// The database sends us problems with snake_case column names, so we need to convert them

interface RawDBProblem {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  starter_code: string;
  example_cases: Array<{ input: string; output: string }>;
  concepts: string[];
  hints: Hint[];
  visualization: string | null;
  function_name: string | null;
}

// Convert the database format to what the frontend expects

function mapRow(row: RawDBProblem): Problem {
  return {
    id:           row.id,
    title:        row.title,
    difficulty:   row.difficulty,
    description:  row.description,
    starterCode:  row.starter_code,
    exampleCases: row.example_cases ?? [],
    concepts:     row.concepts ?? [],
    hints:        row.hints ?? [],
    visualization: row.visualization ?? undefined,
    functionName:  row.function_name ?? undefined,
  };
}

// Store problems in memory so we only fetch them once from the backend
// This gets populated the first time loadProblems() is called

let _cache: Problem[] = [];
let _loaded = false;

// Download all problems from the backend and save them in memory
// Call this once when the app first starts
export async function loadProblems(token: string): Promise<Problem[]> {
  if (_loaded) return _cache;

  try {
    const res = await fetch('http://localhost:4000/problems', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Failed to fetch problems from server');

    const rows: RawDBProblem[] = await res.json();
    _cache  = rows.map(mapRow);
    _loaded = true;
    return _cache;
  } catch (err) {
    console.error('Problem fetch failed — using empty list:', err);
    _loaded = true; // don't retry on every render
    _cache  = [];
    return _cache;
  }
}

// Get the problems we already loaded from the backend
// This is fast because it just returns what's already in memory
export function getProblemDatabase(): Problem[] {
  return _cache;
}

// Manually set the problems list (useful for testing or development)
export function setProblemCache(problems: Problem[]): void {
  _cache  = problems;
  _loaded = true;
}

// Get all the concept names that are actually used in practice problems
// (ignores concepts that only appear in the placement quiz)
export function getCoveredConcepts(problems: Problem[] = _cache): Set<string> {
  const covered = new Set<string>();

  for (const problem of problems) {
    for (const concept of problem.concepts) {
      covered.add(concept);
    }
  }

  return covered;
}

// Remove mastery scores for concepts that don't have any practice problems
// This keeps the profile clean and focused on what's actually learnable
export function filterMasteryToCoveredConcepts(
  mastery: Record<string, number>,
  problems: Problem[] = _cache,
): Record<string, number> {
  const covered = getCoveredConcepts(problems);
  const filtered: Record<string, number> = {};

  for (const [concept, value] of Object.entries(mastery)) {
    if (covered.has(concept)) {
      filtered[concept] = value;
    }
  }

  return filtered;
}

// Utility functions

export function getNextProblem(currentId: number, pool: Problem[]): Problem | null {
  const index = pool.findIndex(p => p.id === currentId);
  if (index === -1 || index === pool.length - 1) return null;
  return pool[index + 1];
}
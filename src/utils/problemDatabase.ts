import type { Hint } from '../models/Hint';

// ─────────────────────────────────────────────────────────────────────────────
// Problem model
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Shape returned by the backend (snake_case columns)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Map DB row → frontend Problem shape
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Runtime cache
// Populated once on first call to loadProblems(), then reused.
// ─────────────────────────────────────────────────────────────────────────────

let _cache: Problem[] = [];
let _loaded = false;

/**
 * Fetch all problems from the backend and cache them.
 * Call this once on app startup (in App.tsx useEffect).
 */
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

/**
 * Synchronous accessor used throughout the app after loadProblems() resolves.
 * Returns whatever is currently in the cache.
 */
export function getProblemDatabase(): Problem[] {
  return _cache;
}

/**
 * Manually inject problems into the cache (used for testing / SSR).
 */
export function setProblemCache(problems: Problem[]): void {
  _cache  = problems;
  _loaded = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (unchanged API)
// ─────────────────────────────────────────────────────────────────────────────

export function getNextProblem(currentId: number, pool: Problem[]): Problem | null {
  const index = pool.findIndex(p => p.id === currentId);
  if (index === -1 || index === pool.length - 1) return null;
  return pool[index + 1];
}
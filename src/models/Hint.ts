export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze';

const bloomDifficulty: Record<BloomLevel, number> = {
  remember: 1,
  understand: 2,
  apply: 3,
  analyze: 4,
};

export interface AdaptiveContext {
  conceptMastery: Record<string, number>; // Mastery score for each concept (0 = knows nothing, 1 = expert)
  errorHints: string[]; // Hints from code analysis (syntax errors, infinite loops, etc.)
  previousHintsUsed: number;
}

function getZPDLevel(mastery: number): BloomLevel {
  if (mastery < 0.4) return 'remember';
  if (mastery < 0.6) return 'understand';
  if (mastery < 0.8) return 'apply';
  return 'analyze';
}


export interface Hint {
  id: string;
  level: BloomLevel;
  content: string;
  scaffolding: number; // 1 = basic explanation, higher numbers = more detailed examples
  concept: string;
}

export interface RuntimeHint {
  content: string;
  level?: BloomLevel;
  source: 'ast' | 'problem';
}

export function selectAdaptiveHint(
  problemHints: Hint[],
  context: AdaptiveContext
): RuntimeHint | null {
  if (!problemHints.length) return null;

  // If the code has syntax/logic errors, show those first before curriculum hints
  if (context.errorHints.length > 0) {
    return {
      content: context.errorHints[0],
      source: 'ast',
    };
  }

  // Figure out which concept the student struggles with most
  const weakestConcept = problemHints.reduce((weakest, hint) => {
    const mastery = context.conceptMastery[hint.concept] ?? 0.5;
    const weakestMastery =
      context.conceptMastery[weakest.concept] ?? 0.5;

    return mastery < weakestMastery ? hint : weakest;
  }).concept;

  const mastery = context.conceptMastery[weakestConcept] ?? 0.5;

  // Based on their mastery, pick a Bloom level that's in their zone of proximal development
  const targetLevel = getZPDLevel(mastery);

  // Only look at hints for their weakest concept
  const conceptHints = problemHints.filter(
    h => h.concept === weakestConcept
  );

  // Pick the hint that best matches their target Bloom level
  let bestHint = conceptHints[0];

  conceptHints.forEach(h => {
    const currentDiff =
      Math.abs(bloomDifficulty[h.level] - bloomDifficulty[targetLevel]);

    const bestDiff =
      Math.abs(bloomDifficulty[bestHint.level] - bloomDifficulty[targetLevel]);

    if (currentDiff < bestDiff) {
      bestHint = h;
    }
  });

  return {
    content: bestHint.content,
    level: bestHint.level,
    source: 'problem',
  };
}

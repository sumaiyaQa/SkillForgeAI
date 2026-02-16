export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze';

const bloomDifficulty: Record<BloomLevel, number> = {
  remember: 1,
  understand: 2,
  apply: 3,
  analyze: 4,
};

export interface AdaptiveContext {
  conceptMastery: Record<string, number>; // 0 to 1
  errorHints: string[]; // AST hints
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
  scaffolding: number; // 1 = earliest, higher = more detailed
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

  //  If AST detected a critical issue → prioritize AST
  if (context.errorHints.length > 0) {
    return {
      content: context.errorHints[0],
      source: 'ast',
    };
  }

  //  Determine weakest concept
  const weakestConcept = problemHints.reduce((weakest, hint) => {
    const mastery = context.conceptMastery[hint.concept] ?? 0.5;
    const weakestMastery =
      context.conceptMastery[weakest.concept] ?? 0.5;

    return mastery < weakestMastery ? hint : weakest;
  }).concept;

  const mastery = context.conceptMastery[weakestConcept] ?? 0.5;

  //  Determine ZPD target level
  const targetLevel = getZPDLevel(mastery);

  //  Filter hints by concept
  const conceptHints = problemHints.filter(
    h => h.concept === weakestConcept
  );

  // Find hint closest to target Bloom level
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

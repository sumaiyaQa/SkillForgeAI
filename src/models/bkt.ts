/**
* Bayesian Knowledge Tracing (BKT)  A way to track how well a student understands concepts
 *
 * Instead of just giving a score, BKT tracks the PROBABILITY that a student knows a concept.
 * Based on whether they get problems right or wrong, we update that probability.
 *
 * The system uses four parameters:
 *   - pInit: Starting guess before they solve anything
 *   - pLearn: Chance they learn it after each attempt
 *   - pGuess: Chance they get it right without actually knowing (lucky guess)
 *   - pSlip: Chance they get it wrong even though they know it (careless mistake)
 *
 * This is a real model used in education research, published by Corbett & Anderson (1995).
 */

export interface BKTParams {
  pLearn: number;  // Chance they learn it on this attempt
  pGuess: number;  // Chance they guess correctly
  pSlip:  number;  // Chance they make a careless mistake
  pInit:  number;  // Starting assumption about their knowledge
}

// Default parameters (well-established empirical values from ITS literature)
const DEFAULT_BKT: BKTParams = {
  pLearn: 0.3,   // After each problem, 30% chance they learn it
  pGuess: 0.25,  // About 25% chance they get lucky and guess right
  pSlip:  0.1,   // About 10% chance they know it but make a mistake
  pInit:  0.3,   // Before doing anything, assume 30% they know it
};
/**
 * Update how much we think a student knows based on their response
 * If they got it right, increase confidence. If wrong, decrease it.
 *

 * @param currentMastery  What we think they know (0 = nothing, 1 = everything)
 * @param correct  True if they got it right, false if they got it wrong
 * @param params  The BKT tuning values (uses defaults if not provided)
 * @returns  Updated belief about their knowledge
 */

export function updateMastery(
  currentMastery: number,
  correct: boolean,
  params: BKTParams = DEFAULT_BKT
): number {
  const { pLearn, pGuess, pSlip } = params;
  const pKnow = currentMastery;

  // First: Use Bayes' rule to update our belief based on whether they got it right
  let pKnowGivenObs: number;

  if (correct) {
    // If they got it right, calculate P(know | correct)
    const pCorrect = pKnow * (1 - pSlip) + (1 - pKnow) * pGuess;
    pKnowGivenObs = (pKnow * (1 - pSlip)) / pCorrect;
  } else {
    // If they got it wrong, calculate P(know | wrong)
    const pWrong = pKnow * pSlip + (1 - pKnow) * (1 - pGuess);
    pKnowGivenObs = (pKnow * pSlip) / pWrong;
  }

  // Second: Account for learning they might have learned even if they got it wrong
  const pKnowNext = pKnowGivenObs + (1 - pKnowGivenObs) * pLearn;

  // Keep the probability between 0 and 1
  return Math.min(1, Math.max(0, pKnowNext));
}

/**
 * Update how much students know for all concepts in a problem
 * Use this when they submit code if it passes, boost all concept mastery if it fails, lower it
 *
 * @param currentMastery  Their current mastery scores for each concept
 * @param concepts  Which concepts this problem covers
 * @param correct  Whether they solved the problem
 * @returns  Updated mastery scores for all concepts
 */
export function updateConceptMastery(
  currentMastery: Record<string, number>,
  concepts: string[],
  correct: boolean
): Record<string, number> {
  const updated = { ...currentMastery };

  for (const concept of concepts) {
    const prior = updated[concept] ?? DEFAULT_BKT.pInit;
    updated[concept] = updateMastery(prior, correct);
  }

  return updated;
}

/**
 * Get a friendly label for their mastery level
 */
export function getMasteryLabel(mastery: number): string {
  if (mastery < 0.4) return 'Novice';
  if (mastery < 0.6) return 'Developing';
  if (mastery < 0.8) return 'Proficient';
  return 'Mastered';
}

/**
 * Get a color that matches their mastery level (for badges and progress bars)
 */
export function getMasteryColor(mastery: number): string {
  if (mastery < 0.4) return 'text-red-600';
  if (mastery < 0.6) return 'text-amber-500';
  if (mastery < 0.8) return 'text-blue-600';
  return 'text-emerald-600';
}
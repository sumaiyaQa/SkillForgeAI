/**
 * bkt.ts — Simplified Bayesian Knowledge Tracing (BKT)
 *
 * BKT models knowledge as a hidden binary state: either the student
 * "knows" a concept or they don't. We track the PROBABILITY of knowing
 * it given the evidence of correct/incorrect responses.
 *
 * Standard BKT parameters (these are empirically tuned defaults;
 * you can cite Corbett & Anderson 1995 in your dissertation):
 *
 *   P(L0)  — prior probability of knowing the concept before any practice
 *   P(T)   — probability of learning/transitioning on each opportunity
 *   P(G)   — probability of a correct response despite NOT knowing (guess)
 *   P(S)   — probability of an incorrect response despite knowing (slip)
 *
 * Reference: Corbett, A.T. & Anderson, J.R. (1995). Knowledge tracing:
 * Modeling the acquisition of procedural knowledge. User Modeling and
 * User-Adapted Interaction, 4(4), 253–278.
 */

export interface BKTParams {
  pLearn: number;  // P(T) — transit/learn probability per attempt
  pGuess: number;  // P(G)
  pSlip:  number;  // P(S)
  pInit:  number;  // P(L0) — starting prior if no history
}

// Default parameters (well-established empirical values from ITS literature)
const DEFAULT_BKT: BKTParams = {
  pLearn: 0.3,   // 30% chance of learning the concept on each attempt
  pGuess: 0.25,  // 25% chance of guessing correctly without knowledge
  pSlip:  0.1,   // 10% chance of slipping despite knowing
  pInit:  0.3,   // Start with 30% prior (reasonable for novice students)
};

/**
 * updateMastery — Apply one BKT update step.
 *
 * @param currentMastery  Current P(Ln) — probability student knows concept (0–1)
 * @param correct         Whether the student answered correctly
 * @param params          BKT parameters (uses defaults if omitted)
 * @returns               Updated P(Ln+1)
 */
export function updateMastery(
  currentMastery: number,
  correct: boolean,
  params: BKTParams = DEFAULT_BKT
): number {
  const { pLearn, pGuess, pSlip } = params;
  const pKnow = currentMastery;

  // Step 1: Update belief given the observed response (Bayes' rule)
  let pKnowGivenObs: number;

  if (correct) {
    // P(know | correct) = P(correct | know) * P(know) / P(correct)
    const pCorrect = pKnow * (1 - pSlip) + (1 - pKnow) * pGuess;
    pKnowGivenObs = (pKnow * (1 - pSlip)) / pCorrect;
  } else {
    // P(know | wrong) = P(wrong | know) * P(know) / P(wrong)
    const pWrong = pKnow * pSlip + (1 - pKnow) * (1 - pGuess);
    pKnowGivenObs = (pKnow * pSlip) / pWrong;
  }

  // Step 2: Apply learning transition — student may have learned even if wrong
  const pKnowNext = pKnowGivenObs + (1 - pKnowGivenObs) * pLearn;

  // Clamp to [0, 1] for safety
  return Math.min(1, Math.max(0, pKnowNext));
}

/**
 * updateConceptMastery — Update mastery for all concepts a problem covers.
 *
 * Drop-in replacement for the flat +0.1 / -0.05 logic in App.tsx.
 * Call this in the handleRunCode success/failure branches.
 *
 * @param currentMastery  Record<concept, mastery> from userProfile
 * @param concepts        Concepts covered by the current problem
 * @param correct         Whether submission passed all tests
 * @returns               New conceptMastery record
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
 * getMasteryLabel — Human-readable label for use in the UI.
 */
export function getMasteryLabel(mastery: number): string {
  if (mastery < 0.4) return 'Novice';
  if (mastery < 0.6) return 'Developing';
  if (mastery < 0.8) return 'Proficient';
  return 'Mastered';
}

/**
 * getMasteryColor — Tailwind colour class for mastery badges.
 */
export function getMasteryColor(mastery: number): string {
  if (mastery < 0.4) return 'text-red-600';
  if (mastery < 0.6) return 'text-amber-500';
  if (mastery < 0.8) return 'text-blue-600';
  return 'text-emerald-600';
}
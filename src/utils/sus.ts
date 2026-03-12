// Calculate a System Usability Scale (SUS) score from 10 Likert responses (1-5)
//
// Formula:
//   Odd-indexed items  (0,2,4,6,8): contribute (r - 1)
//   Even-indexed items (1,3,5,7,9): contribute (5 - r)
//   Total × 2.5  →  score in [0, 100]
export function calculateSUS(responses: number[]): number {
  if (responses.length !== 10) {
    throw new Error('SUS requires exactly 10 responses');
  }

  const sum = responses.reduce((acc, r, i) => {
    return acc + (i % 2 === 0 ? r - 1 : 5 - r);
  }, 0);

  return sum * 2.5;
}


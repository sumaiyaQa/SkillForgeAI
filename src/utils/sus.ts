// Calculate a System Usability Scale (SUS) score from 10 Likert responses (1-5)
export function calculateSUS(responses: number[]): number {
  if (responses.length !== 10) {
    throw new Error('SUS requires exactly 10 responses');
  }

  const sum = responses.reduce((acc, r, i) => {
    // Odd items (1,3,5,7,9) -> (r - 1); even items (2,4,6,8,10) -> (5 - r)
    return acc + (i % 2 === 0 ? r - 1 : 5 - r);
  }, 0);

  return sum * 2.5; // Scale to 0–100
}
// Calculate how users rate the system's usability on a scale of 0-100
// We take their 10 survey answers and apply the SUS formula to get the score
// Positive items (0,2,4,6,8) use: answer - 1
// Negative items (1,3,5,7,9) use: 5 - answer
// Then multiply everything by 2.5 to get a 0-100 scale
export function calculateSUS(responses: number[]): number {
  if (responses.length !== 10) {
    throw new Error('SUS requires exactly 10 responses');
  }

  const sum = responses.reduce((acc, r, i) => {
    return acc + (i % 2 === 0 ? r - 1 : 5 - r);
  }, 0);

  return sum * 2.5;
}


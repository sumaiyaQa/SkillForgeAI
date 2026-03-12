import { describe, it, expect } from 'vitest';
import { calculateSUS } from '../utils/sus';

// The SUS formula:
//   Odd-indexed items  (0,2,4,6,8): contribute (r - 1)
//   Even-indexed items (1,3,5,7,9): contribute (5 - r)
//   Total × 2.5  →  score in [0, 100]

describe('calculateSUS', () => {
  it('returns 100 for a perfect-positive response set', () => {
    // All odd positions r=5 → 4 pts each; all even positions r=1 → 4 pts each
    // sum=40 → 40×2.5 = 100
    const responses = [5, 1, 5, 1, 5, 1, 5, 1, 5, 1];
    expect(calculateSUS(responses)).toBe(100);
  });

  it('returns 0 for a worst-case response set', () => {
    const responses = [1, 5, 1, 5, 1, 5, 1, 5, 1, 5];
    expect(calculateSUS(responses)).toBe(0);
  });

  it('returns 50 for a fully neutral midpoint set', () => {
    // All r=3: odd gives (3-1)=2, even gives (5-3)=2 → sum=20 → 20×2.5=50
    const responses = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
    expect(calculateSUS(responses)).toBe(50);
  });

  it('calculates a known mixed response correctly (87.5)', () => {
    // Odd positions r=4 → (4-1)=3×5=15; even positions r=1 → (5-1)=4×5=20
    // sum=35 → 35×2.5 = 87.5
    const responses = [4, 1, 4, 1, 4, 1, 4, 1, 4, 1];
    expect(calculateSUS(responses)).toBe(87.5);
  });

  it('throws if fewer than 10 responses are provided', () => {
    expect(() => calculateSUS([5, 5, 5])).toThrow('SUS requires exactly 10 responses');
  });

  it('throws if more than 10 responses are provided', () => {
    expect(() => calculateSUS([1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 5])).toThrow(
      'SUS requires exactly 10 responses'
    );
  });
});
import { describe, it, expect } from 'vitest';
import { calculateSUS } from '../utils/sus';

// Test the SUS score calculation
// The formula works by:
//   Positive questions (0,2,4,6,8): score = answer - 1
//   Negative questions (1,3,5,7,9): score = 5 - answer
//   Then multiply the sum by 2.5 to get a 0-100 scale

describe('calculateSUS', () => {
  it('returns 100 for a perfect-positive response set', () => {
    // Perfect score: all positive questions get 5, all negative questions get 1
    const responses = [5, 1, 5, 1, 5, 1, 5, 1, 5, 1];
    expect(calculateSUS(responses)).toBe(100);
  });

  it('returns 0 for a worst-case response set', () => {
    // Worst score: all positive questions get 1, all negative questions get 5
    const responses = [1, 5, 1, 5, 1, 5, 1, 5, 1, 5];
    expect(calculateSUS(responses)).toBe(0);
  });

  it('returns 50 for a fully neutral midpoint set', () => {
    // Middle score: all questions answered with 3 (neutral)
    const responses = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
    expect(calculateSUS(responses)).toBe(50);
  });

  it('calculates a known mixed response correctly (87.5)', () => {
    // A good but not perfect score: mostly agree (4) on positive, disagree (1) on negative
    const responses = [4, 1, 4, 1, 4, 1, 4, 1, 4, 1];
    expect(calculateSUS(responses)).toBe(87.5);
  });

  it('throws if fewer than 10 responses are provided', () => {
    // SUS requires exactly 10 questions, so reject incomplete surveys
    expect(() => calculateSUS([5, 5, 5])).toThrow('SUS requires exactly 10 responses');
  });

  it('throws if more than 10 responses are provided', () => {
    // SUS requires exactly 10 questions, so reject extra responses
    expect(() => calculateSUS([1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 5])).toThrow(
      'SUS requires exactly 10 responses'
    );
  });
});
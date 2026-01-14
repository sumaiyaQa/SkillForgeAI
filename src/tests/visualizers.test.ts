import { describe, it, expect } from 'vitest';
import { generateFactorialSteps } from '../components/FactorialVisualizer';
import { generateBubbleSortSteps } from '../components/BubbleSortVisualizer';
import { generateBinarySearchSteps } from '../components/BinarySearchVisualizer';

describe('Factorial visualizer', () => {
  it('computes correct factorial result in final step', () => {
    const steps = generateFactorialSteps(5);
    const last = steps[steps.length - 1];
    expect(last.product).toBe(120);
  });

  it('handles 0! correctly', () => {
    const steps = generateFactorialSteps(0);
    const last = steps[steps.length - 1];
    expect(last.product).toBe(1);
  });
});

describe('Bubble sort visualizer', () => {
  it('sorts the array in ascending order in final step', () => {
    const steps = generateBubbleSortSteps([64, 34, 25, 12, 22]);
    const last = steps[steps.length - 1];
    expect(last.array).toEqual([12, 22, 25, 34, 64]);
  });
});

describe('Binary search visualizer', () => {
  it('finds an existing target', () => {
    const steps = generateBinarySearchSteps([1, 3, 5, 7, 9], 5);
    const foundStep = steps.find((s) => s.description.includes('Found target'));
    expect(foundStep).toBeDefined();
  });

  it('reports when target is not present', () => {
    const steps = generateBinarySearchSteps([1, 3, 5, 7, 9], 10);
    const last = steps[steps.length - 1];
    expect(last.description).toContain('not in the array');
  });
});
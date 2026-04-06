import { describe, it, expect } from 'vitest';
import { generateFactorialSteps } from '../components/student/visualizers/FactorialVisualizer';
import { generateBubbleSortSteps } from '../components/student/visualizers/BubbleSortVisualizer';
import { generateBinarySearchSteps } from '../components/student/visualizers/BinarySearchVisualizer';

// Test the factorial visualizer to make sure it shows the correct computation steps
describe('Factorial visualizer', () => {
  // Make sure 5! = 120
  it('computes correct factorial result in final step', () => {
    const steps = generateFactorialSteps(5);
    const last = steps[steps.length - 1];
    expect(last.product).toBe(120);
  });

  // Edge case: 0! should equal 1
  it('handles 0! correctly', () => {
    const steps = generateFactorialSteps(0);
    const last = steps[steps.length - 1];
    expect(last.product).toBe(1);
  });
});

// Test the bubble sort visualizer to ensure it actually sorts the array correctly
describe('Bubble sort visualizer', () => {
  // After all steps, the array should be in ascending order
  it('sorts the array in ascending order in final step', () => {
    const steps = generateBubbleSortSteps([64, 34, 25, 12, 22]);
    const last = steps[steps.length - 1];
    expect(last.array).toEqual([12, 22, 25, 34, 64]);
  });
});

// Test the binary search visualizer to ensure it finds and reports results correctly
describe('Binary search visualizer', () => {
  // When searching for a value that exists in the array
  it('finds an existing target', () => {
    const steps = generateBinarySearchSteps([1, 3, 5, 7, 9], 5);
    const foundStep = steps.find((s) => s.description.includes('Found target'));
    expect(foundStep).toBeDefined();
  });

  // When searching for a value that doesn't exist
  it('reports when target is not present', () => {
    const steps = generateBinarySearchSteps([1, 3, 5, 7, 9], 10);
    const last = steps[steps.length - 1];
    expect(last.description).toContain('not in the array');
  });
});
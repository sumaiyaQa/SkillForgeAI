import { describe, it, expect } from 'vitest';
import { selectAdaptiveHint } from '../models/Hint';
import type { Hint, AdaptiveContext } from '../models/Hint';

const loopHints: Hint[] = [
  { id: 'l-1', concept: 'loops', level: 'remember',  scaffolding: 1, content: 'A loop repeats a block of code.' },
  { id: 'l-2', concept: 'loops', level: 'understand', scaffolding: 2, content: 'Use a for-loop to iterate over a range.' },
  { id: 'l-3', concept: 'loops', level: 'apply',     scaffolding: 3, content: 'Write: for i in range(n): to loop n times.' },
  { id: 'l-4', concept: 'loops', level: 'analyze',   scaffolding: 4, content: 'Consider time complexity when nesting loops.' },
];

const multiConceptHints: Hint[] = [
  { id: 'm-1', concept: 'loops',   level: 'remember',  scaffolding: 1, content: 'Loops repeat code.' },
  { id: 'm-2', concept: 'strings', level: 'understand', scaffolding: 2, content: 'Strings are sequences of characters.' },
];

describe('selectAdaptiveHint', () => {
  it('returns null when problemHints is empty', () => {
    // If there are no hints to choose from, return nothing
    const context: AdaptiveContext = { conceptMastery: {}, errorHints: [], previousHintsUsed: 0 };
    expect(selectAdaptiveHint([], context)).toBeNull();
  });

  it('prioritises an AST error hint over any problem hint', () => {
    // If the code has a syntax error detected, show that first before other hints
    const context: AdaptiveContext = {
      conceptMastery: { loops: 0.9 },
      errorHints: ['You have an IndentationError on line 3.'],
      previousHintsUsed: 0,
    };
    const result = selectAdaptiveHint(loopHints, context);
    expect(result!.source).toBe('ast');
    expect(result!.content).toBe('You have an IndentationError on line 3.');
  });

  it('returns a "remember" level hint when mastery is very low (< 0.4)', () => {
    // If the student barely understands the concept, start with the basics
    const context: AdaptiveContext = {
      conceptMastery: { loops: 0.2 },
      errorHints: [],
      previousHintsUsed: 0,
    };
    const result = selectAdaptiveHint(loopHints, context);
    expect(result!.level).toBe('remember');
    expect(result!.source).toBe('problem');
  });

  it('returns an "apply" level hint when mastery is moderate (0.6–0.8)', () => {
    // When the student understands the basics but needs practice, give them application examples
    const context: AdaptiveContext = {
      conceptMastery: { loops: 0.7 },
      errorHints: [],
      previousHintsUsed: 0,
    };
    const result = selectAdaptiveHint(loopHints, context);
    expect(result!.level).toBe('apply');
  });

  it('returns an "analyze" level hint when mastery is high (>= 0.8)', () => {
    // When the student is nearly expert, challenge them to think deeper
    const context: AdaptiveContext = {
      conceptMastery: { loops: 0.85 },
      errorHints: [],
      previousHintsUsed: 0,
    };
    const result = selectAdaptiveHint(loopHints, context);
    expect(result!.level).toBe('analyze');
  });

  it('targets the weakest concept when multiple concepts are present', () => {
    // When a problem covers multiple concepts, focus on helping with the one they're worst at
    // Here: loops is 0.9 (strong), strings is 0.1 (weak) so pick from strings
    const context: AdaptiveContext = {
      conceptMastery: { loops: 0.9, strings: 0.1 },
      errorHints: [],
      previousHintsUsed: 0,
    };
    const result = selectAdaptiveHint(multiConceptHints, context);
    expect(result!.content).toBe('Strings are sequences of characters.');
  });

  it('defaults to mastery=0.5 (→ understand) for an unknown concept', () => {
    // If we don't know anything about their mastery yet, assume they need foundational learning
    const context: AdaptiveContext = { conceptMastery: {}, errorHints: [], previousHintsUsed: 0 };
    const result = selectAdaptiveHint(loopHints, context);
    expect(result!.level).toBe('understand');
  });
});